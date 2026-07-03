import type { LenisOptions } from 'lenis';

export const SCROLL_PREVENT_ATTRIBUTE = 'data-scroll-native';

const KATEX_DISPLAY_SELECTOR = '.katex-display';

const shouldLetFormulaHandleScroll = (event: Event, deltaX: number, deltaY: number) => {
	const target = event.target;

	if (!(target instanceof Element) || !target.closest(KATEX_DISPLAY_SELECTOR)) {
		return false;
	}

	return event instanceof WheelEvent && (event.shiftKey || Math.abs(deltaX) > Math.abs(deltaY));
};

export const SCROLL_CONFIG = {
	enabled: true,
	reducedMotionQuery: '(prefers-reduced-motion: reduce)',
	preventSelectors: [
		`[${SCROLL_PREVENT_ATTRIBUTE}]`,
		'.category-accordion__overlay',
		'.category-accordion__rail',
		'.resource-detail',
		'.resource-detail__panel',
		'.resource-detail__body',
		'.resource-image-preview',
		'.article-aside__toc-list',
		'.article-aside__scroll',
		'.article-toc',
		'pre',
		'pre code',
		'textarea',
		'select',
		'[contenteditable="true"]',
	],
	options: {
		anchors: true,
		autoRaf: true,
		lerp: 0.14,
		wheelMultiplier: 1.02,
		touchMultiplier: 1,
		smoothWheel: true,
		syncTouch: false,
		virtualScroll: ({ event, deltaX, deltaY }) => (
			shouldLetFormulaHandleScroll(event, deltaX, deltaY) ? false : true
		),
	} satisfies Partial<LenisOptions>,
};
