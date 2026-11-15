import { checkLibrarySession, getLibraryCatalog, isLibraryUnlocked, type LibraryBook } from './libraryAccess';
import { EBOOKS_PAGE_SIZE } from '../../config/library';
import { booksInCategory, ebookShelfHref, filterShelf, paginateShelf, shelfBooklists, shelfCategories, shelfPageNumbers } from './shelf';

type SearchBook = LibraryBook;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') {
	const node = document.createElement(tag);
	node.className = className;
	node.textContent = text;
	return node;
}

function bookCard(book: SearchBook) {
	const item = element('li'), article = element('article', 'ebook-card');
	const cover = element('a', 'ebook-card__cover');
	cover.href = book.href; cover.tabIndex = -1; cover.setAttribute('aria-hidden', 'true');
	if (book.cover) {
		const image = element('img'); image.src = book.cover; image.alt = ''; image.width = 160; image.height = 240; image.loading = 'lazy'; image.decoding = 'async'; cover.append(image);
	} else cover.append(element('span', 'ebook-cover-placeholder', book.title));
	const copy = element('div', 'ebook-card__copy'), title = element('h2'), link = element('a', '', book.title);
	link.href = book.href; link.title = book.title; title.append(link);
	const authors = element('p', 'ebook-card__authors', book.authors.join('、') + (book.authorStatus === 'partial-collection' ? ' 等' : ''));
	authors.title = authors.textContent || '';
	const formats = element('ul', 'ebook-formats'); formats.setAttribute('aria-label', `${book.title}的格式`);
	for (const file of book.files) {
		const li = element('li'), a = element('a', '', file.format);
		a.href = file.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.download = ''; a.setAttribute('aria-label', `下载 ${book.title}（${file.format}）`); li.append(a); formats.append(li);
	}
	copy.append(title, authors, formats); article.append(cover, copy); item.append(article);
	return item;
}

