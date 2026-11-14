import { SITE_CONFIG } from '../site';

export const EBOOK_PAGE_CONFIG = {
	meta: { title: `书室 - ${SITE_CONFIG.name}`, description: 'Weiser 的电子书架，收藏书籍与值得重读的文字。' },
	hero: { eyebrow: 'Library', title: '书室', description: '电子书是人类进步的电梯。' },
	empty: '书架还在整理中，稍后再来看看。',
	backLabel: '返回书架',
	downloadLabel: '选择格式',
} as const;
