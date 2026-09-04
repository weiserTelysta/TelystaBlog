import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const rootDirectory = process.cwd();
const cachePath = path.join(rootDirectory, '.tmp/cdn-image-manifest.json');
const generatorVersion = 'cdn-display-v2-high-fidelity';
const sourceExtensions = new Set(['.png', '.jpg', '.jpeg']);
const profiles = {
	display: [{
		suffix: '.webp',
		maxWidth: 3200,
		maxHeight: 3200,
		fit: 'inside',
		withoutEnlargement: true,
		quality: 95,
		alphaQuality: 100,
		effort: 6,
		smartSubsample: true,
		smartDeblock: true,
		preset: 'picture',
	}],
	character: [
		{
			suffix: '.cover.webp',
			maxWidth: 1200,
			maxHeight: 1600,
			fit: 'inside',
			withoutEnlargement: true,
			quality: 94,
			alphaQuality: 100,
			effort: 6,
			smartSubsample: true,
			smartDeblock: true,
			preset: 'drawing',
		},
		{
			suffix: '.preview.webp',
			maxWidth: 3200,
			maxHeight: 3200,
			fit: 'inside',
			withoutEnlargement: true,
			quality: 96,
			alphaQuality: 100,
			effort: 6,
			smartSubsample: true,
			smartDeblock: true,
			preset: 'drawing',
		},
	],
	avatar: [{
		suffix: '.avatar.webp',
		maxWidth: 384,
		maxHeight: 384,
		fit: 'cover',
		withoutEnlargement: false,
		quality: 95,
		alphaQuality: 100,
		effort: 6,
		smartSubsample: true,
		smartDeblock: true,
		preset: 'picture',
	}],
};

const options = parseArguments(process.argv.slice(2));
const variants = profiles[options.profile];
const sourceDirectory = path.resolve(options.source ?? process.env.TELYSTA_ASSET_SOURCE ?? '');

if (!options.source && !process.env.TELYSTA_ASSET_SOURCE) {
	throw new Error('缺少 CDN 素材目录。请使用 --source <目录> 或设置 TELYSTA_ASSET_SOURCE。');
}

const sourceStat = await fs.stat(sourceDirectory).catch(() => undefined);
if (!sourceStat?.isDirectory()) {
	throw new Error(`CDN 素材目录不存在：${sourceDirectory}`);
}

const manifest = await loadManifest();
const sourceFiles = await listSourceFiles(sourceDirectory);
let generatedCount = 0;
let adoptedCount = 0;
let skippedCount = 0;

for (const sourceFile of sourceFiles) {
	for (const variant of variants) {
		const targetFile = replaceExtension(sourceFile, variant.suffix);
		const sourceKey = toSourceRelativePath(sourceFile);
		const key = `${options.profile}:${sourceKey}:${variant.suffix}`;
		const sourceFingerprint = await fingerprint(sourceFile);
		const targetFingerprint = await fingerprint(targetFile).catch(() => undefined);
		const entry = manifest.entries[key];

		if (!options.force && targetFingerprint && !entry) {
			manifest.entries[key] = createEntry(sourceFile, targetFile, sourceFingerprint, targetFingerprint, variant, true);
			adoptedCount += 1;
			continue;
		}

		if (
			!options.force &&
			targetFingerprint &&
			entryIsCurrent(entry, sourceFile, targetFile, sourceFingerprint, targetFingerprint, variant)
		) {
			skippedCount += 1;
			continue;
		}

		await sharp(sourceFile, { failOn: 'none' })
			.rotate()
			.resize({
				width: variant.maxWidth,
				height: variant.maxHeight,
				fit: variant.fit,
				withoutEnlargement: variant.withoutEnlargement,
			})
			.webp({
				quality: variant.quality,
				alphaQuality: variant.alphaQuality,
				effort: variant.effort,
				smartSubsample: variant.smartSubsample,
				smartDeblock: variant.smartDeblock,
				preset: variant.preset,
			})
			.toFile(targetFile);

		const nextTargetFingerprint = await fingerprint(targetFile);
		manifest.entries[key] = createEntry(
			sourceFile,
			targetFile,
			sourceFingerprint,
			nextTargetFingerprint,
			variant,
			false,
		);
		generatedCount += 1;
	}
}

