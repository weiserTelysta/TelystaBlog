import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, '.tmp/resource-images-manifest.json');
const generatorVersion = 'generated-images-v1';
const sourceExtensions = new Set(['.png', '.jpg', '.jpeg']);
const generatedSuffixes = ['.cover.webp', '.preview.webp', '.avatar.webp'];

const resourceVariants = [
	{
		suffix: '.cover.webp',
		maxWidth: 1200,
		maxHeight: 1600,
		fit: 'inside',
		withoutEnlargement: true,
		quality: 84,
		alphaQuality: 95,
	},
	{
		suffix: '.preview.webp',
		maxWidth: 3200,
		maxHeight: 3200,
		fit: 'inside',
		withoutEnlargement: true,
		quality: 92,
		alphaQuality: 98,
	},
];

const imageGroups = [
	{
		sourceDirs: [
			'src/assets/images/resources',
			'src/assets/images/illustration',
		],
		variants: resourceVariants,
	},
	{
		sourceDirs: ['src/assets/images/logo'],
		variants: [
			{
				suffix: '.avatar.webp',
				maxWidth: 384,
				maxHeight: 384,
				fit: 'cover',
				quality: 90,
				alphaQuality: 98,
			},
		],
	},
];

const errors = [];
const fileFingerprintCache = new Map();
let generatedCount = 0;
let skippedCount = 0;
const manifest = await loadManifest();

for (const imageGroup of imageGroups) {
	for (const sourceDir of imageGroup.sourceDirs) {
		const absoluteDir = path.join(rootDir, sourceDir);

		if (!(await pathExists(absoluteDir))) {
			continue;
		}

		const sourceFiles = await findSourceImages(absoluteDir);

		for (const sourceFile of sourceFiles) {
			for (const variant of imageGroup.variants) {
				await generateVariant(sourceFile, variant);
			}
		}
	}
}

if (errors.length > 0) {
	console.error('[assets:images] Failed to generate one or more derived image asset:');

	for (const error of errors) {
		console.error(`- ${path.relative(rootDir, error.source)} -> ${path.relative(rootDir, error.target)}`);
		console.error(`  ${error.message}`);
	}

	process.exit(1);
}

await saveManifest(manifest);

console.log(
	`[assets:images] Generated ${generatedCount} image(s), skipped ${skippedCount} up-to-date image(s).`,
);

async function loadManifest() {
	try {
		const rawManifest = await fs.readFile(manifestPath, 'utf8');
		const parsedManifest = JSON.parse(rawManifest);

		if (
			parsedManifest &&
			typeof parsedManifest === 'object' &&
			parsedManifest.entries &&
			typeof parsedManifest.entries === 'object'
		) {
			return parsedManifest;
		}
	} catch (error) {
		if (error?.code !== 'ENOENT') {
			console.warn('[assets:images] Ignoring invalid image manifest; assets will be regenerated as needed.');
		}
	}

	return {
		generatorVersion,
		updatedAt: null,
		entries: {},
	};
}

async function saveManifest(currentManifest) {
	currentManifest.generatorVersion = generatorVersion;
	currentManifest.updatedAt = new Date().toISOString();

	await fs.mkdir(path.dirname(manifestPath), { recursive: true });
	await fs.writeFile(`${manifestPath}.tmp`, `${JSON.stringify(currentManifest, null, 2)}\n`, 'utf8');
	await fs.rename(`${manifestPath}.tmp`, manifestPath);
}

async function findSourceImages(directory) {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const absolutePath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...await findSourceImages(absolutePath));
			continue;
		}

		if (!entry.isFile() || isGeneratedImage(entry.name)) {
			continue;
		}

		if (sourceExtensions.has(path.extname(entry.name).toLowerCase())) {
			files.push(absolutePath);
		}
	}

	return files;
}

