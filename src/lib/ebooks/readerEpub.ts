import ePub from 'epubjs';
import type Contents from 'epubjs/types/contents';
import type { Location } from 'epubjs/types/rendition';
import { createEpubSanitizer } from './readerSanitizer';
import { bindReaderNavigation, type ReaderCallbacks, type ReaderOutlineItem, type ReaderView } from './readerTypes';

export async function openEpubReader(data: ArrayBuffer, stage: HTMLElement, callbacks: ReaderCallbacks, signal: AbortSignal): Promise<ReaderView> {
	const book = ePub(data);
	let font = 18, disposed = false;
	const abort = new AbortController();
	const stop = () => { if (!disposed) { disposed = true; abort.abort(); book.destroy(); } };
	signal.addEventListener('abort', stop, { once: true });
	await book.opened;
	if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
	const manifest = await book.loaded.manifest;
	const urls = await Promise.all(Object.values(manifest).filter(item => item.type.startsWith('image/') || item.type === 'text/css').map(item => book.resources.get(item.href)));
	if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
	const sanitize = createEpubSanitizer(urls.filter(url => typeof url === 'string'));
	book.spine.hooks.serialize.register((html: string, section: { output: string }) => { section.output = sanitize(section.output || html); });
	const rendition = book.renderTo(stage, { width: '100%', height: '100%', flow: 'paginated', spread: 'auto', minSpreadWidth: 960, allowScriptedContent: false });
	const palette = getComputedStyle(stage);
	rendition.themes.default({
		body: { color: palette.getPropertyValue('--color-text').trim(), background: palette.getPropertyValue('--color-background-soft').trim(), 'line-height': '1.9', 'font-family': palette.fontFamily },
		'p, h1, h2, h3, blockquote, ul, ol': { 'max-width': '66ch', 'margin-left': 'auto', 'margin-right': 'auto' },
		'img, svg': { 'max-width': '100%', 'object-fit': 'contain' },
	});
	rendition.themes.fontSize(font + 'px');
	rendition.hooks.content.register((contents: Contents) => {
		bindReaderNavigation(contents.document, callbacks, abort.signal, stage);
	});
	rendition.on('relocated', (location: Location) => {
		if (disposed) return;
		const total = book.packaging.spine.length || 1, current = location.start.index + 1;
		callbacks.progress({ current, total, href: location.start.href, label: `${current} / ${total} · ${location.start.displayed.page} / ${location.start.displayed.total}`, isFirst: location.atStart, isLast: location.atEnd });
	});
	await rendition.display();
	if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
	void book.loaded.navigation.then(navigation => {
		if (disposed) return;
		function items(entries: typeof navigation.toc): ReaderOutlineItem[] {
			return entries.map(entry => ({ label: entry.label.trim(), href: entry.href, go: () => rendition.display(entry.href), children: items(entry.subitems || []) }));
		}
		callbacks.outline(items(navigation.toc));
	}).catch(() => callbacks.outline([]));
	return {
		previous: () => rendition.prev(), next: () => rendition.next(),
		smaller: async () => { font = Math.max(14, font - 2); rendition.themes.fontSize(font + 'px'); },
		larger: async () => { font = Math.min(32, font + 2); rendition.themes.fontSize(font + 'px'); },
		resize: () => { if (!disposed) rendition.resize(stage.clientWidth, stage.clientHeight); },
		// Book owns the rendition, archive URLs and iframe lifecycle.
		destroy: () => { stop(); signal.removeEventListener('abort', stop); },
	};
}
