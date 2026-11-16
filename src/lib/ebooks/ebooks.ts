import { getCollection } from 'astro:content';
import { ebookHref, type EbookData } from './ebookSchema';
import { compareShelfBooks } from './shelf';

export type Ebook = EbookData & { href: string };
export async function getPublishedEbookEntries(options: { includeProtected?: boolean } = {}) {
	const entries = await getCollection('ebooks');
	const ids = new Set<string>();
	for (const entry of entries) {
		if (ids.has(entry.data.id)) throw new Error(`[ebooks] 重复 id：${entry.data.id}`);
		ids.add(entry.data.id);
	}
	return entries.filter(entry => !entry.data.draft && (options.includeProtected || entry.data.access === 'public')).sort((a, b) => compareShelfBooks(a.data, b.data));
}

export function toEbook(data: EbookData): Ebook { return { ...data, href: ebookHref(data.id) }; }
