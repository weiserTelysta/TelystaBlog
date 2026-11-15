import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
	if (!site) throw new Error('robots.txt requires Astro site configuration.');
	return new Response(`User-agent: *\nAllow: /\nDisallow: /console/\nDisallow: /telysta-console/\nDisallow: /ebooks/read/\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
