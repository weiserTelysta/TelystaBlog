import { ARTICLE_PAGE_CONFIG } from '../config/pages/article';
import type PhotoSwipe from 'photoswipe';

let viewer: PhotoSwipe | undefined;
let pending: AbortController | undefined;
let bound = false;

function imageUrl(image: HTMLImageElement) {
	const source = image.currentSrc || image.getAttribute('src');
	if (!source) return undefined;
	try {
		const url = new URL(source, document.baseURI);
		return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
	} catch { return undefined; }
}

async function openImage(image: HTMLImageElement, trigger: HTMLAnchorElement) {
	if (pending || viewer || document.querySelector('.pswp, dialog[open]')) return;
	const request = new AbortController();
	pending = request;
	trigger.setAttribute('aria-busy', 'true');
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape') request.abort();
	}, { signal: request.signal });
	try {
		const { openArticleImage } = await import('../components/article/articleImageViewer');
		if (request.signal.aborted || !trigger.isConnected) return;
		viewer = openArticleImage(image, trigger, () => { viewer = undefined; });
	} catch {
		// Keep the ordinary image link usable if the optional viewer chunk fails.
		if (!request.signal.aborted && trigger.isConnected) window.location.assign(trigger.href);
	} finally {
		request.abort();
		trigger.removeAttribute('aria-busy');
		if (pending === request) pending = undefined;
	}
}

export function initArticleImageRuntime() {
	document.querySelectorAll<HTMLImageElement>('[data-article-content] img').forEach(image => {
		// Author-defined links and controls own their interaction.
		if (image.closest('a, button, [role="button"], [data-no-lightbox]')) return;
		const src = imageUrl(image);
		if (!src) return;
		const trigger = document.createElement('a');
		trigger.className = 'article-image-link';
		trigger.href = src;
		trigger.setAttribute('aria-haspopup', 'dialog');
		trigger.setAttribute('aria-label', `${ARTICLE_PAGE_CONFIG.imageViewer.openLabel}${image.alt ? `：${image.alt}` : ''}`);
		const visual = image.closest('picture') ?? image;
		visual.before(trigger);
		trigger.append(visual);
		image.addEventListener('load', () => { trigger.href = imageUrl(image) ?? trigger.href; });
		trigger.addEventListener('click', event => {
			// Modified clicks retain browser open-in-new-tab behavior. An unloaded or
			// broken image follows the native link rather than opening an empty modal.
			trigger.href = imageUrl(image) ?? trigger.href;
			if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
				|| !image.complete || !image.naturalWidth || !image.naturalHeight) return;
			event.preventDefault();
			void openImage(image, trigger);
		});
	});
}

export function bindArticleImageRuntime() {
	if (bound) return;
	bound = true;
	document.addEventListener('astro:page-load', initArticleImageRuntime);
	document.addEventListener('astro:before-swap', () => {
		pending?.abort();
		pending = undefined;
		viewer?.destroy();
		viewer = undefined;
	});
}