async function generateVariant(sourceFile, variant) {
	const targetFile = getTargetPath(sourceFile, variant.suffix);

	try {
		const sourceFingerprint = await getSourceFingerprint(sourceFile);

		if (await isTargetCurrent(sourceFile, targetFile, variant, manifest)) {
			skippedCount += 1;
			return;
		}

		await sharp(sourceFile, { failOn: 'none' })
			.rotate()
			.resize({
				width: variant.maxWidth,
				height: variant.maxHeight,
				fit: variant.fit,
				withoutEnlargement: variant.withoutEnlargement ?? false,
			})
			.webp({
				quality: variant.quality,
				alphaQuality: variant.alphaQuality,
				effort: 5,
			})
			.toFile(targetFile);

		fileFingerprintCache.delete(targetFile);
		const targetFingerprint = await getTargetFingerprint(targetFile);
		updateManifestEntry(sourceFile, targetFile, variant, sourceFingerprint, targetFingerprint, manifest);
		generatedCount += 1;
	} catch (error) {
		errors.push({
			source: sourceFile,
			target: targetFile,
			message: error instanceof Error ? error.message : String(error),
		});
	}
}

function getTargetPath(sourceFile, suffix) {
	const extension = path.extname(sourceFile);
	return sourceFile.slice(0, -extension.length) + suffix;
}

async function getSourceFingerprint(sourceFile) {
	return getFileFingerprint(sourceFile);
}

async function getTargetFingerprint(targetFile) {
	return getFileFingerprint(targetFile);
}

async function getFileFingerprint(filePath) {
	const cachedFingerprint = fileFingerprintCache.get(filePath);

	if (cachedFingerprint) {
		return cachedFingerprint;
	}

	const [fileBuffer, fileStat] = await Promise.all([
		fs.readFile(filePath),
		fs.stat(filePath),
	]);
	const fingerprint = {
		hash: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
		size: fileStat.size,
	};

	fileFingerprintCache.set(filePath, fingerprint);
	return fingerprint;
}

function createManifestKey(sourceFile, targetFile, variant) {
	return [
		toRelativePath(sourceFile),
		toRelativePath(targetFile),
		variant.suffix,
	].join('::');
}

function getVariantSignature(variant) {
	return {
		suffix: variant.suffix,
		maxWidth: variant.maxWidth,
		maxHeight: variant.maxHeight,
		fit: variant.fit,
		withoutEnlargement: variant.withoutEnlargement ?? false,
		quality: variant.quality,
		alphaQuality: variant.alphaQuality,
		effort: 5,
		format: 'webp',
	};
}

async function isTargetCurrent(sourceFile, targetFile, variant, currentManifest) {
	try {
		await fs.access(targetFile);

		const sourceFingerprint = await getSourceFingerprint(sourceFile);
		const targetFingerprint = await getTargetFingerprint(targetFile);
		const manifestKey = createManifestKey(sourceFile, targetFile, variant);
		const entry = currentManifest.entries[manifestKey];

		if (!entry) {
			return false;
		}

		return (
			entry.generatorVersion === generatorVersion &&
			entry.sourcePath === toRelativePath(sourceFile) &&
			entry.targetPath === toRelativePath(targetFile) &&
			entry.sourceHash === sourceFingerprint.hash &&
			entry.sourceSize === sourceFingerprint.size &&
			entry.targetHash === targetFingerprint.hash &&
			entry.targetSize === targetFingerprint.size &&
			entry.variantSuffix === variant.suffix &&
			JSON.stringify(entry.variantConfig) === JSON.stringify(getVariantSignature(variant))
		);
	} catch {
		return false;
	}
}

function updateManifestEntry(sourceFile, targetFile, variant, sourceFingerprint, targetFingerprint, currentManifest) {
	const manifestKey = createManifestKey(sourceFile, targetFile, variant);

	currentManifest.entries[manifestKey] = {
		sourcePath: toRelativePath(sourceFile),
		targetPath: toRelativePath(targetFile),
		sourceHash: sourceFingerprint.hash,
		sourceSize: sourceFingerprint.size,
		targetHash: targetFingerprint.hash,
		targetSize: targetFingerprint.size,
		variantSuffix: variant.suffix,
		variantConfig: getVariantSignature(variant),
		generatorVersion,
		generatedAt: new Date().toISOString(),
	};
}

function isGeneratedImage(fileName) {
	return generatedSuffixes.some((suffix) => fileName.endsWith(suffix));
}

function toRelativePath(absolutePath) {
	return path.relative(rootDir, absolutePath).replace(/\\/g, '/');
}

async function pathExists(absolutePath) {
	try {
		await fs.access(absolutePath);
		return true;
	} catch {
		return false;
	}
}
