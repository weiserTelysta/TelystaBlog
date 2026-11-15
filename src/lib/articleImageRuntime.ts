import { ARTICLE_PAGE_CONFIG } from '../config/pages/article';
import type PhotoSwipe from 'photoswipe';

let viewer: PhotoSwipe | undefined;
let pending: AbortController | undefined;
let bound = false;
const imageTriggers = new WeakSet<HTMLAnchorElement>();

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
		const [{ openArticleImage }, loaded] = await Promise.all([
			import('../components/article/articleImageViewer'),
			waitForImage(image, request.signal),
		]);
		if (request.signal.aborted || !trigger.isConnected) return;
		if (!loaded) {
			trigger.title = ARTICLE_PAGE_CONFIG.imageViewer.errorLabel;
			return;
		}
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

function waitForImage(image: HTMLImageElement, signal: AbortSignal): Promise<boolean> {
	image.loading = 'eager';
	if (image.complete) return Promise.resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
	return new Promise(resolve => {
		const finish = () => {
			image.removeEventListener('load', finish);
			image.removeEventListener('error', finish);
			signal.removeEventListener('abort', finish);
			resolve(!signal.aborted && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
		};
		image.addEventListener('load', finish, { once: true });
		image.addEventListener('error', finish, { once: true });
		signal.addEventListener('abort', finish, { once: true });
		if (signal.aborted || image.complete) finish();
	});
}

function bindImageTrigger(image: HTMLImageElement, trigger: HTMLAnchorElement) {
	if (imageTriggers.has(trigger)) return;
	imageTriggers.add(trigger);
	trigger.setAttribute('aria-haspopup', 'dialog');
	trigger.setAttribute('aria-label', `${ARTICLE_PAGE_CONFIG.imageViewer.openLabel}${image.alt ? `：${image.alt}` : ''}`);
	trigger.addEventListener('click', event => {
		// Modified clicks retain the browser's open-in-new-tab behavior. A normal
		// click stays in the article while a lazy or linked image is loading.
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		void openImage(image, trigger);
	});
}

function directImageLink(trigger: HTMLAnchorElement): string | undefined {
	if (trigger.matches('[download], [target], [data-no-lightbox]') || trigger.closest('[data-no-lightbox]')) return;
	try {
		const url = new URL(trigger.href, document.baseURI);
		if (['http:', 'https:'].includes(url.protocol) && /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname)) return url.href;
	} catch { /* Ordinary article links keep their original behavior. */ }
	return undefined;
}

export function initArticleImageRuntime() {
	document.querySelectorAll<HTMLImageElement>('[data-article-content] img').forEach(image => {
		if (image.closest('button, [role="button"], [data-no-lightbox]')) return;
		const src = imageUrl(image);
		if (!src) return;
		const authorLink = image.closest('a');
		if (authorLink) {
			// Preserve navigation links; explicit links to an image share the viewer.
			const target = directImageLink(authorLink);
			if (target === src) bindImageTrigger(image, authorLink);
			return;
		}
		const trigger = document.createElement('a');
		trigger.className = 'article-image-link';
		trigger.href = src;
		const visual = image.closest('picture') ?? image;
		visual.before(trigger);
		trigger.append(visual);
		image.addEventListener('load', () => { trigger.href = imageUrl(image) ?? trigger.href; });
		bindImageTrigger(image, trigger);
	});
	document.querySelectorAll<HTMLAnchorElement>('[data-article-content] a[href]').forEach(trigger => {
		if (imageTriggers.has(trigger) || trigger.querySelector('img, picture')) return;
		const src = directImageLink(trigger);
		if (!src) return;
		// Fetch only after activation, so a text reference adds no eager image load.
		let linkedImage: HTMLImageElement | undefined;
		trigger.setAttribute('aria-haspopup', 'dialog');
		trigger.addEventListener('click', event => {
			if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
			event.preventDefault();
			if (!linkedImage) {
				linkedImage = new Image();
				linkedImage.alt = trigger.textContent?.trim() || '';
				linkedImage.src = src;
			}
			void openImage(linkedImage, trigger);
		});
		imageTriggers.add(trigger);
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
