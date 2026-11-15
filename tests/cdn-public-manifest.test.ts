import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';

test('清单生成只收录图片，嵌套 UI 集合不会重复进入插画前缀', async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'telysta-cdn-policy-'));
	try {
		const source = path.join(root, 'images');
		const avatars = path.join(source, 'TelystaAssets', 'avatars');
		await fs.mkdir(avatars, { recursive: true });
		const png = await sharp({ create: { width: 4, height: 6, channels: 3, background: '#d8dee9' } }).png().toBuffer();
		await fs.writeFile(path.join(source, 'drawing.PNG'), png);
		await sharp(png).webp().toFile(path.join(source, 'drawing.webp'));
		await fs.writeFile(path.join(source, 'drawing.PSD'), 'private layered document');
		await fs.writeFile(path.join(source, 'drawing.ai'), 'private vector document');
		await fs.writeFile(path.join(source, 'secret.txt'), 'not an image');
		await fs.writeFile(path.join(avatars, 'face.png'), png);
		const output = path.join(root, 'manifest.json');
		execFileSync(process.execPath, [path.resolve('scripts/generate-cdn-manifest.mjs'), '--source', source,
			'--collection', `avatars=${avatars}`, '--without-covers', '--output', output], { cwd: root });
		const manifest = JSON.parse(await fs.readFile(output, 'utf8'));
		assert.deepEqual(Object.keys(manifest.assets).sort(), ['avatars/face', 'drawing']);
		assert.equal(manifest.assets.drawing.original.path, 'telysta-images/drawing.PNG');
		assert.equal(manifest.assets.drawing.display.width, 4);
		assert.equal(manifest.assets['avatars/face'].original.path, 'avatars/face.png');
		assert.doesNotMatch(JSON.stringify(manifest), /\.psd|\.ai|secret|TelystaAssets/i);
		assert.deepEqual(manifest.assets.drawing.sources, []);
	} finally {
		const resolved = path.resolve(root);
		if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep + 'telysta-cdn-policy-')) throw new Error('Unsafe test cleanup path');
		await fs.rm(resolved, { recursive: true, force: true });
	}
});

test('重建 CDN 清单保留按文章登记的配图尺寸，不公开本地原稿名或哈希', async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'telysta-article-assets-'));
	try {
		const source = path.join(root, 'images');
		const inventories = path.join(root, 'data/blog-assets');
		await fs.mkdir(source, { recursive: true });
		await fs.mkdir(inventories, { recursive: true });
		const id = 'WEISER123456abcdef';
		await fs.writeFile(path.join(inventories, `${id}.json`), JSON.stringify({
			version: 1, postId: id, bucket: 'telysta-blog-assets', prefix: `blog_imgs/${id}`,
			files: [{ original: 'secret-local-reference.png', name: 'emblem-white.svg',
				bytes: 512, width: 400, height: 400, sha256: 'a'.repeat(64) }],
		}));
		const output = path.join(root, 'manifest.json');
		const args = [path.resolve('scripts/generate-cdn-manifest.mjs'), '--source', source,
			'--without-covers', '--output', output];
		execFileSync(process.execPath, args, { cwd: root });
		execFileSync(process.execPath, [...args, '--check'], { cwd: root });
		const manifest = JSON.parse(await fs.readFile(output, 'utf8'));
		assert.deepEqual(manifest.assets[`blog_imgs/${id}/emblem-white`], {
			display: { path: `blog_imgs/${id}/emblem-white.svg`, bytes: 512, format: 'SVG', width: 400, height: 400 },
			sources: [],
		});
		assert.doesNotMatch(JSON.stringify(manifest), /secret-local|sha256|original/);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});
