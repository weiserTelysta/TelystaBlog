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
	assert.ok(result.issues.some((issue) => issue.code === 'resource-image-cdn-required'));
});

test('发现不会被 Astro 收录的无扩展名内容文件', async () => {
	const rootDir = await createTemporaryContentRoot();
	const filePath = path.join(
		rootDir,
		'src',
		'content',
		'weiser-posts',
		'manuscript',
		'forgot-extension',
	);
	await fs.writeFile(
		filePath,
		'---\ntitle: 被忽略的文章\n---\n\n正文\n',
		'utf8',
	);

	const result = runContentValidation(rootDir);

	assert.ok(
		result.issues.some(
			(issue) =>
				issue.code === 'content-file-extension' &&
				issue.filePath.endsWith('forgot-extension'),
		),
	);
});

test('发现系列顺序重复、字段不成对和未知系列', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writePost(rootDir, 'one.md', {
		series: 'weiser-blog-construction-records',
		seriesOrder: 1,
	});
	await writePost(rootDir, 'two.md', {
		series: 'weiser-blog-construction-records',
		seriesOrder: 1,
	});
	await writePost(rootDir, 'three.md', { series: 'unknown-series' });
	await writePost(rootDir, 'unknown-category.md', { category: 'unknown-category' });
	const result = runContentValidation(rootDir);

	assert.ok(result.issues.some((issue) => issue.code === 'series-order-duplicate'));
	assert.ok(result.issues.some((issue) => issue.code === 'series-pair'));
	assert.ok(result.issues.some((issue) => issue.code === 'series-unknown'));
	assert.ok(result.issues.some((issue) => issue.code === 'category-unknown'));
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

test('英文标题与摘要留空时自动回退到中文', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writePost(rootDir, 'bilingual.md', {
		titleEn: '',
		descriptionEn: '',
	});
	const result = runContentValidation(rootDir);

	assert.equal(result.errorCount, 0);
	assert.equal(result.documents[0].frontmatter.titleEn, 'bilingual.md');
	assert.equal(result.documents[0].frontmatter.descriptionEn, '有效摘要。');
});

test('仅日期文件名和 Markdown 正文即可发布，检查不会改写源文件', async () => {
	const rootDir = await createTemporaryContentRoot();
	const filePath = path.join(rootDir, 'src/content/weiser-posts/manuscript/2026-9-13-新文章.md');
	const source = '  # 新文章\n\n这是一篇直接新建的文章，正文首段足够完整，可以自动作为文章摘要。\n';
	await fs.writeFile(filePath, source);
	const result = runContentValidation(rootDir);
	assert.equal(result.errorCount, 0);
	assert.equal(result.documents[0].frontmatter.title, '新文章');
	assert.equal(result.documents[0].frontmatter.category, 'manuscript');
	assert.equal(result.documents[0].frontmatter.publishedAt, '2026-09-13');
	assert.equal(result.documents[0].frontmatter.updatedAt, '2026-09-13');
	assert.match(String(result.documents[0].frontmatter.description), /^这是一篇/);
	assert.equal(await fs.readFile(filePath, 'utf8'), source);
});

test('兼容 letters、空可选字段，同时保留孤立系列序号的错误', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writePost(rootDir, 'letters.md', { category: 'letters', series: null, seriesOrder: null, cover: '', description: null });
	let result = runContentValidation(rootDir);
	assert.equal(result.errorCount, 0);
	assert.equal(result.documents[0].frontmatter.category, 'essays');
	assert.equal(result.documents[0].frontmatter.series, undefined);
	await writePost(rootDir, 'letters.md', { category: 'letters', series: null, seriesOrder: 1 });
	result = runContentValidation(rootDir);
	assert.ok(result.issues.some(issue => issue.code === 'series-pair'));
});

