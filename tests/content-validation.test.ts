import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { runContentValidation } from '../scripts/lib/content-validation';

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map((directory) =>
			fs.rm(directory, { recursive: true, force: true }),
		),
	);
});

test('发现重复资源 id 和缺失资源图片', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writeResource(rootDir, 'first.md', 'shared-id', 'src/assets/images/illustration/missing.png');
	await writeResource(rootDir, 'second.md', 'shared-id', 'src/assets/images/illustration/missing.png');
	const result = runContentValidation(rootDir);

	assert.ok(result.issues.some((issue) => issue.code === 'resource-id-duplicate'));
	assert.ok(result.issues.some((issue) => issue.code === 'local-path-missing'));
});

test('发现系列顺序重复、字段不成对和未知系列', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writePost(rootDir, 'one.md', {
		series: 'telysta-blog-build',
		seriesOrder: 1,
	});
	await writePost(rootDir, 'two.md', {
		series: 'telysta-blog-build',
		seriesOrder: 1,
	});
	await writePost(rootDir, 'three.md', { series: 'unknown-series' });
	const result = runContentValidation(rootDir);

	assert.ok(result.issues.some((issue) => issue.code === 'series-order-duplicate'));
	assert.ok(result.issues.some((issue) => issue.code === 'series-pair'));
	assert.ok(result.issues.some((issue) => issue.code === 'series-unknown'));
});

test('发现日期倒置和公开文章占位摘要', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writePost(rootDir, 'date.md', {
		description: '待补充文章摘要。',
		publishedAt: '2026-08-14',
		updatedAt: '2026-08-13',
		draft: false,
	});
	const result = runContentValidation(rootDir);

	assert.ok(result.issues.some((issue) => issue.code === 'updated-before-published'));
	assert.ok(
		result.issues.some((issue) => issue.code === 'published-placeholder-description'),
	);
});

test('发现文件名大小写错误，并接受大小写完全一致的路径', async () => {
	const rootDir = await createTemporaryContentRoot();
	const imageDirectory = path.join(rootDir, 'src', 'assets', 'images', 'illustration');
	await fs.mkdir(imageDirectory, { recursive: true });
	await fs.writeFile(path.join(imageDirectory, 'Exact.png'), 'image');
	await writeResource(rootDir, 'case.md', 'case-id', 'src/assets/images/illustration/exact.png');
	const invalidResult = runContentValidation(rootDir);
	assert.ok(invalidResult.issues.some((issue) => issue.code === 'local-path-case'));

	await writeResource(rootDir, 'case.md', 'case-id', 'src/assets/images/illustration/Exact.png');
	const validResult = runContentValidation(rootDir);
	assert.equal(validResult.issues.some((issue) => issue.code.startsWith('local-path')), false);
});

test('发现目录名大小写错误', async () => {
	const rootDir = await createTemporaryContentRoot();
	const imageDirectory = path.join(rootDir, 'src', 'assets', 'images', 'illustration');
	await fs.mkdir(imageDirectory, { recursive: true });
	await fs.writeFile(path.join(imageDirectory, 'Exact.png'), 'image');
	await writePost(rootDir, 'directory-case.md', {
		cover: 'src/assets/images/Illustration/Exact.png',
	});
	const result = runContentValidation(rootDir);

	assert.ok(result.issues.some((issue) => issue.code === 'local-path-case'));
	assert.equal(result.issues.some((issue) => issue.code === 'local-path-missing'), false);
});

test('把真正不存在的路径报告为缺失而不是大小写错误', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writeResource(
		rootDir,
		'missing.md',
		'missing-id',
		'src/assets/images/illustration/missing.png',
	);
	const result = runContentValidation(rootDir);

	assert.ok(result.issues.some((issue) => issue.code === 'local-path-missing'));
	assert.equal(result.issues.some((issue) => issue.code === 'local-path-case'), false);
});

test('发现文章缺失的 cover 路径和正文一级标题，但忽略代码块中的 H1', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writePost(
		rootDir,
		'cover-and-heading.md',
		{ cover: './missing-cover.png' },
		'# 重复标题\n\n```md\n# 代码示例\n```\n',
	);
	const result = runContentValidation(rootDir);
	const headingIssues = result.issues.filter((issue) => issue.code === 'markdown-body-h1');

	assert.ok(result.issues.some((issue) => issue.code === 'local-path-missing'));
	assert.equal(headingIssues.length, 1);
	assert.equal(typeof headingIssues[0]?.line, 'number');
});

