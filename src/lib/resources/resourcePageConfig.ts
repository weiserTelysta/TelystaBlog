import { SITE_CONFIG } from '../siteConfig';

export const RESOURCE_PAGE_CONFIG = {
	meta: {
		title: `Resources - ${SITE_CONFIG.name}`,
		description: '可以预览、保存或前往下载的资源索引。',
	},
	hero: {
		eyebrow: 'Resources',
		title: '资源索引',
		description: '这里整理可以公开分享的图片、工程和其他材料。它们不是展台，只是一处安静的入口。',
	},
	filter: {
		allLabel: 'All Resources',
		allDescription: '全部已经整理好的资源。',
		ariaLabel: '资源类型筛选',
		sidebarTitle: 'Category',
	},
	stats: {
		resourceLabel: 'resources',
		formatLabel: 'formats',
	},
	detail: {
		closeLabel: '关闭资源详情',
		previewLabel: '查看高清预览',
		formatLabel: 'Formats',
		variantLabel: 'Variants',
		licenseLabel: 'Notice',
		actionLabel: 'Available files',
		providerLabel: 'Provider',
		codeLabel: 'Code',
	},
	emptyState: {
		title: '暂时没有对应资源',
		description: '换一个类型看看，或许另一处已经整理好了。',
	},
	status: {
		available: 'Available',
		draft: 'Preparing',
		unavailable: 'Unavailable',
	},
} as const;
