import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const rootDir = process.cwd();
const sourceDirs = [
	'src/assets/images/resources',
	'src/assets/images/illustration',
];
const sourceExtensions = new Set(['.png', '.jpg', '.jpeg']);
const generatedSuffixes = ['.cover.webp', '.preview.webp'];

const variants = [
	{
		suffix: '.cover.webp',
		maxWidth: 1200,
		maxHeight: 1600,
		quality: 84,
		alphaQuality: 95,
	},
	{
		suffix: '.preview.webp',
		maxWidth: 3200,
		maxHeight: 3200,
		quality: 92,
		alphaQuality: 98,
	},
];

const errors = [];
let generatedCount = 0;
let skippedCount = 0;

for (const sourceDir of sourceDirs) {
	const absoluteDir = path.join(rootDir, sourceDir);

	if (!(await pathExists(absoluteDir))) {
		continue;
	}

	const sourceFiles = await findSourceImages(absoluteDir);

	for (const sourceFile of sourceFiles) {
		for (const variant of variants) {
			await generateVariant(sourceFile, variant);
		}
	}
}

if (errors.length > 0) {
	console.error('[resources:images] Failed to generate one or more resource asset:');

	for (const error of errors) {
		console.error(`- ${path.relative(rootDir, error.source)} -> ${path.relative(rootDir, error.target)}`);
		console.error(`  ${error.message}`);
	}

	process.exit(1);
}

console.log(
	`[resources:images] Generated ${generatedCount} image(s), skipped ${skippedCount} up-to-date image(s).`,
);

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
		if (await isTargetCurrent(sourceFile, targetFile)) {
			skippedCount += 1;
			return;
		}

		await sharp(sourceFile, { failOn: 'none' })
			.rotate()
			.resize({
				width: variant.maxWidth,
				height: variant.maxHeight,
				fit: 'inside',
				withoutEnlargement: true,
			})
			.webp({
				quality: variant.quality,
				alphaQuality: variant.alphaQuality,
				effort: 5,
			})
			.toFile(targetFile);

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

async function isTargetCurrent(sourceFile, targetFile) {
	try {
		const [sourceStat, targetStat] = await Promise.all([
			fs.stat(sourceFile),
			fs.stat(targetFile),
		]);

		return targetStat.mtimeMs >= sourceStat.mtimeMs;
	} catch {
		return false;
	}
}

function isGeneratedImage(fileName) {
	return generatedSuffixes.some((suffix) => fileName.endsWith(suffix));
}

async function pathExists(absolutePath) {
	try {
		await fs.access(absolutePath);
		return true;
	} catch {
		return false;
	}
}
