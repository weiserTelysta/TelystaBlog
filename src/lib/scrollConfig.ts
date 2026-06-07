import type { LenisOptions } from 'lenis';

export const SCROLL_PREVENT_ATTRIBUTE = 'data-scroll-native';

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
	} satisfies Partial<LenisOptions>,
};
