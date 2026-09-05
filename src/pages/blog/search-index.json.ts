import { getCollection } from 'astro:content';
import { toPostListItem } from '../../lib/blogPosts';
import { searchBody, type SearchPost } from '../../lib/blogSearch';
import { BLOG_SERIES } from '../../config/content/blogSeries';

export const prerender = true;
export async function GET() {
	const entries = (await getCollection('posts')).filter(entry => !entry.data.draft);
	entries.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
	const index: SearchPost[] = entries.map(entry => {
		const post = toPostListItem(entry);
		return { href: post.href, title: post.title, description: post.excerpt, category: post.categoryTitle,
			tags: post.tags, series: BLOG_SERIES.find(series => series.id === post.series)?.title ?? '', body: searchBody(entry.body ?? '') };
	});
	return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
