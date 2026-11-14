import { EBOOKS_PAGE_SIZE, LIBRARY_CLASSES } from '../../config/library';

export function ebookShelfHref(page = 1, category?: string): string {
	const base = category ? `/ebooks/clc/${encodeURIComponent(category)}/` : '/ebooks/';
	return page === 1 ? base : `${base}page/${page}/`;
}

export function paginateShelf<T>(books: T[], page = 1, pageSize = EBOOKS_PAGE_SIZE) {
	if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) throw new Error('Invalid shelf page');
	const pageCount = Math.max(1, Math.ceil(books.length / pageSize));
	if (page > pageCount) throw new Error('Shelf page does not exist');
	return { items: books.slice((page - 1) * pageSize, page * pageSize), pageCount, total: books.length };
}

export function shelfCategories<T extends { clcCode?: string }>(books: T[]) {
	return Object.entries(LIBRARY_CLASSES).flatMap(([code, label]) => {
		const count = books.filter(book => book.clcCode?.startsWith(code)).length;
		return count ? [{ code, label, count }] : [];
	});
}
