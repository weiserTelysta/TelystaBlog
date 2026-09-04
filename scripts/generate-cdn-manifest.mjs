import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const DEFAULT_ORIGIN = 'https://assets.telysta.com/';
const DEFAULT_OUTPUT = 'src/generated/cdn-assets.json';
const DEFAULT_PRIMARY_PATH_PREFIX = 'telysta-images';
const ORIGINAL_EXTENSIONS = ['.png', '.jpg', '.jpeg'];
const SOURCE_EXTENSIONS = ['.psd', '.ai'];
const SUPPORTED_EXTENSIONS = new Set(['.webp', ...ORIGINAL_EXTENSIONS, ...SOURCE_EXTENSIONS]);

const options = parseArguments(process.argv.slice(2));
const primarySource = options.source ?? process.env.TELYSTA_ASSET_SOURCE;
const outputPath = path.resolve(options.output ?? DEFAULT_OUTPUT);
const origin = normalizeOrigin(options.origin ?? DEFAULT_ORIGIN);

if (!primarySource) {
	throw new Error('缺少 CDN 素材目录。请使用 --source <目录> 或设置 TELYSTA_ASSET_SOURCE。');
}

const collections = [
	{
		sourceDirectory: path.resolve(primarySource),
		pathPrefix: normalizePrefix(options.pathPrefix ?? DEFAULT_PRIMARY_PATH_PREFIX),
		keyPrefix: '',
	},
	...options.collections.map(({ prefix, source }) => ({
		sourceDirectory: path.resolve(source),
		pathPrefix: normalizePrefix(prefix),
		keyPrefix: normalizePrefix(prefix),
	})),
];
const assets = {};
const ignoredFiles = [];

for (const collection of collections) {
	const sourceStat = await fs.stat(collection.sourceDirectory).catch(() => undefined);
	if (!sourceStat?.isDirectory()) {
		throw new Error(`CDN 素材目录不存在：${collection.sourceDirectory}`);
	}

	const files = await listFiles(collection.sourceDirectory);
	const supportedFiles = files
		.filter((file) => SUPPORTED_EXTENSIONS.has(file.extension))
		.map((file) => classifyFile(file, collection));
	ignoredFiles.push(
		...files
			.filter((file) => !SUPPORTED_EXTENSIONS.has(file.extension))
			.map((file) => joinPath(collection.pathPrefix, file.relativePath)),
	);

	for (const [assetKey, group] of groupByAssetKey(supportedFiles)) {
		if (assets[assetKey]) {
			throw new Error(`CDN 清单键重复：${assetKey}`);
		}

		const coverFile = group.find((file) => file.role === 'cover');
		const displayFile = group.find((file) => file.role === 'display');
		const originalFile = ORIGINAL_EXTENSIONS
			.map((extension) => group.find((file) => file.role === 'original' && file.extension === extension))
			.find(Boolean);
		const sourceFiles = group.filter((file) => file.role === 'source');
		const cover = coverFile ? await toDisplayManifestFile(coverFile) : undefined;
		const display = displayFile ? await toDisplayManifestFile(displayFile) : cover;

		assets[assetKey] = {
			...(cover ? { cover } : {}),
			...(display ? { display } : {}),
			...(originalFile ? { original: toManifestFile(originalFile) } : {}),
			sources: sourceFiles.map(toManifestFile),
		};
	}
}