export function initEbookShelf() {
	const root = document.querySelector<HTMLElement>('[data-ebook-shelf]');
	if (!root) return;
	const form = root.querySelector<HTMLFormElement>('[data-shelf-search]')!;
	const query = form.elements.namedItem('q') as HTMLInputElement;
	const format = form.elements.namedItem('format') as RadioNodeList;
	const formatPicker = form.querySelector<HTMLDetailsElement>('[data-format-picker]')!;
	const formatTrigger = formatPicker.querySelector<HTMLElement>('summary')!;
	const formatLabel = formatPicker.querySelector<HTMLElement>('[data-format-label]')!;
	const formatMenu = formatPicker.querySelector<HTMLElement>('.ebook-format-menu')!;
	const clear = form.querySelector<HTMLButtonElement>('[data-search-clear]')!;
	const grid = root.querySelector<HTMLElement>('[data-shelf-grid]')!;
	const empty = root.querySelector<HTMLElement>('[data-shelf-empty]')!;
	const status = root.querySelector<HTMLElement>('[data-search-status]')!;
	const pager = root.querySelector<HTMLElement>('[data-shelf-pagination]')!;
	const category = root.dataset.category || undefined;
	const booklist = root.dataset.booklist || undefined;
	let currentPage = Number(root.dataset.page) || 1, currentPageCount = 1, revision = 0;
	let index: Promise<SearchBook[]> | undefined;
	let timer: ReturnType<typeof setTimeout>;
	form.hidden = false;
	root.querySelectorAll<HTMLElement>('[data-page-jump]').forEach(node => { node.hidden = false; });
	const isFiltering = () => !!(query.value.trim() || format.value);
	const filteredHref = (page: number) => {
		if (!isFiltering()) return ebookShelfHref(page, category, booklist);
		const params = new URLSearchParams();
		if (query.value.trim()) params.set('q', query.value.trim());
		if (format.value) params.set('format', format.value);
		if (page > 1) params.set('page', String(page));
		return `${ebookShelfHref(1, category, booklist)}?${params}`;
	};
	function pageLink(page: number, label: string, numbered = false) {
		const link = element('a', '', label); link.href = filteredHref(page);
		if (isFiltering()) link.dataset.filterPage = String(page);
		if (numbered) link.setAttribute('aria-label', `第 ${page} 页`);
		return link;
	}
	function renderPager(page: number, pageCount: number, total: number) {
		currentPage = page; currentPageCount = pageCount;
		const links = element('div', 'ebook-pagination__links'), numbers = element('div', 'ebook-pagination__numbers');
		const previous = page > 1 ? pageLink(page - 1, '← 上一页') : element('span', '', '← 上一页');
		if (page === 1) previous.setAttribute('aria-disabled', 'true'); else previous.setAttribute('rel', 'prev');
		for (const n of shelfPageNumbers(page, pageCount)) {
			if (n === 0) { const ellipsis = element('span', '', '…'); ellipsis.setAttribute('aria-hidden', 'true'); numbers.append(ellipsis); }
			else if (n === page) { const active = element('span', '', String(n)); active.setAttribute('aria-current', 'page'); active.setAttribute('aria-label', `第 ${n} 页`); numbers.append(active); }
			else numbers.append(pageLink(n, String(n), true));
		}
		const next = page < pageCount ? pageLink(page + 1, '下一页 →') : element('span', '', '下一页 →');
		if (page === pageCount) next.setAttribute('aria-disabled', 'true'); else next.setAttribute('rel', 'next');
		links.append(previous, numbers, next);
		const meta = element('div', 'ebook-pagination__meta'); meta.append(element('span', '', `${page} / ${pageCount} · 共 ${total} 份藏书`));
		const jump = element('form', 'ebook-page-jump'); jump.dataset.pageJump = '';
		const label = element('label', '', '跳转至 '), input = element('input'); input.type = 'number'; input.name = 'page'; input.min = '1'; input.max = String(pageCount); input.value = String(page); input.required = true; input.setAttribute('aria-label', '跳转页码');
		label.append(input, ' 页'); const button = element('button', '', '前往'); button.type = 'submit'; jump.append(label, button); meta.append(jump);
		pager.replaceChildren(links, meta);
	}
	async function apply(page = 1, historyMode: 'replace' | 'push' | 'none' = 'replace', scroll = false) {
		const request = ++revision, value = query.value, selectedFormat = format.value;
		clear.hidden = !isFiltering(); formatLabel.textContent = format.value || '全部格式';
		status.classList.add('ebook-sr-only'); status.textContent = '正在查找藏书…';
		grid.setAttribute('aria-busy', 'true');
		try {
			index ||= getLibraryCatalog().catch(error => { index = undefined; throw error; });
			const books = await index;
			if (request !== revision) return;
			const matches = filterShelf(books, category, value, selectedFormat, booklist, isLibraryUnlocked());
			const count = Math.max(1, Math.ceil(matches.length / EBOOKS_PAGE_SIZE));
			const result = paginateShelf(matches, Math.min(Math.max(1, page), count));
			grid.replaceChildren(...result.items.map(bookCard)); empty.textContent = '没有找到匹配的藏书。'; empty.hidden = matches.length > 0;
			renderPager(Math.min(Math.max(1, page), count), count, matches.length);
			status.textContent = `找到 ${matches.length} 份藏书，第 ${currentPage} 页。`;
			renderNavigation(books);
			if (historyMode !== 'none') history[historyMode === 'push' ? 'pushState' : 'replaceState'](null, '', filteredHref(currentPage));
			if (scroll) grid.scrollIntoView({ block: 'start', behavior: 'instant' });
		} catch {
			if (request !== revision) return;
			status.classList.remove('ebook-sr-only'); status.textContent = '搜索暂时无法加载，请重试；仍可通过分类和页码浏览。';
		} finally { if (request === revision) grid.removeAttribute('aria-busy'); }
	}
	function renderNavigation(books: SearchBook[]) {
		const nav = root!.querySelector<HTMLElement>('.ebook-classification nav');
		if (nav) {
			const all = element('a', '', `全部藏书 ${booksInCategory(books, undefined, undefined, isLibraryUnlocked()).length}`); all.href = '/ebooks/'; if (!category && !booklist) all.setAttribute('aria-current', 'page');
			nav.replaceChildren(all, ...shelfCategories(books).map(item => { const a = element('a', '', `${item.code} · ${item.label} ${item.count}`); a.href = ebookShelfHref(1, item.code); if (!booklist && item.code === category) a.setAttribute('aria-current', 'page'); return a; }));
		}
		const lists = root!.querySelector<HTMLElement>('.ebook-booklists nav');
		if (lists && category) lists.replaceChildren(...shelfBooklists(books, category).map(list => {
			const a = element('a', 'ebook-booklist'); a.href = ebookShelfHref(1, undefined, list.code);
			const folder = element('span', 'ebook-booklist__folder'); folder.setAttribute('aria-hidden', 'true');
			for (const book of books.filter(book => book.clcCode === list.code && book.cover && (isLibraryUnlocked() || !book.categoryOnly)).slice(0, 2)) { const image = element('img'); image.src = book.cover!; image.alt = ''; image.width = 60; image.height = 90; image.loading = 'lazy'; folder.append(image); }
			folder.append(element('span', '', list.code)); const label = element('span', '', list.label); label.append(element('small', '', `${list.code} · ${list.count} 份`)); a.append(folder, label); return a;
		}));
	}
	form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); void apply(); });
	query.addEventListener('input', () => { clearTimeout(timer); ++revision; timer = setTimeout(() => { void apply(); }, 180); });
	formatPicker.addEventListener('change', () => {
		clearTimeout(timer); formatLabel.textContent = format.value || '全部格式';
		formatPicker.open = false; formatTrigger.focus(); void apply();
	});
	document.addEventListener('pointerdown', event => { if (!formatPicker.contains(event.target as Node)) formatPicker.open = false; });
	formatPicker.addEventListener('keydown', event => {
		if (event.key === 'Escape' && formatPicker.open) { event.preventDefault(); event.stopPropagation(); formatPicker.open = false; formatTrigger.focus(); }
	});
	formatPicker.addEventListener('focusout', event => {
		if (event.relatedTarget instanceof Node && !formatPicker.contains(event.relatedTarget)) formatPicker.open = false;
	});
	function positionFormatMenu() {
		if (!formatPicker.open) return;
		const trigger = formatTrigger.getBoundingClientRect(), menu = formatMenu.getBoundingClientRect();
		formatMenu.style.position = 'fixed';
		formatMenu.style.right = 'auto';
		formatMenu.style.left = `${Math.max(8, Math.min(trigger.right - menu.width, innerWidth - menu.width - 8))}px`;
		formatMenu.style.top = `${Math.max(8, Math.min(trigger.bottom + 10, innerHeight - menu.height - 8))}px`;
	}
	formatPicker.addEventListener('toggle', positionFormatMenu);
	window.addEventListener('resize', positionFormatMenu);
	window.addEventListener('scroll', positionFormatMenu, { passive: true });
	clear.addEventListener('click', () => { clearTimeout(timer); query.value = ''; format.value = ''; void apply(); query.focus(); });
	pager.addEventListener('click', event => {
		const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-filter-page]');
		if (!link || (event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey || (event as MouseEvent).shiftKey || (event as MouseEvent).altKey || (event as MouseEvent).button !== 0) return;
		event.preventDefault(); void apply(Number(link.dataset.filterPage), 'push', true);
	});
	pager.addEventListener('submit', event => {
		const jump = (event.target as HTMLElement).closest<HTMLFormElement>('[data-page-jump]');
		if (!jump) return;
		event.preventDefault(); const input = jump.elements.namedItem('page') as HTMLInputElement;
		const requested = Number(input.value);
		const max = index ? currentPageCount : Number(input.max);
		if (!Number.isInteger(requested) || requested < 1 || requested > max) return;
		if (isFiltering()) void apply(requested, 'push', true);
		else location.assign(ebookShelfHref(requested, category, booklist));
	});
	function restoreFromUrl() {
		const params = new URLSearchParams(location.search); query.value = params.get('q') || '';
		const selectedFormat = params.get('format') || '';
		format.value = ['', 'PDF', 'EPUB', 'MOBI', 'AZW3'].includes(selectedFormat) ? selectedFormat : '';
		formatLabel.textContent = format.value || '全部格式';
		const page = Math.max(1, Math.trunc(Number(params.get('page')) || Number(location.pathname.match(/\/page\/(\d+)\/$/)?.[1]) || 1));
		if (isFiltering() || index) void apply(page, 'none');
	}
	window.addEventListener('popstate', restoreFromUrl);
	window.addEventListener('library-access-change', () => { index = undefined; void apply(currentPage, 'none'); });
	void checkLibrarySession();
	restoreFromUrl();
}
