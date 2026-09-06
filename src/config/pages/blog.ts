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
	search: {
		label: '搜索文章',
		placeholder: '搜索文章…',
		closeLabel: '关闭搜索',
		loading: '正在加载文章索引…',
		error: '索引暂时无法加载，请关闭后重新打开重试。',
		empty: '没有找到相关文章，试试其他关键词。',
		// 保留 {count} / {limit} 占位符；用于屏幕阅读器播报。
		resultCount: '{count} 篇文章',
		limited: ' · 显示前 {limit} 篇，请细化关键词',
	},
	seriesIndex: {
		entryLabel: 'Series',
		allLabel: 'All Series',
		ariaLabel: '查看全部系列',
		title: 'Series Archive',
		eyebrow: 'All Records',
		description: `${SITE_CONFIG.name} 的全部文章系列。`,
		countLabel: '共 {count} 篇',
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
