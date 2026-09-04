import { SITE_CONFIG } from '../site';

export const BLOG_PAGE_CONFIG = {
	meta: {
		title: `Blog - ${SITE_CONFIG.name}`,
		description: `${SITE_CONFIG.name} 的文章导航页。`,
		categoryTitleSuffix: `Blog - ${SITE_CONFIG.name}`,
	},
	indexHeader: {
		title: "Weiser's Records",
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