test('无法推导日期或遇到损坏的 frontmatter 时仍明确报错', async () => {
	const rootDir = await createTemporaryContentRoot();
	const directory = path.join(rootDir, 'src/content/weiser-posts/manuscript');
	await fs.writeFile(path.join(directory, 'no-date.md'), '# 标题\n\n正文\n');
	await fs.writeFile(path.join(directory, '2026-9-13-invalid.md'), '  ---\n  title: 错误\n  ---\n正文\n');
	const result = runContentValidation(rootDir);
	assert.ok(result.issues.some(issue => issue.code === 'published-date-missing'));
	assert.ok(result.issues.some(issue => issue.code === 'frontmatter-missing'));
});

test('接受空 frontmatter，并保留正文与正确行号', async () => {
	const rootDir = await createTemporaryContentRoot();
	const filePath = path.join(rootDir, 'src/content/weiser-posts/manuscript/2026-9-13-empty.md');
	await fs.writeFile(filePath, '\uFEFF---\r\n---\r\n# 空元数据\r\n\r\n正文。\r\n');
	const result = runContentValidation(rootDir);
	assert.equal(result.errorCount, 0);
	assert.equal(result.documents[0].frontmatter.title, '空元数据');
	assert.equal(result.documents[0].bodyStartLine, 3);
	assert.equal(result.documents[0].body, '# 空元数据\n\n正文。\n');
});

test('拒绝列表或标量 frontmatter，不能静默当作空元数据', async () => {
	const rootDir = await createTemporaryContentRoot();
	const directory = path.join(rootDir, 'src/content/weiser-posts/manuscript');
	for (const [name, yaml] of [['list', '- draft: true'], ['scalar', 'draft true'], ['null', 'null']]) {
		await fs.writeFile(path.join(directory, `2026-9-13-${name}.md`), `---\n${yaml}\n---\n正文。\n`);
	}
	const result = runContentValidation(rootDir);
	assert.equal(result.issues.filter(issue => issue.code === 'frontmatter-invalid').length, 3);
});

test('系列序号须为正整数，同时接受 YAML 中的数字字符串', async () => {
	const rootDir = await createTemporaryContentRoot();
	for (const [index, order] of [0, -1, 1.5, 'abc', false].entries()) {
		await writePost(rootDir, `invalid-${index}.md`, { series: 'weiser-blog-construction-records', seriesOrder: order });
	}
	await writePost(rootDir, 'valid.md', { series: 'weiser-blog-construction-records', seriesOrder: '2' });
	const result = runContentValidation(rootDir);
	assert.equal(result.issues.filter(issue => issue.code === 'series-order-invalid').length, 5);
	assert.ok(result.issues.every(issue => !issue.filePath.endsWith('/valid.md')));
});

test('发现文件名大小写错误，并接受大小写完全一致的路径', async () => {
	const rootDir = await createTemporaryContentRoot();
	const imageDirectory = path.join(rootDir, 'src', 'assets', 'images', 'illustration');
	await fs.mkdir(imageDirectory, { recursive: true });
	await fs.writeFile(path.join(imageDirectory, 'Exact.png'), 'image');
	await writePost(rootDir, 'case.md', {
		cover: 'src/assets/images/illustration/exact.png',
	});
	const invalidResult = runContentValidation(rootDir);
	assert.ok(invalidResult.issues.some((issue) => issue.code === 'local-path-case'));

	await writePost(rootDir, 'case.md', {
		cover: 'src/assets/images/illustration/Exact.png',
	});
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

test('资源图片必须使用 CDN 清单引用', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writeResource(
		rootDir,
		'missing.md',
		'missing-id',
		'src/assets/images/illustration/missing.png',
	);
	const result = runContentValidation(rootDir);

	assert.ok(result.issues.some((issue) => issue.code === 'resource-image-cdn-required'));
});

test('发现文章缺失的 cover 路径和重复一级标题，但忽略代码块中的 H1', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writePost(
		rootDir,
		'cover-and-heading.md',
		{ cover: './missing-cover.png' },
		'# 重复标题\n\n```md\n# 代码示例\n```\n',
	);
	const result = runContentValidation(rootDir);
	const headingIssues = result.issues.filter((issue) => issue.code === 'markdown-body-h1-multiple');

	assert.ok(result.issues.some((issue) => issue.code === 'local-path-missing'));
	assert.equal(headingIssues.length, 1);
	assert.equal(typeof headingIssues[0]?.line, 'number');
});