manifest.generatorVersion = generatorVersion;
manifest.profiles = { ...(manifest.profiles ?? {}), [options.profile]: variants };
manifest.sourceDirectory = sourceDirectory;
manifest.updatedAt = new Date().toISOString();
await fs.mkdir(path.dirname(cachePath), { recursive: true });
await fs.writeFile(cachePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

process.stdout.write(
	`CDN 展示图准备完成：生成 ${generatedCount} 个，接管现有 ${adoptedCount} 个，跳过 ${skippedCount} 个。\n`,
);

function parseArguments(argv) {
	const parsed = { force: false, profile: 'display' };

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];

		if (argument === '--force') {
			parsed.force = true;
			continue;
		}

		if (argument === '--profile') {
			const value = argv[index + 1];
			if (!value || !Object.hasOwn(profiles, value)) {
				throw new Error(`参数 --profile 必须是：${Object.keys(profiles).join('、')}`);
			}
			parsed.profile = value;
			index += 1;
			continue;
		}

		if (argument !== '--source') {
			throw new Error(`未知参数：${argument}`);
		}

		const value = argv[index + 1];
		if (!value || value.startsWith('--')) {
			throw new Error('参数 --source 缺少值。');
		}

		parsed.source = value;
		index += 1;
	}

	return parsed;
}

async function loadManifest() {
	try {
		const parsed = JSON.parse(await fs.readFile(cachePath, 'utf8'));
		if (parsed?.entries && typeof parsed.entries === 'object') {
			return parsed;
		}
	} catch (error) {
		if (error?.code !== 'ENOENT') {
			process.stderr.write('CDN 图片缓存无效，将重新建立。\n');
		}
	}

	return { entries: {} };
}

async function listSourceFiles(directory) {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const absolutePath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...await listSourceFiles(absolutePath));
		} else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name).toLowerCase())) {
			files.push(absolutePath);
		}
	}

	return files.sort((current, next) => current.localeCompare(next));
}

async function fingerprint(filePath) {
	const [buffer, stat] = await Promise.all([fs.readFile(filePath), fs.stat(filePath)]);
	return {
		hash: crypto.createHash('sha256').update(buffer).digest('hex'),
		size: stat.size,
	};
}

function entryIsCurrent(entry, sourceFile, targetFile, sourceFingerprint, targetFingerprint, variant) {
	return Boolean(
		entry &&
		entry.generatorVersion === generatorVersion &&
		entry.sourcePath === toSourceRelativePath(sourceFile) &&
		entry.targetPath === toSourceRelativePath(targetFile) &&
		entry.sourceHash === sourceFingerprint.hash &&
		entry.sourceSize === sourceFingerprint.size &&
		entry.targetHash === targetFingerprint.hash &&
		entry.targetSize === targetFingerprint.size &&
		JSON.stringify(entry.variant) === JSON.stringify(variant),
	);
}

function createEntry(sourceFile, targetFile, sourceFingerprint, targetFingerprint, variant, adopted) {
	return {
		sourcePath: toSourceRelativePath(sourceFile),
		targetPath: toSourceRelativePath(targetFile),
		sourceHash: sourceFingerprint.hash,
		sourceSize: sourceFingerprint.size,
		targetHash: targetFingerprint.hash,
		targetSize: targetFingerprint.size,
		variant,
		generatorVersion,
		adopted,
		updatedAt: new Date().toISOString(),
	};
}

function replaceExtension(filePath, extension) {
	return filePath.slice(0, -path.extname(filePath).length) + extension;
}

function toSourceRelativePath(filePath) {
	return path.relative(sourceDirectory, filePath).split(path.sep).join('/');
}
