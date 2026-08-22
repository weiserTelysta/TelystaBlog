import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { afterEach, test } from 'node:test';
import sharp from 'sharp';

const generatorPath = path.resolve('scripts/generate-resource-images.mjs');
const initialFixturePath = path.resolve('src/assets/images/illustration/characters/sky.png');
const changedFixturePath = path.resolve('src/assets/images/illustration/characters/star.png');
const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map((directory) =>
			fs.rm(directory, { recursive: true, force: true }),
		),
	);
});

test('仅在源图变化时生成高质量 WebP，并始终保留原图字节', async () => {
	const temporaryRoot = path.resolve('.tmp');
	await fs.mkdir(temporaryRoot, { recursive: true });
	const rootDir = await fs.mkdtemp(path.join(temporaryRoot, 'telysta-image-test-'));
	temporaryDirectories.push(rootDir);
	const imageDirectory = path.join(
		rootDir,
		'src',
		'assets',
		'images',
		'illustration',
		'example',
	);
	const sourcePath = path.join(imageDirectory, 'source.png');
	const coverPath = path.join(imageDirectory, 'source.cover.webp');
	const previewPath = path.join(imageDirectory, 'source.preview.webp');
	await fs.mkdir(imageDirectory, { recursive: true });
	await fs.copyFile(initialFixturePath, sourcePath);
	const initialSourceHash = await hashFile(sourcePath);

	const firstOutput = await runGenerator(rootDir);
	assert.match(firstOutput, /Generated 2 image\(s\), skipped 0 up-to-date image\(s\)/);
	assert.equal(await hashFile(sourcePath), initialSourceHash);

	const firstCoverHash = await hashFile(coverPath);
	const firstPreviewHash = await hashFile(previewPath);
	const [coverBuffer, previewBuffer] = await Promise.all([
		fs.readFile(coverPath),
		fs.readFile(previewPath),
	]);
	const [coverMetadata, previewMetadata] = await Promise.all([
		sharp(coverBuffer).metadata(),
		sharp(previewBuffer).metadata(),
	]);
	assert.equal(coverMetadata.format, 'webp');
	assert.equal(previewMetadata.format, 'webp');
	assert.ok((coverMetadata.width ?? 0) <= 1200);
	assert.ok((coverMetadata.height ?? 0) <= 1600);
	assert.ok((previewMetadata.width ?? 0) <= 3200);
	assert.ok((previewMetadata.height ?? 0) <= 3200);

	const secondOutput = await runGenerator(rootDir);
	assert.match(secondOutput, /Generated 0 image\(s\), skipped 2 up-to-date image\(s\)/);
	assert.equal(await hashFile(coverPath), firstCoverHash);
	assert.equal(await hashFile(previewPath), firstPreviewHash);

	await fs.copyFile(changedFixturePath, sourcePath);
	const changedSourceHash = await hashFile(sourcePath);
	assert.notEqual(changedSourceHash, initialSourceHash);

	const thirdOutput = await runGenerator(rootDir);
	assert.match(thirdOutput, /Generated 2 image\(s\), skipped 0 up-to-date image\(s\)/);
	assert.equal(await hashFile(sourcePath), changedSourceHash);
	assert.notEqual(await hashFile(coverPath), firstCoverHash);
	assert.notEqual(await hashFile(previewPath), firstPreviewHash);
});

async function runGenerator(rootDir: string): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(
			process.execPath,
			[generatorPath],
			{ cwd: rootDir, windowsHide: true },
			(error, stdout, stderr) => {
				if (error) {
					reject(new Error(`${error.message}\n${stderr}`));
					return;
				}

				resolve(stdout);
			},
		);
	});
}

async function hashFile(filePath: string): Promise<string> {
	const contents = await fs.readFile(filePath);
	return crypto.createHash('sha256').update(contents).digest('hex');
}
