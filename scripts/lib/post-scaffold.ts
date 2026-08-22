import fs from 'node:fs/promises';
import path from 'node:path';
import { stringify } from 'yaml';
import {
	BLOG_CATEGORY_IDS,
	type BlogCategoryId,
} from '../../src/config/content/blogCategories';
import {
	BLOG_SERIES_IDS,
	type BlogSeriesId,
} from '../../src/config/content/blogSeries';

export type CreatePostOptions = {
	title: string;
	description: string;
	category: BlogCategoryId;
	slug: string;
	date: string;
	tags: string[];
	series?: BlogSeriesId;
	seriesOrder?: number;
	withAssets: boolean;
};

export type CreatePostCliInput = Partial<CreatePostOptions> & {
	help?: boolean;
};

export type PostDestination = {
	categoryDirectory: string;
	markdownPath: string;
	assetDirectoryPath: string;
};

export type CreatePostResult = PostDestination & {
	createdAssetDirectory: boolean;
};

export type ValidationResult = {
	valid: boolean;
	errors: string[];
};

const WINDOWS_RESERVED_NAMES = new Set([
	'con',
	'prn',
	'aux',
	'nul',
	'com1',
	'com2',
	'com3',
	'com4',
	'com5',
	'com6',
	'com7',
	'com8',
	'com9',
	'lpt1',
	'lpt2',
	'lpt3',
	'lpt4',
	'lpt5',
	'lpt6',
	'lpt7',
	'lpt8',
	'lpt9',
]);

const VALUE_FLAGS = new Set([
	'title',
	'description',
	'category',
	'slug',
	'date',
	'tags',
	'series',
	'series-order',
]);

export function parseCreatePostArgs(argv: string[]): CreatePostCliInput {
	const values = new Map<string, string>();
	let withAssets = false;
	let help = false;

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];

		if (argument === '--with-assets') {
			withAssets = true;
			continue;
		}

		if (argument === '--help' || argument === '-h') {
			help = true;
			continue;
		}

		if (!argument.startsWith('--')) {
			throw new Error(`不支持的位置参数：${argument}`);
		}

		const equalsIndex = argument.indexOf('=');
		const flag = argument.slice(2, equalsIndex >= 0 ? equalsIndex : undefined);

		if (!VALUE_FLAGS.has(flag)) {
			throw new Error(`未知参数：--${flag}`);
		}

		const value = equalsIndex >= 0 ? argument.slice(equalsIndex + 1) : argv[index + 1];

		if (!value || (equalsIndex < 0 && value.startsWith('--'))) {
			throw new Error(`参数 --${flag} 缺少值。`);
		}

		values.set(flag, value);

		if (equalsIndex < 0) {
			index += 1;
		}
	}

	const seriesOrderValue = values.get('series-order');
	const title = values.get('title');
	const description = values.get('description');
	const category = values.get('category');
	const slug = values.get('slug');
	const date = values.get('date');
	const series = values.get('series');

	return {
		...(title !== undefined ? { title } : {}),
		...(description !== undefined ? { description } : {}),
		...(category !== undefined ? { category: category as BlogCategoryId } : {}),
		...(slug !== undefined ? { slug } : {}),
		...(date !== undefined ? { date } : {}),
		...(values.has('tags') ? { tags: parseTags(values.get('tags') ?? '') } : {}),
		...(series !== undefined ? { series: series as BlogSeriesId } : {}),
		...(seriesOrderValue !== undefined ? { seriesOrder: Number(seriesOrderValue) } : {}),
		withAssets,
		help,
	};
}

