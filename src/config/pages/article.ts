export const ARTICLE_PAGE_CONFIG = {
	meta: {
		titleSeparator: ' - ',
	},
	header: {
		coverAriaLabel: '文章主图',
		metaAriaLabel: '文章信息',
		publishedLabel: 'Published',
		updatedLabel: 'Updated',
	},
	toc: {
		minHeadingCount: 3,
		minDepth: 2,
		maxDepth: 4,
		title: 'Contents',
		ariaLabel: '文章目录',
		drawer: {
			compactMediaQuery: '(max-width: 1359px)',
		},
		behavior: {
			readingLineOffset: 72,
			bottomThreshold: 96,
			clickLockMs: 760,
			scrollSettleMs: 220,
			userIntentMs: 5000,
			inspectionLeaveMs: 1800,
			programmaticScrollMs: 720,
			revealCooldownMs: 160,
			revealAnchor: 0.3,
			revealMargin: 28,
			comfortTop: 0.24,
			comfortBottom: 0.68,
			comfortAnchor: 0.34,
			maxRevealStep: 96,
		},
	},
	series: {
		pageLabel: 'Series',
	},
} as const;