test('拒绝资源目录之外的主图和外部主图', async () => {
	const rootDir = await createTemporaryContentRoot();
	const publicDirectory = path.join(rootDir, 'public');
	await fs.mkdir(publicDirectory, { recursive: true });
	await fs.writeFile(path.join(publicDirectory, 'outside.png'), 'image');
	await writeResource(rootDir, 'outside.md', 'outside-id', 'public/outside.png');
	await writeResource(rootDir, 'external.md', 'external-id', 'https://example.com/image.png');
	const result = runContentValidation(rootDir);

	assert.ok(result.issues.some((issue) => issue.code === 'resource-image-location'));
	assert.ok(result.issues.some((issue) => issue.code === 'resource-image-external'));
});

test('拒绝无法由资源运行时解析的本地下载，并接受 HTTPS 下载', async () => {
	const rootDir = await createTemporaryContentRoot();
	const imagePath = 'src/assets/images/illustration/example/source.png';
	const imageDirectory = path.join(
		rootDir,
		'src',
		'assets',
		'images',
		'illustration',
		'example',
	);
	await fs.mkdir(imageDirectory, { recursive: true });
	await fs.writeFile(path.join(imageDirectory, 'source.png'), 'image');
	await writeResource(rootDir, 'local-download.md', 'local-download', imagePath, {
		actions: [{ type: 'download', label: '错误路径', href: 'public/source.png' }],
	});
	await writeResource(rootDir, 'https-download.md', 'https-download', imagePath, {
		actions: [{ type: 'download', label: '外部下载', href: 'https://example.com/source.png' }],
	});
	const result = runContentValidation(rootDir);

	assert.ok(
		result.issues.some(
			(issue) =>
				issue.filePath.endsWith('local-download.md') &&
				issue.code === 'resource-image-location',
		),
	);
	assert.equal(
		result.issues.some((issue) => issue.filePath.endsWith('https-download.md')),
		false,
	);
});

test('发现中文金额的歧义美元符号，但忽略代码块', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writePost(
		rootDir,
		'money.md',
		{},
		'亏损20$，则广告出价就是$2。\n\n```txt\n20$，代码里的$2\n```\n',
	);
	const result = runContentValidation(rootDir);
	const issues = result.issues.filter((issue) => issue.code === 'ambiguous-dollar-math');

	assert.equal(issues.length, 1);
});

test('发现缺失的 Markdown 图片，并接受存在的相对图片', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writePost(rootDir, 'image.md', {}, '![图](./assets/missing.png)\n');
	let result = runContentValidation(rootDir);
	assert.ok(result.issues.some((issue) => issue.code === 'local-path-missing'));

	const assetDirectory = path.join(
		rootDir,
		'src',
		'content',
		'weiser-posts',
		'manuscript',
		'assets',
	);
	await fs.mkdir(assetDirectory, { recursive: true });
	await fs.writeFile(path.join(assetDirectory, 'missing.png'), 'image');
	result = runContentValidation(rootDir);
	assert.equal(result.issues.some((issue) => issue.code.startsWith('local-path')), false);
});

async function createTemporaryContentRoot(): Promise<string> {
	const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'telysta-content-test-'));
	temporaryDirectories.push(rootDir);
	await fs.mkdir(path.join(rootDir, 'src', 'content', 'weiser-posts', 'manuscript'), {
		recursive: true,
	});
	await fs.mkdir(path.join(rootDir, 'src', 'content', 'resources'), { recursive: true });
	return rootDir;
}

async function writePost(
	rootDir: string,
	fileName: string,
	overrides: Record<string, unknown> = {},
	body = '正文。\n',
) {
	const frontmatter = {
		title: fileName,
		description: '有效摘要。',
		publishedAt: '2026-08-14',
		updatedAt: '2026-08-14',
		category: 'manuscript',
		tags: [],
		draft: true,
		...overrides,
	};
	await writeMarkdown(
		path.join(rootDir, 'src', 'content', 'weiser-posts', 'manuscript', fileName),
		frontmatter,
		body,
	);
}

async function writeResource(
	rootDir: string,
	fileName: string,
	id: string,
	image: string,
	overrides: Record<string, unknown> = {},
) {
	await writeMarkdown(
		path.join(rootDir, 'src', 'content', 'resources', fileName),
		{
			id,
			title: id,
			summary: '摘要',
			type: 'illustration',
			image,
			publishedAt: '2026-08-14',
			updatedAt: '2026-08-14',
			draft: true,
			...overrides,
		},
		'资源说明。\n',
	);
}

async function writeMarkdown(
	filePath: string,
	frontmatter: Record<string, unknown>,
	body: string,
) {
	const yaml = Object.entries(frontmatter)
		.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
		.join('\n');
	await fs.writeFile(filePath, `---\n${yaml}\n---\n${body}`, 'utf8');
}
