import { SITE_CONFIG } from '../site';

export const RESOURCE_PAGE_CONFIG = {
	meta: {
		title: `画廊 - ${SITE_CONFIG.name}`,
		description: 'Weiser 的插画作品与图像收藏。',
	},
	hero: {
		eyebrow: 'Gallery',
		title: '画廊',
		description: '笔已经自己在画了！',
	},
	filter: {
		allLabel: 'All Works',
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
