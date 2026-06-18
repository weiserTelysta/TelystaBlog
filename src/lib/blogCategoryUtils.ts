import {
	BLOG_CATEGORIES,
	BLOG_CATEGORY_IDS,
	type BlogCategoryId,
	type CategoryPostCount,
} from '../config/content/blogCategories';

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
