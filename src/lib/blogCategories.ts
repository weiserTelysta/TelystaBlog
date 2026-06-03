/**
 * Keep this file data-only so content.config.ts can import category ids without
 * loading visual assets. Category images and foil visuals can be mapped later.
 */
export const BLOG_CATEGORY_IDS = [
	'manuscript',
	'collection',
	'essays',
	'reading',
	'life',
	'portraits',
] as const;

export type BlogCategoryId = (typeof BLOG_CATEGORY_IDS)[number];

export type FoilPreset = 'starlight' | 'aurora' | 'moonlit' | 'prism' | 'embers' | 'ripple';

export type BlogCategory = {
	id: BlogCategoryId;
	title: string;
	subtitle: string;
	description: string;
	foil: FoilPreset;
};

export type CategoryPostCount = Record<BlogCategoryId, number>;

export const BLOG_CATEGORIES = [
	{
		id: 'manuscript',
		title: "Weiser's Manuscript",
		subtitle: 'Code & Projects',
		description: '关于代码、项目和技术实践的记录。',
		foil: 'starlight',
	},
	{
		id: 'collection',
		title: "Telysta's Collection",
		subtitle: 'Learning Notes',
		description: '学习过程中被认真收好的线索与笔记。',
		foil: 'aurora',
	},
	{
		id: 'essays',
		title: 'Quiet Letters',
		subtitle: 'Essays & Thoughts',
		description: '一些不急着抵达结论的想法。',
		foil: 'moonlit',
	},
	{
		id: 'reading',
		title: 'Reading Room',
		subtitle: 'Books & Media',
		description: '阅读、观看，以及由此延伸出来的理解。',
		foil: 'prism',
	},
	{
		id: 'life',
		title: 'Life Fragments',
		subtitle: 'Daily Moments',
		description: '普通日子里偶尔闪光的碎片。',
		foil: 'ripple',
	},
	{
		id: 'portraits',
		title: 'Portrait Notes',
		subtitle: 'People & Character Studies',
		description: '对人物、角色和创作者表达方式的观察。',
		foil: 'embers',
	},
] as const satisfies readonly BlogCategory[];

export function isBlogCategoryId(value: string | null | undefined): value is BlogCategoryId {
	return BLOG_CATEGORY_IDS.includes(value as BlogCategoryId);
}

export function getBlogCategoryById(id: string | null | undefined) {
	if (!isBlogCategoryId(id)) {
		return undefined;
	}

	return BLOG_CATEGORIES.find((category) => category.id === id);
}

export function createEmptyCategoryPostCount(): CategoryPostCount {
	return BLOG_CATEGORY_IDS.reduce((counts, categoryId) => {
		counts[categoryId] = 0;
		return counts;
	}, {} as CategoryPostCount);
}

export function getCategoryPostCount<TPost extends { category: BlogCategoryId }>(
	posts: TPost[],
): CategoryPostCount {
	const counts = createEmptyCategoryPostCount();

	for (const post of posts) {
		counts[post.category] += 1;
	}

	return counts;
}

export function buildCategoryHref(categoryId?: BlogCategoryId) {
	if (!categoryId) {
		return '/blog';
	}

	return `/blog/category/${encodeURIComponent(categoryId)}/`;
}
