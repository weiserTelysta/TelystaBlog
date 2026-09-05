import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { parse } from 'yaml';
import {
	completeCreatePostOptions,
	createPost,
	getShanghaiDate,
	normalizePostSlug,
	parseCreatePostArgs,
	renderPostTemplate,
	validateCreatePostOptions,
	type CreatePostOptions,
} from '../scripts/lib/post-scaffold';

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map((directory) =>
			fs.rm(directory, { recursive: true, force: true }),
		),
	);
});

test('规范化中英文 slug 并保留中文', () => {
	assert.equal(normalizePostSlug('  Telysta BLOG 的新阶段  '), 'telysta-blog-的新阶段');
	assert.equal(normalizePostSlug('你好＿World!'), '你好-world');
});

test('解析命令行参数和去重标签', () => {
	const parsed = parseCreatePostArgs([
		'--title',
		'测试文章',
		'--description=测试摘要',
		'--category',
		'manuscript',
		'--tags',
		'Astro, Blog,Astro',
		'--series',
		'weiser-blog-construction-records',
		'--series-order',
		'2',
		'--with-assets',
	]);

	assert.deepEqual(parsed.tags, ['Astro', 'Blog']);
	assert.equal(parsed.seriesOrder, 2);
	assert.equal(parsed.withAssets, true);
});

test('拒绝 Windows 保留名称和不完整系列字段', () => {
	const reserved = createOptions({ slug: 'con' });
	const incompleteSeries = createOptions({
		series: 'weiser-blog-construction-records',
		seriesOrder: undefined,
	});

	assert.equal(validateCreatePostOptions(reserved).valid, false);
	assert.equal(validateCreatePostOptions(incompleteSeries).valid, false);
});

test('使用上海时区生成日期', () => {
	assert.equal(getShanghaiDate(new Date('2026-08-13T16:30:00.000Z')), '2026-08-14');
});

test('模板生成有效 frontmatter 且不重复文章 H1', () => {
	const content = renderPostTemplate(
		'---\n{{frontmatter}}---\n\n这里开始写正文。\n',
		createOptions({
			title: '含有: 冒号的标题',
			tags: ['Astro', '中文'],
			series: 'weiser-blog-construction-records',
			seriesOrder: 1,
		}),
	);
	const match = /^---\n([\s\S]*?)---\n/.exec(content);

	assert.ok(match);
	assert.deepEqual(parse(match[1]).tags, ['Astro', '中文']);
	assert.equal(parse(match[1]).seriesOrder, 1);
	assert.equal(/^# /m.test(content), false);
});

test('创建 UTF-8 草稿和专属资源目录，并拒绝覆盖', async () => {
	const rootDir = await createTemporaryProject();
	const options = createOptions({
		title: '中文草稿',
		description: '一段中文摘要。',
		slug: '中文草稿',
		withAssets: true,
	});
	const result = await createPost(options, rootDir);
	const content = await fs.readFile(result.markdownPath, 'utf8');

	assert.match(content, /中文草稿/);
	assert.match(content, /draft: true/);
	assert.equal((await fs.stat(result.assetDirectoryPath)).isDirectory(), true);
	await assert.rejects(() => createPost(options, rootDir), /目标文章已存在/);
});

test('复用已有专属资源目录，并拒绝同名文件占用资源路径', async () => {
	const reusableRootDir = await createTemporaryProject();
	const reusableOptions = createOptions({ withAssets: true });
	const reusableAssetDirectory = path.join(
		reusableRootDir,
		'src',
		'content',
		'weiser-posts',
		'manuscript',
		'test-post',
	);
	await fs.mkdir(reusableAssetDirectory, { recursive: true });

	const reusableResult = await createPost(reusableOptions, reusableRootDir);
	assert.equal(reusableResult.createdAssetDirectory, false);
	assert.equal((await fs.stat(reusableAssetDirectory)).isDirectory(), true);

	const occupiedRootDir = await createTemporaryProject();
	const occupiedAssetPath = path.join(
		occupiedRootDir,
		'src',
		'content',
		'weiser-posts',
		'manuscript',
		'test-post',
	);
	await fs.mkdir(path.dirname(occupiedAssetPath), { recursive: true });
	await fs.writeFile(occupiedAssetPath, 'occupied', 'utf8');

	await assert.rejects(
		() => createPost(createOptions({ withAssets: true }), occupiedRootDir),
		/文章资源路径已存在但不是目录/,
	);
});

test('补全非交互输入的默认 slug、日期和标签', () => {
	const completed = completeCreatePostOptions({
		title: '新的文章',
		description: '摘要',
		category: 'essays',
	});

	assert.equal(completed.slug, '新的文章');
	assert.match(completed.date, /^\d{4}-\d{2}-\d{2}$/);
	assert.deepEqual(completed.tags, []);
});

function createOptions(overrides: Partial<CreatePostOptions> = {}): CreatePostOptions {
	return {
		title: '测试文章',
		description: '测试摘要',
		category: 'manuscript',
		slug: 'test-post',
		date: '2026-08-14',
		tags: [],
		withAssets: false,
		...overrides,
	};
}

async function createTemporaryProject(): Promise<string> {
	const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'telysta-post-test-'));
	temporaryDirectories.push(rootDir);
	const templateDirectory = path.join(rootDir, 'scripts', 'templates');
	await fs.mkdir(templateDirectory, { recursive: true });
	await fs.writeFile(
		path.join(templateDirectory, 'post.md'),
		'---\n{{frontmatter}}---\n\n这里开始写正文。\n',
		'utf8',
	);
	return rootDir;
}
