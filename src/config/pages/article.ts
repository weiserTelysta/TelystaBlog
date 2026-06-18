export const ARTICLE_PAGE_CONFIG = {
	meta: {
		titleSeparator: ' - ',
	},
	header: {
		backLabel: 'Blog',
		coverAriaLabel: '文章主图',
		metaAriaLabel: '文章信息',
		seriesAriaPrefix: '查看',
		seriesAriaSuffix: '系列',
		publishedLabel: '发布',
		updatedLabel: '更新',
	},
	toc: {
		minHeadingCount: 3,
		title: 'On This Page',
		ariaLabel: '文章目录',
	},
	series: {
		pageLabel: 'Series',
		sectionLabel: 'Series',
		fullSeriesPrefix: '查看完整系列',
		previousLabel: 'Previous',
		nextLabel: 'Next',
		emptyPrevious: '暂无更早的篇章',
		emptyNext: '暂无后续篇章',
	},
} as const;
