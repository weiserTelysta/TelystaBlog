import { checkLibrarySession, getLibraryCatalog, isLibraryUnlocked } from './libraryAccess';
import { bindReaderNavigation, type ReaderCallbacks, type ReaderView } from './readerTypes';
import { createReaderContents } from './readerContents';
import { pdfPreviewHref, REFLOW_FORMATS } from './readerLinks';

export function initLibraryReader() {
	const root = document.querySelector<HTMLElement>('[data-library-reader]');
	if (!root) return;
	const surface = root.querySelector<HTMLElement>('[data-reader-surface]')!, state = root.querySelector<HTMLElement>('[data-reader-state]')!, title = root.querySelector<HTMLElement>('[data-reader-title]')!;
	const formats = root.querySelector<HTMLElement>('[data-reader-formats]')!, unlock = root.querySelector<HTMLElement>('[data-library-access-help]')!, tools = root.querySelector<HTMLElement>('[data-reader-tools]')!;
	const message = root.querySelector<HTMLElement>('[data-reader-message]')!;
	const previous = root.querySelector<HTMLButtonElement>('[data-reader-prev]')!, next = root.querySelector<HTMLButtonElement>('[data-reader-next]')!, contents = root.querySelector<HTMLButtonElement>('[data-reader-toc]')!;
	const progress = root.querySelector<HTMLElement>('[data-reader-progress]')!, pageForm = root.querySelector<HTMLFormElement>('[data-reader-page-form]')!, pageInput = pageForm.elements.namedItem('page') as HTMLInputElement;
	const total = root.querySelector<HTMLElement>('[data-reader-total]')!;
	const params = new URLSearchParams(location.search), id = params.get('book');
	let view: ReaderView | undefined, abort: AbortController | undefined, revision = 0, busy = false, resizeFrame = 0, lastSize = '';
	const outline = createReaderContents(root, run => { void action(run); });
	const observer = new ResizeObserver(([entry]) => {
		const size = `${entry.contentRect.width}:${entry.contentRect.height}`;
		if (!view || surface.hidden || size === lastSize) return;
		lastSize = size; cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => view?.resize());
	});
	observer.observe(surface);
	function clear() {
		revision++; view?.destroy(); view = undefined; abort?.abort(); abort = undefined;
		cancelAnimationFrame(resizeFrame); lastSize = ''; busy = false;
		surface.replaceChildren(); surface.hidden = true; tools.hidden = true; outline.clear(); title.removeAttribute('title'); message.hidden = false;
		progress.textContent = ''; pageForm.hidden = true; previous.disabled = next.disabled = contents.disabled = true;
	}
	async function action(run: () => Promise<void> | undefined) {
		if (busy || !view) return;
		busy = true;
		try { await run(); } catch { state.textContent = '暂时无法打开这一页，请重试。'; state.hidden = false; message.hidden = false; }
		finally { busy = false; }
	}
	function navigation(direction: 'previous' | 'next') {
		if (outline.modal() || (direction === 'previous' ? previous : next).disabled) return;
		void action(() => view?.[direction]());
	}
	async function open(format?: string) {
		clear(); const request = revision; title.textContent = '在线阅览'; formats.replaceChildren(); state.hidden = false; unlock.hidden = true;
		if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) { state.textContent = '请选择一本书进入阅览。'; return; }
		state.textContent = '正在读取书目…';
		try {
			const record = (await getLibraryCatalog()).find(item => item.id === id);
			if (request !== revision) return;
			if (!record) { state.textContent = isLibraryUnlocked() ? '未找到这份书目。' : '这份书目暂未向访客开放。'; unlock.hidden = isLibraryUnlocked(); return; }
			title.textContent = record.title; title.title = record.title;
			const supported = record.files.filter(file => ['PDF', ...REFLOW_FORMATS].includes(file.format));
			const file = supported.find(file => file.format === format) || supported[0];
			for (const entry of supported) {
				if (entry.format === 'PDF') { const link = document.createElement('a'); link.href = pdfPreviewHref(entry.href); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'PDF'; link.setAttribute('aria-label', '打开 PDF（新标签页）'); formats.append(link); continue; }
				const button = document.createElement('button'); button.type = 'button'; button.textContent = entry.format; button.setAttribute('aria-label', '阅读 ' + entry.format);
				button.setAttribute('aria-pressed', String(entry === file)); button.addEventListener('click', () => { void open(entry.format); }); formats.append(button);
			}
			if (!file) { state.textContent = '未找到可阅读的书籍文件。'; return; }
			if (file.format === 'PDF') { location.replace(pdfPreviewHref(file.href)); return; }
			params.set('format', file.format); history.replaceState(null, '', `?${params}`);
			surface.hidden = false; surface.dataset.format = file.format; state.textContent = `正在载入 ${file.format}…`; abort = new AbortController();
			const signal = abort.signal;
			const callbacks: ReaderCallbacks = {
				navigate: navigation, escape: () => outline.close(),
				progress: value => { if (request !== revision) return; progress.textContent = value.label; outline.current(value.href); pageInput.value = String(value.current); pageInput.max = String(value.total); total.textContent = `/ ${value.total}`; previous.disabled = value.isFirst; next.disabled = value.isLast; },
				outline: items => { if (request !== revision) return; outline.set(items); },
			};
			{
				const response = await fetch(file.href, { credentials: 'include', signal });
				if (!response.ok) throw new Error('Book unavailable');
				const data = await response.blob();
				if (request !== revision) return;
				const stage = document.createElement('div'); stage.className = 'reader-epub'; surface.append(stage);
				if (file.format === 'EPUB') { const { openEpubReader } = await import('./readerEpub'); if (request !== revision) return; view = await openEpubReader(await data.arrayBuffer(), stage, callbacks, signal); }
				else { const { openKindleReader } = await import('./readerKindle'); if (request !== revision) return; view = await openKindleReader(data, stage, callbacks, signal); }
				progress.hidden = false;
			}
			if (request !== revision) return;
			bindReaderNavigation(surface, callbacks, signal);
			tools.hidden = false; state.hidden = true; message.hidden = true;
		} catch (error) {
			if (request !== revision || (error instanceof DOMException && error.name === 'AbortError')) return;
			abort?.abort(); view = undefined; surface.replaceChildren(); surface.hidden = true; tools.hidden = true;
			state.hidden = false; state.textContent = '暂时无法载入这本书，可以从书目页面下载后阅读。';
		}
	}
	const fullscreen = root.querySelector<HTMLButtonElement>('[data-reader-fullscreen]')!;
	if (!document.fullscreenEnabled) fullscreen.hidden = true;
	fullscreen.addEventListener('click', () => { void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => { fullscreen.title = '浏览器暂不支持全屏；当前已使用完整窗口阅览。'; }); });
	document.addEventListener('fullscreenchange', () => { fullscreen.setAttribute('aria-pressed', String(!!document.fullscreenElement)); fullscreen.querySelector('span')!.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'; });
	previous.addEventListener('click', () => navigation('previous')); next.addEventListener('click', () => navigation('next'));
	root.querySelector('[data-reader-smaller]')!.addEventListener('click', () => { void action(() => view?.smaller()); });
	root.querySelector('[data-reader-larger]')!.addEventListener('click', () => { void action(() => view?.larger()); });
	pageForm.addEventListener('submit', event => { event.preventDefault(); const page = Number(pageInput.value); if (Number.isInteger(page) && page >= 1 && page <= Number(pageInput.max)) void action(() => view?.goToPage?.(page)); });
	document.addEventListener('keydown', event => {
		if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || document.getSelection()?.toString() || (event.target as Element)?.closest('a,button,input,textarea,select,[contenteditable]')) return;
		if (['ArrowLeft', 'PageUp', 'ArrowRight', 'PageDown'].includes(event.key)) { event.preventDefault(); navigation(['ArrowLeft', 'PageUp'].includes(event.key) ? 'previous' : 'next'); }
	});
	window.addEventListener('library-access-change', () => { void open(params.get('format') || undefined); });
	window.addEventListener('pagehide', () => { observer.disconnect(); clear(); });
	window.addEventListener('pageshow', event => { if (event.persisted) { observer.observe(surface); void checkLibrarySession().then(() => open(params.get('format') || undefined)); } });
	void checkLibrarySession().then(() => open(params.get('format') || undefined));
}
