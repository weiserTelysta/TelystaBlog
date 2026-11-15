import type { APIRoute } from 'astro';
import { getPublishedEbookEntries, toEbook } from '../../lib/ebooks/ebooks';

export const GET: APIRoute = async () => {
	const books = (await getPublishedEbookEntries()).map(entry => {
		const { id, title, authors, authorStatus, clcCode, clcName, categoryOnly, access, cover, files, href } = toEbook(entry.data);
		return { id, title, authors, authorStatus, clcCode, clcName, categoryOnly, access, cover, files, href };
	});
	return new Response(JSON.stringify(books), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
