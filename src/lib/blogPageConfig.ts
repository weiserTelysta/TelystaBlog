export const BLOG_PAGE_CONFIG = {
	meta: {
		title: 'Blog - Telysta Blog',
		description: 'Telysta Blog 的文章导航页。',
		categoryTitleSuffix: 'Blog - Telysta Blog',
	},
	banner: {
		eyebrow: 'Records',
		title: '文章列表',
		intro: '所有的思绪与技术累积，都会在这里留下足迹。',
		categorySummaryPrefix: '当前栏目：',
		allSummarySuffix: '篇记录正在归档',
	},
	emptyState: {
		defaultMessage: '这里暂时还没有公开文章。',
		categorySuffix: '还没有公开文章。',
		hint: '等下一颗星落下来，再回来看看。',
	},
	yearJump: {
		title: 'Years',
		ariaLabel: '年份快速跳转',
	},
	categoryIndex: {
		ariaLabel: '文章类目',
	},
	categoryAccordion: {
		dialogTitleId: 'category-accordion-title',
		entryLabel: 'Category',
		allRecordsTitle: 'All Records',
		recordLabel: 'records',
		allPostsLabel: '全部文章',
		entryHint: '星辰微光，愿片语对你有助。',
		dialogEyebrow: 'Category Map',
		dialogTitle: '渺渺星辰，亦有微光。',
		closeLabel: '关闭类目选择',
		currentLabel: 'Current',
		selectHint: '点击预选此栏目。',
		confirmHint: '再次点击进入此栏目。',
		cardCountSuffix: '篇文章',
		cardConfirmText: '再次点击进入',
	},
} as const;
