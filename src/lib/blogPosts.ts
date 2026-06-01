import { getCollection, type CollectionEntry } from 'astro:content';
import {
	type BlogCategoryId,
	getBlogCategoryById,
	isBlogCategoryId,
} from './blogCategories';

export type PostEntry = CollectionEntry<'posts'>;

export type PostListItem = {
	id: string;
	slug: string;
	href: string;
	title: string;
	description: string;
	publishedAt: Date;
	updatedAt: Date;
	category: BlogCategoryId;
	categoryTitle: string;
	tags: string[];
	cover?: string;
	series?: string;
	seriesOrder?: number;
};

export type BlogMonthGroup = {
	key: string;
	year: number;
	month: number;
	label: string;
	posts: PostListItem[];
};

export type BlogYearGroup = {
	year: number;
	id: string;
	postCount: number;
	months: BlogMonthGroup[];
};

export type SeriesNavigation = {
	previous?: PostListItem;
	next?: PostListItem;
};

export function buildPostHref(entryId: string): string {
	const normalizedId = entryId.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
	return `/blog/${normalizedId}/`;
}

export function toPostListItem(entry: PostEntry): PostListItem {
	const category = getBlogCategoryById(entry.data.category);
	const cover = entry.data.cover?.trim();

	return {
		id: entry.id,
		slug: entry.id,
		href: buildPostHref(entry.id),
		title: entry.data.title,
		description: entry.data.description,
		publishedAt: entry.data.publishedAt,
		updatedAt: entry.data.updatedAt,
		category: category?.id ?? entry.data.category,
		categoryTitle: category?.title ?? entry.data.category,
		tags: entry.data.tags,
		cover: cover || undefined,
		series: entry.data.series,
		seriesOrder: entry.data.seriesOrder,
	};
}

export async function getPublishedPosts(): Promise<PostListItem[]> {
	const entries = (await getCollection('posts')) as PostEntry[];

	return entries
		.filter((entry) => !entry.data.draft)
		.map(toPostListItem)
		.sort((current, next) => next.publishedAt.getTime() - current.publishedAt.getTime());
}

export function filterPostsByCategory(
	posts: PostListItem[],
	categoryId?: BlogCategoryId,
): PostListItem[] {
	if (!categoryId) {
		return posts;
	}

	return posts.filter((post) => post.category === categoryId);
}

export function getPostsBySeries(posts: PostListItem[], seriesId: string): PostListItem[] {
	return posts
		.filter((post) => post.series === seriesId)
		.sort(compareSeriesPosts);
}

export function getSeriesNavigation(
	posts: PostListItem[],
	currentPost: PostListItem,
): SeriesNavigation | undefined {
	if (!currentPost.series || typeof currentPost.seriesOrder !== 'number') {
		return undefined;
	}

	const seriesPosts = posts
		.filter(
			(post) =>
				post.series === currentPost.series && typeof post.seriesOrder === 'number',
		)
		.sort(compareSeriesPosts);
	const currentIndex = seriesPosts.findIndex((post) => post.id === currentPost.id);

	if (currentIndex < 0) {
		return undefined;
	}

	return {
		previous: seriesPosts[currentIndex - 1],
		next: seriesPosts[currentIndex + 1],
	};
}

export function groupPostsByYearMonth(posts: PostListItem[]): BlogYearGroup[] {
	const yearGroups: BlogYearGroup[] = [];

	for (const post of posts) {
		const year = post.publishedAt.getFullYear();
		const month = post.publishedAt.getMonth() + 1;
		let yearGroup = yearGroups.find((group) => group.year === year);

		if (!yearGroup) {
			yearGroup = {
				year,
				id: `year-${year}`,
				postCount: 0,
				months: [],
			};
			yearGroups.push(yearGroup);
		}

		let monthGroup = yearGroup.months.find((group) => group.month === month);

		if (!monthGroup) {
			monthGroup = {
				key: `${year}-${padNumber(month)}`,
				year,
				month,
				label: formatPostMonth(month),
				posts: [],
			};
			yearGroup.months.push(monthGroup);
		}

		monthGroup.posts.push(post);
		yearGroup.postCount += 1;
	}

	return yearGroups;
}

export function getSelectedCategoryId(value: string | null): BlogCategoryId | undefined {
	if (!isBlogCategoryId(value)) {
		return undefined;
	}

	return value;
}

export function formatPostDate(date: Date): string {
	return `${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

export function formatFullDate(date: Date): string {
	return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

export function formatPostMonth(month: number): string {
	return `${padNumber(month)} 月`;
}

function padNumber(value: number): string {
	return String(value).padStart(2, '0');
}

function compareSeriesPosts(current: PostListItem, next: PostListItem): number {
	const currentOrder = current.seriesOrder ?? Number.POSITIVE_INFINITY;
	const nextOrder = next.seriesOrder ?? Number.POSITIVE_INFINITY;

	if (currentOrder !== nextOrder) {
		return currentOrder - nextOrder;
	}

	if (current.publishedAt.getTime() !== next.publishedAt.getTime()) {
		return current.publishedAt.getTime() - next.publishedAt.getTime();
	}

	return current.title.localeCompare(next.title);
}
