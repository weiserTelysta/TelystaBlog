import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { BLOG_CATEGORIES } from '../src/config/content/blogCategories';
import { BLOG_SERIES } from '../src/config/content/blogSeries';
import {
	completeCreatePostOptions,
	createPost,
	getShanghaiDate,
	normalizePostSlug,
	parseCreatePostArgs,
	parseTags,
	validateCreatePostOptions,
	type CreatePostCliInput,
} from './lib/post-scaffold';

const HELP_TEXT = `创建新的 Telysta 博客草稿

用法：
  npm run post:new
  npm run post:new -- --title "标题" --description "摘要" --category manuscript

参数：
  --title           文章标题
  --description     文章摘要
  --category        栏目 id
  --slug            可选 URL slug
  --date            YYYY-MM-DD，默认使用上海日期
  --tags            逗号分隔标签
  --series          可选系列 id
  --series-order    系列顺序，必须与 --series 同时提供
  --with-assets     创建同名文章资源目录
  --help, -h        显示帮助
`;

async function main() {
	const argv = process.argv.slice(2);
	const parsed = parseCreatePostArgs(argv);

	if (parsed.help) {
		process.stdout.write(HELP_TEXT);
		return;
	}

	const input = argv.length === 0 ? await promptForCreatePostOptions() : parsed;
	const options = completeCreatePostOptions(input);
	const validation = validateCreatePostOptions(options);

	if (!validation.valid) {
		throw new Error(validation.errors.join('\n'));
	}

	const result = await createPost(options, process.cwd());
	process.stdout.write(`已创建草稿：${result.markdownPath}\n`);

	if (options.withAssets) {
		process.stdout.write(`文章资源目录：${result.assetDirectoryPath}\n`);
	}

	process.stdout.write('文章保持 draft: true，完成内容检查后再公开。\n');
}

async function promptForCreatePostOptions(): Promise<CreatePostCliInput> {
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		throw new Error('非交互环境必须提供 --title、--description 和 --category。');
	}

	const prompt = createInterface({ input: process.stdin, output: process.stdout });

	try {
		process.stdout.write('可用栏目：\n');
		BLOG_CATEGORIES.forEach((category) => {
			process.stdout.write(`  ${category.id}  ${category.title}\n`);
		});

		const title = await askRequired(prompt, '标题：');
		const description = await askRequired(prompt, '摘要：');
		const category = await askRequired(prompt, '栏目 id：');
		const suggestedSlug = normalizePostSlug(title);
		const slugInput = (await prompt.question(`slug（默认 ${suggestedSlug}）：`)).trim();
		const dateInput = (await prompt.question(`日期（默认 ${getShanghaiDate()}）：`)).trim();
		const tagsInput = (await prompt.question('标签（逗号分隔，可留空）：')).trim();
		process.stdout.write('可用系列（可留空）：\n');
		BLOG_SERIES.forEach((series) => {
			process.stdout.write(`  ${series.id}  ${series.title}\n`);
		});
		const series = (await prompt.question('系列 id：')).trim();
		const seriesOrder = series
			? Number(await askRequired(prompt, '系列顺序：'))
			: undefined;
		const withAssets = /^(y|yes|是)$/i.test(
			(await prompt.question('创建文章专属资源目录？(y/N)：')).trim(),
		);

		return {
			title,
			description,
			category: category as CreatePostCliInput['category'],
			slug: slugInput || suggestedSlug,
			date: dateInput || getShanghaiDate(),
			tags: parseTags(tagsInput),
			...(series ? { series: series as CreatePostCliInput['series'], seriesOrder } : {}),
			withAssets,
		};
	} finally {
		prompt.close();
	}
}

async function askRequired(
	prompt: ReturnType<typeof createInterface>,
	question: string,
): Promise<string> {
	while (true) {
		const value = (await prompt.question(question)).trim();

		if (value) {
			return value;
		}

		process.stdout.write('此项不能为空。\n');
	}
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`创建文章失败：\n${message}\n`);
	process.exitCode = 1;
});
