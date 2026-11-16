import { MOBI } from '../../vendor/foliate/mobi.js';
import { createEpubSanitizer } from './readerSanitizer';
import {
	bindReaderNavigation,
	type ReaderCallbacks,
	type ReaderOutlineItem,
	type ReaderView
} from './readerTypes';

type Toc = { label: string; href: string; subitems?: Toc[] };
type KindleBook = {
	sections: { linear?: string; load?: () => Promise<string> }[];
	toc?: Toc[];
	loadResource: (...args: unknown[]) => Promise<string>;
	resolveHref: (
		href: string
	) =>
		| Promise<{ index: number; anchor?: (doc: Document) => Element | null }>
		| { index: number; anchor?: (doc: Document) => Element | null };
	destroy: () => void;
};
async function unzlib(data: Uint8Array<ArrayBuffer>) {
	return new Uint8Array(
		await new Response(
			new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'))
		).arrayBuffer()
	);
}
/** Foliate parses the original MOBI/KF8; this adapter owns safe, paginated HTML views. */
export async function openKindleReader(
	data: Blob,
	stage: HTMLElement,
	callbacks: ReaderCallbacks,
	signal: AbortSignal
): Promise<ReaderView> {
	const book = (await new MOBI({ unzlib }).open(data)) as unknown as KindleBook;
	let disposed = false,
		section = 0,
		page = 0,
		pages = 1,
		font = 18,
		pending = 0,
		frame: HTMLIFrameElement | undefined;
	let contentEvents: AbortController | undefined;
	const resources = new Set<string>();
	const loadResource = book.loadResource.bind(book);
	book.loadResource = async (...args) => {
		const url = await loadResource(...args);
		if (typeof url === 'string') resources.add(url);
		return url;
	};
	const linear = book.sections
		.map((item, index) => (item.linear !== 'no' && item.load ? index : -1))
		.filter((index) => index >= 0);
	if (!linear.length) {
		book.destroy();
		throw new Error('This book has no readable sections');
	}
	function stop() {
		if (disposed) return;
		disposed = true;
		pending++;
		contentEvents?.abort();
		frame?.remove();
		book.destroy();
		for (const url of resources) URL.revokeObjectURL(url);
		signal.removeEventListener('abort', stop);
	}
	signal.addEventListener('abort', stop, { once: true });
	if (signal.aborted) {
		stop();
		throw new DOMException('Cancelled', 'AbortError');
	}
	const width = () => Math.max(1, stage.clientWidth);
	function update() {
		const doc = frame?.contentDocument;
		if (!doc || disposed) return;
		const index = linear.indexOf(section),
			atEnd = index === linear.length - 1 && page === pages - 1;
		doc.documentElement.scrollLeft = page * width();
		callbacks.progress({
			current: index + 1,
			total: linear.length,
			href: String(section),
			label: `${index + 1} / ${linear.length} · ${page + 1} / ${pages}`,
			isFirst: index === 0 && page === 0,
			isLast: atEnd
		});
	}
	function measure(ratio = 0) {
		const doc = frame?.contentDocument;
		if (!doc || disposed) return;
		doc.documentElement.scrollLeft = 0;
		const columns = width() >= 960 ? 2 : 1;
		doc.body.style.setProperty('--reader-columns', String(columns));
		doc.body.style.setProperty('--reader-font', font + 'px');
		pages = Math.max(
			1,
			Math.ceil((doc.documentElement.scrollWidth - 1) / width())
		);
		page = Math.max(0, Math.min(pages - 1, Math.round(ratio * (pages - 1))));
		update();
	}
	async function display(
		index: number,
		last = false,
		anchor?: (doc: Document) => Element | null
	) {
		const ticket = ++pending;
		const url = await book.sections[index].load!();
		if (disposed || ticket !== pending) return;
		const response = await fetch(url, { signal });
		const source = await response.text();
		if (disposed || ticket !== pending) return;
		const sanitize = createEpubSanitizer([...resources]);
		const parsed = new DOMParser().parseFromString(
			sanitize(source),
			'text/html'
		);
		const style = parsed.createElement('style'),
			palette = getComputedStyle(stage);
		style.textContent = `html{height:100%;overflow:hidden!important;scroll-behavior:auto!important}body{margin:0!important;padding:28px!important;box-sizing:border-box!important;width:100vw!important;height:100vh!important;column-count:var(--reader-columns,1)!important;column-gap:56px!important;column-fill:auto!important;overflow:visible!important;line-height:1.9!important;font-size:var(--reader-font,18px)!important;color:${palette.getPropertyValue('--color-text').trim()}!important;background:${palette.getPropertyValue('--color-background-soft').trim()}!important;font-family:system-ui,sans-serif!important}p,li,blockquote{max-width:66ch}img,svg{max-width:100%!important;max-height:calc(100vh - 56px)!important;object-fit:contain!important}h1,h2,h3{break-after:avoid}table,pre{max-width:100%;overflow:auto}a{color:${palette.getPropertyValue('--color-accent').trim()}}`;
		parsed.head.append(style);
		// DOMPurify rejects parser-internal schemes. Reconnect only links resolved by this book.
		const before = new DOMParser().parseFromString(source, 'text/html');
		const originals = Array.from(before.querySelectorAll('a')).map(
			(a) => a.getAttribute('href') || ''
		);
		const anchors = Array.from(parsed.querySelectorAll('a'));
		for (const [i, a] of anchors.entries())
			if (/^(filepos:|kindle:)/i.test(originals[i] || ''))
				a.dataset.kindleHref = originals[i];
		const nextFrame = document.createElement('iframe');
		nextFrame.title = 'Book pages';
		nextFrame.setAttribute('sandbox', 'allow-same-origin');
		nextFrame.referrerPolicy = 'no-referrer';
		const loaded = new Promise<void>((resolve, reject) => {
			const cancelled = () =>
				reject(new DOMException('Cancelled', 'AbortError'));
			signal.addEventListener('abort', cancelled, { once: true });
			nextFrame.addEventListener(
				'load',
				() => {
					signal.removeEventListener('abort', cancelled);
					resolve();
				},
				{ once: true }
			);
		});
		nextFrame.srcdoc = '<!DOCTYPE html>' + parsed.documentElement.outerHTML;
		contentEvents?.abort();
		frame?.remove();
		frame = nextFrame;
		stage.replaceChildren(frame);
		section = index;
		await loaded;
		if (disposed || ticket !== pending) return;
		const doc = frame.contentDocument!;
		await doc.fonts.ready;
		await Promise.all(
			Array.from(doc.images, (img) =>
				img.complete
					? undefined
					: new Promise<void>((resolve) => {
							img.addEventListener('load', () => resolve(), { once: true });
							img.addEventListener('error', () => resolve(), { once: true });
						})
			)
		);
		if (disposed || ticket !== pending) return;
		contentEvents = new AbortController();
		bindReaderNavigation(doc, callbacks, contentEvents.signal);
		doc.addEventListener(
			'click',
			(event) => {
				const a = (event.target as Element).closest('a');
				if (!a) return;
				event.preventDefault();
				const href =
					(a as HTMLElement).dataset.kindleHref || a.getAttribute('href') || '';
				if (/^(filepos:|kindle:)/i.test(href)) void go(href);
				else if (href.startsWith('#'))
					jump(doc.getElementById(decodeURIComponent(href.slice(1))));
			},
			{ signal: contentEvents.signal }
		);
		measure(last ? 1 : 0);
		if (anchor) jump(anchor(doc));
	}
	function jump(target: Element | null | undefined) {
		if (!target || !frame) return;
		const x =
			target.getBoundingClientRect().left +
			frame.contentDocument!.documentElement.scrollLeft;
		page = Math.max(0, Math.min(pages - 1, Math.floor(x / width())));
		update();
	}
	async function go(href: string) {
		const destination = await book.resolveHref(href);
		if (!destination || !linear.includes(destination.index)) return;
		if (destination.index === section)
			jump(destination.anchor?.(frame!.contentDocument!));
		else await display(destination.index, false, destination.anchor);
	}
	function outline(items: Toc[]): ReaderOutlineItem[] {
		return items.map((item) => ({
			label: item.label || 'Chapter',
			href: item.href,
			go: () => go(item.href),
			children: outline(item.subitems || [])
		}));
	}
	callbacks.outline(
		book.toc?.length
			? outline(book.toc)
			: linear.map((index, n) => ({
					label: `Chapter ${n + 1}`,
					href: String(index),
					go: () => display(index)
				}))
	);
	await display(linear[0]);
	return {
		async previous() {
			if (page > 0) {
				page--;
				update();
			} else {
				const index = linear.indexOf(section);
				if (index > 0) await display(linear[index - 1], true);
			}
		},
		async next() {
			if (page < pages - 1) {
				page++;
				update();
			} else {
				const index = linear.indexOf(section);
				if (index < linear.length - 1) await display(linear[index + 1]);
			}
		},
		async smaller() {
			const ratio = pages > 1 ? page / (pages - 1) : 0;
			font = Math.max(14, font - 2);
			measure(ratio);
		},
		async larger() {
			const ratio = pages > 1 ? page / (pages - 1) : 0;
			font = Math.min(32, font + 2);
			measure(ratio);
		},
		resize() {
			measure(pages > 1 ? page / (pages - 1) : 0);
		},
		destroy: stop
	};
}
