import type { BlogCategoryId } from './blogCategories';

type BlogSeriesDefinition = {
	id: string;
	category: BlogCategoryId;
	title: string;
	description: string;
};

export const BLOG_SERIES = [
	{
		id: 'weiser-blog-construction-records',
		category: 'manuscript',
		title: "Weiser's Blog Construction Records",
		description: 'Notes about how this quiet blog is built, adjusted, and made livable.',
	},
	{
		id: 'marketing-ecommerce-notes',
		category: 'reading',
		title: 'Notes of Marketing and E-Commerce',
		description: 'Reading notes and fragments about ads, commerce, and platform logic.',
	},
	{
		id: 'ningbo-catholic-observation-log',
		category: 'notes',
		title: '宁波天主教观察日志',
		description: '关于宁波天主教堂、礼仪、慕道课程与教会生活的田野观察。',
	},
	{
		id: 'telysta-notes',
		category: 'portraits',
		title: 'Telysta 札记',
		description: '关于 Telysta 的人物设定、服装语言与世界观创作记录。',
	},
] as const satisfies readonly [BlogSeriesDefinition, ...BlogSeriesDefinition[]];

// 只编辑上面的系列资料；ID 和类型无需再次维护。
export type BlogSeriesId = (typeof BLOG_SERIES)[number]['id'];
export type BlogSeries = Omit<BlogSeriesDefinition, 'id'> & { id: BlogSeriesId };
export const BLOG_SERIES_IDS = BLOG_SERIES.map(series => series.id) as [BlogSeriesId, ...BlogSeriesId[]];
