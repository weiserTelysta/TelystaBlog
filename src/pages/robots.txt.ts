import type { APIRoute } from 'astro';
import policy from '../../data/seo/crawler-policy.json';

export const GET: APIRoute = ({ site }) => {
	if (!site) throw new Error('robots.txt requires Astro site configuration.');
	const rules = [
		...policy.blockedBots.map(bot => `User-agent: ${bot}`),
		'Disallow: /', '',
		'User-agent: *', `Content-Signal: ${policy.contentSignal}`,
		'Disallow: /console/', 'Disallow: /telysta-console/', 'Disallow: /ebooks/read/',
		'Allow: /', '', `Sitemap: ${new URL('/sitemap.xml', site).href}`, '',
	];
	return new Response(rules.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
