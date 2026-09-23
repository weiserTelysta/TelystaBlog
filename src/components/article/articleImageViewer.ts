import PhotoSwipe from 'photoswipe';
import { ARTICLE_PAGE_CONFIG } from '../../config/pages/article';
import { startSmoothScroll, stopSmoothScroll } from '../../lib/scrollRuntime';

export function openArticleImage(image: HTMLImageElement, trigger: HTMLAnchorElement, onDestroy: () => void) {
	const copy = ARTICLE_PAGE_CONFIG.imageViewer;
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const viewer = new PhotoSwipe({
		dataSource: [{ src: image.currentSrc || image.src, width: image.naturalWidth, height: image.naturalHeight, alt: image.alt }],
		mainClass: 'article-lightbox', bgOpacity: 0.96,
		showHideAnimationType: 'fade', showAnimationDuration: reduced ? 0 : 180,
		hideAnimationDuration: reduced ? 0 : 160, zoomAnimationDuration: reduced ? 0 : 180,
		paddingFn: viewport => ({ top: 60, bottom: 24, left: viewport.x < 640 ? 12 : 32, right: viewport.x < 640 ? 12 : 32 }),
		counter: false, arrowPrev: false, arrowNext: false, loop: false,
		closeTitle: copy.closeLabel, zoomTitle: copy.zoomLabel, errorMsg: copy.errorLabel,
		wheelToZoom: true, imageClickAction: 'zoom', doubleTapAction: 'zoom',
		clickToCloseNonZoomable: false, returnFocus: false, escKey: false,
	});
	const abort = new AbortController();
	let originalOverflow = '';
	let hadModalClass = false;
	let locked = false;
	let pendingClose = false;
	function closeViewer() {
		if (viewer.opener.isOpening) pendingClose = true;
		else viewer.close();
	}
	viewer.on('afterInit', () => {
		const root = viewer.element!;
		root.setAttribute('aria-label', `${copy.dialogLabel}${image.alt ? `：${image.alt}` : ''}`);
		root.setAttribute('data-scroll-native', '');
		originalOverflow = document.body.style.overflow;
		hadModalClass = document.documentElement.classList.contains('has-modal-open');
		document.body.style.overflow = 'hidden';
		document.documentElement.classList.add('has-modal-open');
		stopSmoothScroll();
		locked = true;
		root.focus({ preventScroll: true });
		root.addEventListener('click', event => {
			if (!(event.target instanceof Element) || !event.target.closest('.pswp__button--close')) return;
			event.stopImmediatePropagation();
			closeViewer();
		}, { capture: true, signal: abort.signal });
		// PhotoSwipe binds its keys after opening; accept Escape even during fade-in.
		document.addEventListener('keydown', event => {
			if (event.key === 'Tab') {
				// Keep Tab inside the dialog even when the last control is also
				// the last focusable element in the document (browser chrome boundary).
				const controls = [...root.querySelectorAll<HTMLButtonElement>('button:not([disabled])')]
					.filter(button => button.getClientRects().length > 0);
				if (!controls.length) return;
				const current = controls.indexOf(document.activeElement as HTMLButtonElement);
				const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0)
					: (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
				event.preventDefault();
				controls[next].focus();
				return;
			}
			if (event.key !== 'Escape') return;
			event.preventDefault();
			event.stopImmediatePropagation();
			closeViewer();
		}, { capture: true, signal: abort.signal });
	});
	viewer.on('openingAnimationEnd', () => {
		if (pendingClose) queueMicrotask(() => { if (!abort.signal.aborted) viewer.close(); });
	});
	viewer.on('destroy', () => {
		abort.abort();
		if (locked) {
			document.body.style.overflow = originalOverflow;
			if (!hadModalClass) document.documentElement.classList.remove('has-modal-open');
			startSmoothScroll();
		}
		if (trigger.isConnected) trigger.focus({ preventScroll: true });
		onDestroy();
	});
	try { viewer.init(); } catch (error) { viewer.destroy(); throw error; }
	return viewer;
}
