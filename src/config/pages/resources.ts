import { SITE_CONFIG } from '../site';

export const RESOURCE_PAGE_CONFIG = {
	meta: {
		title: `Resources - ${SITE_CONFIG.name}`,
		description: 'Telysta 的插画作品与原图索引。',
	},
	hero: {
		eyebrow: 'Resources',
		title: '资源索引',
		description: '插画与片刻记忆。点击图片展开，浏览同组作品。',
	},
	filter: {
		allLabel: 'All Resources',
		ariaLabel: '资源类型筛选',
	},
	emptyState: {
		title: '暂时没有对应资源',
		description: '换一个类型看看，或许另一处已经整理好了。',
	},
} as const;
