import { SCROLL_CONFIG } from '../config/interactions/scroll';

type ScrollTarget = number | string | HTMLElement;
type ScrollOptions = { offset?: number; immediate?: boolean };

let lockCount = 0;

export function lockPageScroll() {
	if (lockCount++ === 0) {
		// Cancel an in-flight anchor animation before a dialog takes focus.
		window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'instant' });
		document.documentElement.classList.add('is-page-scroll-locked');
	}
}

export function unlockPageScroll() {
	lockCount = Math.max(0, lockCount - 1);
	if (lockCount === 0) document.documentElement.classList.remove('is-page-scroll-locked');
}

export function scrollToTop() {
	scrollToTarget(0);
}

export function scrollToTarget(target: ScrollTarget, options: ScrollOptions = {}) {
	if (lockCount > 0) return;
	let top: number;
	if (typeof target === 'number') {
		top = target;
	} else {
		const element = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
		if (!element) return;
		top = element.getBoundingClientRect().top + window.scrollY;
	}
	const immediate = options.immediate || !SCROLL_CONFIG.smoothNavigation
		|| window.matchMedia(SCROLL_CONFIG.reducedMotionQuery).matches;
	window.scrollTo({ top: top + (options.offset ?? 0), behavior: immediate ? 'instant' : 'smooth' });
}
