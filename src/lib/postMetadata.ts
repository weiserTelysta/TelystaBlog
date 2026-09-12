import { BLOG_CATEGORY_IDS } from '../config/content/blogCategories';
import { buildPostExcerpt } from './blogExcerpt';
import { extractMarkdownTitle } from './markdownTitle';

const isBlank = (value: unknown) => value == null || (typeof value === 'string' && !value.trim());
const categoryIds: ReadonlySet<string> = new Set(BLOG_CATEGORY_IDS);

function canonicalCategory(value: string): string {
	const id = value.trim().toLowerCase();
	return id === 'letters' ? 'essays' : id;
}

export function needsPostBody(data: Record<string, unknown>): boolean {
	return isBlank(data.title) || isBlank(data.description);
}

/** Shared by the build loader and the authoring checks. Never rewrites the source. */
export function completePostMetadata(
	raw: Record<string, unknown>,
	body: string,
	filePath: string,
): Record<string, unknown> {
	const data = { ...raw };
	const segments = filePath.replace(/\\/g, '/').split('/');
	const filename = (segments.at(-1) ?? '').replace(/\.md$/i, '');
	const datePrefix = /^(\d{4})[-.](\d{1,2})[-.](\d{1,2})(?=[-.]|$)/.exec(filename);
	const fallbackTitle = filename.replace(/^\d{4}[-.]\d{1,2}[-.]\d{1,2}[-.]?/, '');
	if (isBlank(data.title)) data.title = extractMarkdownTitle(body) || fallbackTitle;
	if (isBlank(data.titleEn)) data.titleEn = data.title;
	if (isBlank(data.description)) data.description = buildPostExcerpt(body, String(data.title ?? ''));
	if (isBlank(data.descriptionEn)) data.descriptionEn = data.description;
	if (isBlank(data.publishedAt) && datePrefix) {
		data.publishedAt = `${datePrefix[1]}-${datePrefix[2].padStart(2, '0')}-${datePrefix[3].padStart(2, '0')}`;
	}
	if (isBlank(data.updatedAt)) data.updatedAt = data.publishedAt;
	if (isBlank(data.category)) {
		// Only the first directory under weiser-posts determines the category.
		const rootIndex = segments.lastIndexOf('weiser-posts');
		const folder = rootIndex >= 0 ? segments[rootIndex + 1] : segments[0];
		const candidate = canonicalCategory(folder ?? '');
		if (categoryIds.has(candidate)) data.category = candidate;
	} else if (typeof data.category === 'string') {
		data.category = canonicalCategory(data.category);
	}
	for (const key of ['cover', 'series', 'seriesOrder']) {
		if (isBlank(data[key])) delete data[key];
	}
	if (isBlank(data.tags)) data.tags = [];
	return data;
}
