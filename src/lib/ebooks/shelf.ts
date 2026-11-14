import { EBOOKS_PAGE_SIZE, LIBRARY_CLASSES } from '../../config/library';

type ShelfBook = { clcCode?: string; clcName?: string; categoryOnly?: boolean };
export function booksInCategory<T extends ShelfBook>(books: T[], category?: string, booklist?: string): T[] {
	if (booklist) return books.filter(book => book.clcCode === booklist);
	return books.filter(book => !book.categoryOnly && (!category || book.clcCode?.startsWith(category)));
}

export function filterShelf<T extends ShelfBook & { title: string; authors: string[]; files: { format: string }[] }>(books: T[], category: string | undefined, query = '', format = '', booklist?: string): T[] {
	const words = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
	return booksInCategory(books, category, booklist).filter(book => {
		const haystack = `${book.title} ${book.authors.join(' ')}`.normalize('NFKC').toLocaleLowerCase();
		return words.every(word => haystack.includes(word)) && (!format || book.files.some(file => file.format === format));
	});
}

/** Include nearby pages and both ends; zero represents an ellipsis. */
export function shelfPageNumbers(page: number, pageCount: number): number[] {
	const numbers = new Set([1, pageCount]);
	for (let i = Math.max(1, page - 2); i <= Math.min(pageCount, page + 2); i++) numbers.add(i);
	const ordered = [...numbers].sort((a, b) => a - b), result: number[] = [];
	for (const n of ordered) {
		const previous = result.at(-1);
		if (previous && n - previous === 2) result.push(previous + 1);
		else if (previous && n - previous > 2) result.push(0);
		result.push(n);
	}
	return result;
}

export function booklistSlug(code: string): string { return code.replaceAll('/', '-'); }

export function shelfBooklists<T extends ShelfBook>(books: T[], category?: string) {
	const codes = new Map<string, { code: string; label: string; count: number; slug: string }>();
	for (const book of books) {
		const code = book.clcCode;
		if (!code || (category && !code.startsWith(category))) continue;
		const item = codes.get(code) || { code, label: book.clcName || code, count: 0, slug: booklistSlug(code) };
		item.count++; codes.set(code, item);
	}
	const result = [...codes.values()].sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }));
	if (new Set(result.map(item => item.slug)).size !== result.length) throw new Error('Booklist URL collision');
	return result;
}

export function ebookShelfHref(page = 1, category?: string, booklist?: string): string {
	const base = booklist ? `/ebooks/booklists/${encodeURIComponent(booklistSlug(booklist))}/` : category ? `/ebooks/clc/${encodeURIComponent(category)}/` : '/ebooks/';
	return page === 1 ? base : `${base}page/${page}/`;
}

export function paginateShelf<T>(books: T[], page = 1, pageSize = EBOOKS_PAGE_SIZE) {
	if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) throw new Error('Invalid shelf page');
	const pageCount = Math.max(1, Math.ceil(books.length / pageSize));
	if (page > pageCount) throw new Error('Shelf page does not exist');
	return { items: books.slice((page - 1) * pageSize, page * pageSize), pageCount, total: books.length };
}

export function shelfCategories<T extends ShelfBook>(books: T[]) {
	const classes = Object.entries(LIBRARY_CLASSES).flatMap(([code, label]) => {
		const count = books.filter(book => book.clcCode?.startsWith(code)).length;
		return count ? [{ code, label, count }] : [];
	});
	return classes;
}