export function normalizePostSlug(value: string): string {
	return value
		.normalize('NFKC')
		.trim()
		.toLocaleLowerCase('zh-CN')
		.replace(/[\s_]+/g, '-')
		.replace(/[^\p{Letter}\p{Number}-]+/gu, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

export function getShanghaiDate(now = new Date()): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(now);
	const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

	return `${values.year}-${values.month}-${values.day}`;
}

export function completeCreatePostOptions(input: CreatePostCliInput): CreatePostOptions {
	const title = input.title?.trim() ?? '';
	const description = input.description?.trim() ?? '';
	const normalizedSlug = normalizePostSlug(input.slug?.trim() || title);

	return {
		title,
		description,
		category: input.category as BlogCategoryId,
		slug: normalizedSlug,
		date: input.date?.trim() || getShanghaiDate(),
		tags: input.tags ?? [],
		...(input.series ? { series: input.series } : {}),
		...(input.seriesOrder !== undefined ? { seriesOrder: input.seriesOrder } : {}),
		withAssets: input.withAssets ?? false,
	};
}

export function validateCreatePostOptions(options: CreatePostOptions): ValidationResult {
	const errors: string[] = [];

	if (!options.title) {
		errors.push('文章标题不能为空。');
	}

	if (!options.description) {
		errors.push('文章摘要不能为空。');
	}

	if (!BLOG_CATEGORY_IDS.includes(options.category)) {
		errors.push(`未知栏目：${String(options.category)}`);
	}

	if (!options.slug) {
		errors.push('无法从标题生成有效 slug，请使用 --slug 明确指定。');
	} else if (isWindowsReservedName(options.slug)) {
		errors.push(`slug 不能使用 Windows 保留名称：${options.slug}`);
	}

	if (!isValidDate(options.date)) {
		errors.push(`日期必须是有效的 YYYY-MM-DD：${options.date}`);
	}

	if (options.series && !BLOG_SERIES_IDS.includes(options.series)) {
		errors.push(`未知系列：${options.series}`);
	}

	if (Boolean(options.series) !== (options.seriesOrder !== undefined)) {
		errors.push('series 与 seriesOrder 必须同时提供。');
	}

	if (
		options.seriesOrder !== undefined &&
		(!Number.isInteger(options.seriesOrder) || options.seriesOrder <= 0)
	) {
		errors.push('seriesOrder 必须是正整数。');
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

export function resolvePostDestination(
	options: CreatePostOptions,
	rootDir: string,
): PostDestination {
	const categoryDirectory = path.join(
		rootDir,
		'src',
		'content',
		'weiser-posts',
		options.category,
	);

	return {
		categoryDirectory,
		markdownPath: path.join(categoryDirectory, `${options.slug}.md`),
		assetDirectoryPath: path.join(categoryDirectory, options.slug),
	};
}

export function renderPostTemplate(template: string, options: CreatePostOptions): string {
	if (!template.includes('{{frontmatter}}')) {
		throw new Error('文章模板缺少 {{frontmatter}} 占位符。');
	}

	const frontmatter: Record<string, unknown> = {
		title: options.title,
		description: options.description,
		publishedAt: options.date,
		updatedAt: options.date,
		category: options.category,
		tags: options.tags,
		draft: true,
	};

	if (options.series) {
		frontmatter.series = options.series;
		frontmatter.seriesOrder = options.seriesOrder;
	}

	const yaml = stringify(frontmatter, {
		lineWidth: 0,
		defaultStringType: 'QUOTE_DOUBLE',
		defaultKeyType: 'PLAIN',
	});

	return template.replace('{{frontmatter}}', yaml).replace(/\r\n/g, '\n');
}

export async function createPost(
	options: CreatePostOptions,
	rootDir: string,
): Promise<CreatePostResult> {
	const validation = validateCreatePostOptions(options);

	if (!validation.valid) {
		throw new Error(validation.errors.join('\n'));
	}

	const destination = resolvePostDestination(options, rootDir);
	const templatePath = path.join(rootDir, 'scripts', 'templates', 'post.md');
	const template = await fs.readFile(templatePath, 'utf8');
	const content = renderPostTemplate(template, options);
	const temporaryPath = `${destination.markdownPath}.tmp-${process.pid}-${Date.now()}`;
	let createdAssetDirectory = false;

	await fs.mkdir(destination.categoryDirectory, { recursive: true });

	if (await pathExists(destination.markdownPath)) {
		throw new Error(`目标文章已存在，未覆盖：${destination.markdownPath}`);
	}

	try {
		if (options.withAssets) {
			if (await pathExists(destination.assetDirectoryPath)) {
				const assetDirectoryStat = await fs.stat(destination.assetDirectoryPath);

				if (!assetDirectoryStat.isDirectory()) {
					throw new Error(
						`文章资源路径已存在但不是目录：${destination.assetDirectoryPath}`,
					);
				}
			} else {
				await fs.mkdir(destination.assetDirectoryPath);
				createdAssetDirectory = true;
			}
		}

		await fs.writeFile(temporaryPath, content, { encoding: 'utf8', flag: 'wx' });
		await fs.rename(temporaryPath, destination.markdownPath);
	} catch (error) {
		await fs.rm(temporaryPath, { force: true });

		if (createdAssetDirectory) {
			await fs.rmdir(destination.assetDirectoryPath).catch(() => undefined);
		}

		throw error;
	}

	return {
		...destination,
		createdAssetDirectory,
	};
}

export function parseTags(value: string): string[] {
	return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];
}

function isWindowsReservedName(value: string): boolean {
	const stem = value.split('.')[0]?.toLocaleLowerCase('en-US') ?? '';
	return WINDOWS_RESERVED_NAMES.has(stem) || value === '.' || value === '..';
}

function isValidDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

	if (!match) {
		return false;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));

	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}