test('允许正文省略 H1 或使用不同于 frontmatter 的 H1', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writeMarkdown(
		path.join(rootDir, 'src', 'content', 'weiser-posts', 'manuscript', 'fallback.md'),
		{
			title: '格式标题',
			titleEn: 'Frontmatter title',
			description: '有效摘要。',
			descriptionEn: 'A valid summary.',
			publishedAt: '2026-08-14',
			updatedAt: '2026-08-14',
			category: 'manuscript',
			tags: [],
			draft: true,
		},
		'## 第一节\n\n正文。\n',
	);
	await writeMarkdown(
		path.join(rootDir, 'src', 'content', 'weiser-posts', 'manuscript', 'preferred.md'),
		{
			title: '格式标题',
			titleEn: 'Frontmatter title',
			description: '有效摘要。',
			descriptionEn: 'A valid summary.',
			publishedAt: '2026-08-14',
			updatedAt: '2026-08-14',
			category: 'manuscript',
			tags: [],
			draft: true,
		},
		'# 正文标题\n',
	);
	const result = runContentValidation(rootDir);

	assert.equal(
		result.issues.some((issue) => issue.code.startsWith('markdown-body-h1')),
		false,
	);
});

test('拒绝资源目录之外的主图和外部主图', async () => {
	const rootDir = await createTemporaryContentRoot();
	const publicDirectory = path.join(rootDir, 'public');
	await fs.mkdir(publicDirectory, { recursive: true });
	await fs.writeFile(path.join(publicDirectory, 'outside.png'), 'image');
	await writeResource(rootDir, 'outside.md', 'outside-id', 'public/outside.png');
	await writeResource(rootDir, 'external.md', 'external-id', 'https://example.com/image.png');
	const result = runContentValidation(rootDir);

	assert.ok(result.issues.some((issue) => issue.code === 'resource-image-cdn-required'));
	assert.ok(result.issues.some((issue) => issue.code === 'resource-image-external'));
});

test('接受清单中的 CDN 资源引用并拒绝未知引用', async () => {
	const rootDir = await createTemporaryContentRoot();
	await writeResource(
		rootDir,
		'cdn-valid.md',
		'cdn-valid',
		'asset:Telysta/telysta_crinoline_character_illustration',
	);
	await writeResource(
		rootDir,
		'cdn-missing.md',
		'cdn-missing',
		'asset:Telysta/not-in-the-manifest',
	);

	const result = runContentValidation(rootDir);

	assert.equal(
		result.issues.some((issue) => issue.filePath.endsWith('cdn-valid.md')),
		false,
	);
	assert.ok(
		result.issues.some(
			(issue) =>
				issue.filePath.endsWith('cdn-missing.md') &&
				issue.code === 'cdn-asset-missing',
		),
	);
});

test('拒绝无法由资源运行时解析的本地下载，并接受 HTTPS 下载', async () => {
	const rootDir = await createTemporaryContentRoot();
	const imagePath = 'asset:Telysta/telysta_crinoline_character_illustration';
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
				issue.code === 'resource-image-cdn-required',
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
		titleEn: `English title for ${fileName}`,
		description: '有效摘要。',
		descriptionEn: 'A valid summary.',
		publishedAt: '2026-08-14',
		updatedAt: '2026-08-14',
		category: 'manuscript',
		tags: [],
		draft: true,
		...overrides,
	};
	const articleBody = `# ${String(frontmatter.title)}\n\n${body}`;
	await writeMarkdown(
		path.join(rootDir, 'src', 'content', 'weiser-posts', 'manuscript', fileName),
		frontmatter,
		articleBody,
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
