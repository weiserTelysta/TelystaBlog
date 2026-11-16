import { checkLibrarySession, getLibraryCatalog, isLibraryUnlocked } from './libraryAccess';
import { readingLink } from './readerLinks';
export { readerHref } from './readerLinks';
export function initProtectedBookView() {
	const root = document.querySelector<HTMLElement>('[data-library-book]'); if (!root) return;
	const content = root.querySelector<HTMLElement>('[data-book-content]')!, state = root.querySelector<HTMLElement>('[data-book-state]')!, unlock = root.querySelector<HTMLElement>('[data-library-access-help]')!;
	const lockedTitle = root.querySelector<HTMLElement>('[data-book-lock-title]')!;
	const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => { const node = document.createElement(tag); node.textContent = text; node.className = className; return node; };
	let revision = 0;
	async function render() {
		const request = ++revision;
		content.replaceChildren(); content.hidden = true; state.hidden = false; unlock.hidden = false; lockedTitle.hidden = false;
		if (!isLibraryUnlocked()) { state.textContent = '这份书目暂未向访客开放。'; return; }
		state.textContent = '正在读取书目…';
		try {
			const book = (await getLibraryCatalog()).find(book => book.id === root!.dataset.libraryBook);
			if (request !== revision || !isLibraryUnlocked()) return;
			if (!book) throw new Error('这份书目暂时不可用。');
			const detail = el('div', '', 'ebook-detail');
			if (book.cover) { const img = el('img', '', 'ebook-detail__cover'); img.src = book.cover; img.alt = `${book.title}封面`; img.width = 240; img.height = 360; detail.append(img); }
			else detail.append(el('div', book.title, 'ebook-cover-placeholder ebook-detail__cover'));
			const copy = el('div'), header = el('header', '', 'ebook-header'); header.append(el('h1', book.title));
			const list = el('dl');
			const metadata: Array<[string, string | number | undefined]> = [['作者／编者', book.authors.join('、')], ['译者', book.translator], ['出版社', book.publisher], ['出版年份', book.publicationYear], ['分类', book.clcCode ? `${book.clcCode} · ${book.clcName}` : undefined]];
			for (const [label, value] of metadata) if (value) list.append(el('dt', label), el('dd', String(value)));
			const files = el('ul', '', 'ebook-formats');
			for (const file of book.files) { const li = el('li'), a = el('a', `${file.format}${file.bytes ? ` · ${(file.bytes / 1048576).toFixed(1)} MB` : ''}`); a.href = file.href + (file.href.includes('?') ? '&' : '?') + 'download=1'; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('aria-label', `下载 ${book.title}（${file.format}）`); li.append(a); files.append(li); }
			const reading = el('div', '', 'ebook-reading-links');
			for (const file of book.files) {
				const link = readingLink(book.id, file), a = el('a', link.label); a.href = link.href;
				if (link.target) { a.target = link.target; a.rel = link.rel; }
				reading.append(a);
			}
			copy.append(header, list, reading, el('h2', '下载'), files); detail.append(copy); content.append(detail);
			content.hidden = false; state.hidden = true; unlock.hidden = true; lockedTitle.hidden = true;
		} catch { if (request === revision) state.textContent = '书目暂时无法加载，请稍后重试。'; }
	}
	window.addEventListener('library-access-change', () => { void render(); });
	void checkLibrarySession().then(render);
}
