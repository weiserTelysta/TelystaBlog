import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/blogPosts';
import { SITE_CONFIG } from '../config/site';

const xml = (value: string) => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
export const GET: APIRoute = async ({ site }) => {
 if (!site) throw new Error('RSS requires a canonical site URL.');
 const posts = await getPublishedPosts();
 const items = posts.map(post => `<item><title>${xml(post.title)}</title><link>${xml(new URL(post.href,site).href)}</link><guid isPermaLink="true">${xml(new URL(post.href,site).href)}</guid><description>${xml(post.excerpt || post.description)}</description><pubDate>${post.publishedAt.toUTCString()}</pubDate></item>`).join('');
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(SITE_CONFIG.name)}</title><link>${site.href}</link><description>${xml(SITE_CONFIG.defaultDescription)}</description><language>zh-CN</language>${items}</channel></rss>`, { headers: { 'Content-Type':'application/rss+xml; charset=utf-8' } });
};