const sortedAssets = Object.fromEntries(
	Object.entries(assets).sort(([current], [next]) => current.localeCompare(next)),
);
const manifest = {
	version: 2,
	origin,
	assets: sortedAssets,
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (options.check) {
	const current = await fs.readFile(outputPath, 'utf8').catch(() => '');
	if (current !== serialized) {
		throw new Error(`CDN 清单不是最新状态：${path.relative(process.cwd(), outputPath)}`);
	}
} else {
	await fs.mkdir(path.dirname(outputPath), { recursive: true });
	await fs.writeFile(outputPath, serialized, 'utf8');
}

const coverCount = Object.values(sortedAssets).filter((asset) => asset.cover).length;
const displayCount = Object.values(sortedAssets).filter((asset) => asset.display).length;
const originalCount = Object.values(sortedAssets).filter((asset) => asset.original).length;
const sourceCount = Object.values(sortedAssets).reduce(
	(total, asset) => total + asset.sources.length,
	0,
);

process.stdout.write(
	`CDN 清单${options.check ? '检查' : '生成'}完成：${Object.keys(sortedAssets).length} 组，` +
		`${coverCount} 个封面图，${displayCount} 个展示图，${originalCount} 个原图，` +
		`${sourceCount} 个源文件。\n`,
);

if (ignoredFiles.length > 0) {
	process.stdout.write(
		`已忽略 ${ignoredFiles.length} 个不受支持的文件：${ignoredFiles.join(', ')}\n`,
	);
}

function parseArguments(argv) {
	const parsed = { check: false, collections: [] };

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];

		if (argument === '--check') {
			parsed.check = true;
			continue;
		}

		if (!['--source', '--output', '--origin', '--path-prefix', '--collection'].includes(argument)) {
			throw new Error(`未知参数：${argument}`);
		}

		const value = argv[index + 1];
		if (!value || value.startsWith('--')) {
			throw new Error(`参数 ${argument} 缺少值。`);
		}

		if (argument === '--collection') {
			const separatorIndex = value.indexOf('=');
			if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
				throw new Error('--collection 必须使用 <R2 前缀>=<本地目录> 格式。');
			}

			parsed.collections.push({
				prefix: value.slice(0, separatorIndex),
				source: value.slice(separatorIndex + 1),
			});
		} else {
			const optionName = argument
				.slice(2)
				.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
			parsed[optionName] = value;
		}

		index += 1;
	}

	return parsed;
}

async function listFiles(directory, rootDirectory = directory) {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const absolutePath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...await listFiles(absolutePath, rootDirectory));
			continue;
		}

		if (!entry.isFile()) {
			continue;
		}

		const stat = await fs.stat(absolutePath);
		const relativePath = path.relative(rootDirectory, absolutePath).split(path.sep).join('/');
		files.push({
			absolutePath,
			relativePath,
			extension: path.extname(entry.name).toLocaleLowerCase('en-US'),
			bytes: stat.size,
		});
	}

	return files.sort((current, next) => current.relativePath.localeCompare(next.relativePath));
}

function classifyFile(file, collection) {
	const lowerPath = file.relativePath.toLocaleLowerCase('en-US');
	const variantSuffixes = [
		{ suffix: '.cover.webp', role: 'cover' },
		{ suffix: '.preview.webp', role: 'display' },
		{ suffix: '.avatar.webp', role: 'display' },
	];
	const variant = variantSuffixes.find(({ suffix }) => lowerPath.endsWith(suffix));
	let logicalPath;
	let role;

	if (variant) {
		logicalPath = file.relativePath.slice(0, -variant.suffix.length);
		role = variant.role;
	} else {
		logicalPath = file.relativePath.slice(0, -file.extension.length);
		role = file.extension === '.webp'
			? 'display'
			: ORIGINAL_EXTENSIONS.includes(file.extension)
				? 'original'
				: 'source';
	}

	return {
		...file,
		assetKey: joinPath(collection.keyPrefix, logicalPath),
		manifestPath: joinPath(collection.pathPrefix, file.relativePath),
		role,
	};
}

function groupByAssetKey(files) {
	const groups = new Map();

	for (const file of files) {
		const group = groups.get(file.assetKey) ?? [];
		group.push(file);
		groups.set(file.assetKey, group);
	}

	return [...groups.entries()].sort(([current], [next]) => current.localeCompare(next));
}

async function toDisplayManifestFile(file) {
	const metadata = await sharp(file.absolutePath, { failOn: 'none' }).metadata();

	if (!metadata.width || !metadata.height) {
		throw new Error(`无法读取 CDN 展示图尺寸：${file.manifestPath}`);
	}

	return {
		...toManifestFile(file),
		width: metadata.width,
		height: metadata.height,
	};
}

function toManifestFile(file) {
	return {
		path: file.manifestPath,
		bytes: file.bytes,
		format: file.extension.slice(1).toLocaleUpperCase('en-US'),
	};
}

function normalizeOrigin(value) {
	const url = new URL(value);
	if (url.protocol !== 'https:') {
		throw new Error('CDN origin 必须使用 HTTPS。');
	}

	return `${url.toString().replace(/\/+$/, '')}/`;
}

function normalizePrefix(value) {
	const normalized = value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
	if (!normalized || normalized.split('/').some((segment) => segment === '.' || segment === '..')) {
		throw new Error(`无效的 R2 前缀：${value}`);
	}

	return normalized;
}

function joinPath(...segments) {
	return segments.filter(Boolean).join('/').replace(/\/{2,}/g, '/');
}
