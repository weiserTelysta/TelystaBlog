import { SITE_CONFIG } from '../site';

export const EBOOK_PAGE_CONFIG = {
	meta: { title: `Ebooks - ${SITE_CONFIG.name}`, description: 'Weiser 的电子书架，收藏书籍与值得重读的文字。' },
	hero: { eyebrow: 'Ebooks', title: "Weiser's Ebooks", description: '在文字之间，寻找另一个世界。' },
	empty: '书架还在整理中，稍后再来看看。',
	backLabel: '返回书架',
	downloadLabel: '选择格式',
} as const;
