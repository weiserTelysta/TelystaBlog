import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { parse } from 'yaml';
import { isPublicIllustration } from '../src/lib/resources/resourceDisplayPolicy';
import { coverIndexPath, sha256, mergeCovers } from './lib/cdn-covers.mjs';

const { values } = parseArgs({ options: { source: { type: 'string' }, publish: { type: 'boolean' } } });
const manifestPath = 'src/generated/cdn-assets.json';
const staging = '.tmp/cdn-covers';
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const sourceRoot = values.source ?? process.env.TELYSTA_ASSET_SOURCE;
const encodePath = (value: string) => value.split('/').map(encodeURIComponent).join('/');

if (values.publish) {
	const plan = JSON.parse(await fs.readFile(`${staging}/plan.json`, 'utf8'));
	if (manifest.origin !== plan.origin) throw new Error('CDN origin changed; prepare again');
	// Verify public bytes before committing references: no deployment with unuploaded covers.
	await mergeCovers(manifest.assets, plan.index);
	for (const entry of Object.values(plan.index.assets) as any[]) {
		const response = await fetch(new URL(encodePath(entry.cover.path), manifest.origin), { signal: AbortSignal.timeout(30000) });
		if (!response.ok) throw new Error(`CDN returned ${response.status}: ${entry.cover.path}`);
		const bytes = Buffer.from(await response.arrayBuffer());
		if (sha256(bytes) !== entry.outputHash || bytes.length !== entry.cover.bytes) throw new Error(`CDN checksum mismatch: ${entry.cover.path}`);
		console.log(`Verified ${entry.cover.path}: ${response.headers.get('cache-control')}`);
	}
	await fs.writeFile(coverIndexPath, `${JSON.stringify(plan.index, null, 2)}\n`);
	await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	console.log('Published verified cover references; display/original/source files unchanged.');
} else {
	if (!sourceRoot) throw new Error('Use --source <TelystaImages directory>');
	const root = path.resolve(sourceRoot);
	const files = await fs.readdir('src/content/resources', { recursive: true });
	const keys = new Set<string>();
	for (const file of files.filter((file) => /\.mdx?$/.test(file))) {
		const text = await fs.readFile(path.join('src/content/resources', file), 'utf8');
		const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
		if (!frontmatter) throw new Error(`Missing frontmatter: ${file}`);
		const data = parse(frontmatter[1]);
		if (!isPublicIllustration(data)) continue;
		if (data.cover) throw new Error(`Explicit resource cover needs review: ${file}`);
		if (!data.image.startsWith('asset:')) throw new Error(`Unsupported image: ${file}`);
		keys.add(data.image.slice(6));
	}
	const index: { version: number; assets: Record<string, any> } = { version: 1, assets: {} };
	const uploads: string[] = [];
	let before = 0, after = 0, reused = 0;
	for (const key of [...keys].sort()) {
		const asset = manifest.assets[key];
		if (!asset?.display) throw new Error(`Missing display: ${key}`);
		if (asset.display.width <= 128 && asset.display.height <= 128) { reused++; continue; }
		const source = asset.original ?? asset.display;
		if (!source.path.startsWith('telysta-images/')) throw new Error(`Out-of-scope source: ${source.path}`);
		const filename = path.resolve(root, source.path.slice('telysta-images/'.length));
		if (!filename.startsWith(root + path.sep)) throw new Error('Source escaped directory');
		const input = await fs.readFile(filename);
		if (input.length !== source.bytes) throw new Error(`Source differs from manifest: ${key}; refresh main manifest first`);
		const { data, info } = await sharp(input).rotate()
			.resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true, smartDeblock: true, preset: 'picture' })
			.toBuffer({ resolveWithObject: true });
		const outputHash = sha256(data);
		const relative = `${key}.${outputHash}.webp`;
		const target = path.resolve(staging, 'files', relative);
		if (!target.startsWith(path.resolve(staging, 'files') + path.sep)) throw new Error('Cover escaped directory');
		await fs.mkdir(path.dirname(target), { recursive: true });
		await fs.writeFile(target, data);
		index.assets[key] = {
			source, sourceHash: sha256(input), outputHash,
			cover: { path: `covers/${relative}`, bytes: data.length, format: 'WEBP', width: info.width, height: info.height },
		};
		uploads.push(relative);
		before += asset.display.bytes; after += data.length;
		console.log(`${key}: ${asset.display.bytes} -> ${data.length} bytes (${info.width}x${info.height})`);
	}
	await fs.mkdir(staging, { recursive: true });
	await fs.writeFile(`${staging}/plan.json`, `${JSON.stringify({ origin: manifest.origin, index }, null, 2)}\n`);
	await fs.writeFile(`${staging}/upload.txt`, `${uploads.join('\n')}\n`);
	console.log(JSON.stringify({ covers: uploads.length, reused, before, after, saving: 1 - after / before }));
	console.log('Prepared only. Upload files using upload.txt, then run assets:covers -- --publish.');
}
