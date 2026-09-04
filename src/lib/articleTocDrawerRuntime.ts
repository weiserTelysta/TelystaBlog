import { ARTICLE_PAGE_CONFIG } from '../config/pages/article';
import { startSmoothScroll, stopSmoothScroll } from './scrollRuntime';

type DrawerState = {
	cleanup: () => void;
};

declare global {
	interface Window {
		__telystaArticleTocDrawerRuntimeBound?: boolean;
	}
}

const drawerStates = new WeakMap<HTMLDetailsElement, DrawerState>();
const compactViewport = window.matchMedia(ARTICLE_PAGE_CONFIG.toc.drawer.compactMediaQuery);
let documentScrollLocked = false;

const setDocumentScrollLocked = (locked: boolean) => {
	if (documentScrollLocked === locked) {
		return;
	}

	documentScrollLocked = locked;
	document.documentElement.classList.toggle('is-article-toc-overlay-open', locked);

	if (locked) {
		stopSmoothScroll();
	} else {
		startSmoothScroll();
	}
};

const syncDocumentScrollLock = () => {
	const hasOpenCompactDrawer = compactViewport.matches && Array.from(
		document.querySelectorAll<HTMLDetailsElement>('[data-article-toc-disclosure]'),
	).some((drawer) => drawer.open);

	setDocumentScrollLocked(hasOpenCompactDrawer);
};

const initDrawer = (drawer: HTMLDetailsElement) => {
	if (drawerStates.has(drawer)) {
		return;
	}

	const panel = drawer.querySelector<HTMLElement>('[data-article-toc-panel]');
	const backdrop = drawer.querySelector<HTMLElement>('[data-article-toc-backdrop]');
	const trigger = drawer.querySelector<HTMLElement>('summary');

	if (!panel || !backdrop || !trigger) {
		return;
	}

	drawer.open = false;

	const syncState = () => {
		panel.inert = !drawer.open;
		drawer.dataset.tocState = drawer.open ? 'open' : 'closed';
		syncDocumentScrollLock();
	};
	const closeDrawer = (restoreFocus: boolean) => {
		if (!drawer.open) {
			return;
		}

		drawer.open = false;
		syncState();

		if (restoreFocus) {
			trigger.focus({ preventScroll: true });
		}
	};
	const handleBackdropClick = () => closeDrawer(true);
	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && drawer.open) {
			event.preventDefault();
			closeDrawer(true);
			return;
		}

		if (event.key !== 'Tab' || !drawer.open || !compactViewport.matches) {
			return;
		}

		const focusable = [
			trigger,
			...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
		].filter((element) => !element.inert);
		const first = focusable[0];
		const last = focusable.at(-1);

		if (event.shiftKey && document.activeElement === first && last) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last && first) {
			event.preventDefault();
			first.focus();
		}
	};
	const handleLinkClick = (event: Event) => {
		if (
			compactViewport.matches &&
			event.target instanceof Element &&
			event.target.closest('[data-toc-link]')
		) {
			closeDrawer(false);
		}
	};

	drawer.addEventListener('toggle', syncState);
	backdrop.addEventListener('click', handleBackdropClick);
	panel.addEventListener('click', handleLinkClick, true);
	document.addEventListener('keydown', handleKeydown);
	compactViewport.addEventListener('change', syncState);

	const state: DrawerState = {
		cleanup: () => {
			drawer.removeEventListener('toggle', syncState);
			backdrop.removeEventListener('click', handleBackdropClick);
			panel.removeEventListener('click', handleLinkClick, true);
			document.removeEventListener('keydown', handleKeydown);
			compactViewport.removeEventListener('change', syncState);
			drawer.open = false;
			panel.inert = true;
			drawerStates.delete(drawer);
			syncDocumentScrollLock();
		},
	};

	drawerStates.set(drawer, state);
	syncState();
};

export const initArticleTocDrawerRuntime = () => {
	const drawers = Array.from(
		document.querySelectorAll<HTMLDetailsElement>('[data-article-toc-disclosure]'),
	);

	drawers.forEach(initDrawer);
};

export const bindArticleTocDrawerRuntime = () => {
	if (window.__telystaArticleTocDrawerRuntimeBound) {
		return;
	}

	window.__telystaArticleTocDrawerRuntimeBound = true;
	document.addEventListener('astro:page-load', initArticleTocDrawerRuntime);
	document.addEventListener('astro:before-swap', () => {
		const drawers = Array.from(
			document.querySelectorAll<HTMLDetailsElement>('[data-article-toc-disclosure]'),
		);

		drawers.forEach((drawer) => drawerStates.get(drawer)?.cleanup());
	});
};
