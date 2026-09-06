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
	viewer: {
		error: '图片暂时无法加载，请关闭后重试。',
		actionsLabel: '图片操作',
		previousLabel: '上一张图片',
		nextLabel: '下一张图片',
		downloadLabel: '下载图片',
		closeLabel: '关闭图片',
	},
	download: {
		title: '选择图片',
		closeLabel: '关闭下载选择',
		hint: '打开原图后，可右键或长按保存。',
		imageLabel: '图片 {index}', // 保留 {index}，自动填入序号。
	},
	emptyState: {
		title: '暂时没有对应资源',
		description: '换一个类型看看，或许另一处已经整理好了。',
	},
} as const;
