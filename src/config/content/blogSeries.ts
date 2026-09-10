import type { BlogCategoryId } from './blogCategories';

type BlogSeriesDefinition = {
	id: string;
	category: BlogCategoryId;
	title: string;
	titleEn: string;
	description: string;
	descriptionEn: string;
};

export const BLOG_SERIES = [
	{
		id: 'weiser-blog-construction-records',
		category: 'manuscript',
		title: '博客建设记录',
		titleEn: "Weiser's Blog Construction Records",
		description: '记录这个安静博客的搭建、调整，以及如何让它逐渐宜居。',
		descriptionEn: 'Notes about how this quiet blog is built, adjusted, and made livable.',
	},
	{
		id: 'marketing-ecommerce-notes',
		category: 'reading',
		title: '电子商务笔记',
		titleEn: 'Notes on Marketing and E-Commerce',
		description: '关于广告、商业与平台逻辑的阅读笔记和片段。',
		descriptionEn: 'Reading notes and fragments about advertising, commerce, and platform logic.',
	},
	{
		id: 'ningbo-catholic-observation-log',
		category: 'notes',
		title: '宁波天主教观察日志',
		titleEn: 'Ningbo Catholic Observation Log',
		description: '关于宁波天主教堂、礼仪、慕道课程与教会生活的田野观察。',
		descriptionEn: 'Field notes on Catholic churches, liturgy, catechesis, and church life in Ningbo.',
	},
	{
		id: 'telysta-notes',
		category: 'portraits',
		title: 'Telysta 札记',
		titleEn: 'Notes on Telysta',
		description: '关于 Telysta 的人物设定、服装语言与世界观创作记录。',
		descriptionEn: "Notes on Telysta's character design, visual language, and worldbuilding.",
	},
	{
		id: 'plants-in-their-season',
		category: 'notes',
		title: '草木有时',
		titleEn: 'Plants in Their Season',
		description: '记录小小天地里的草木荣枯，也是我与花卉相处的故事。',
		descriptionEn: 'Notes on the plants that grow, bloom, wither, and return in my little garden.',
	},
] as const satisfies readonly [BlogSeriesDefinition, ...BlogSeriesDefinition[]];

// 只编辑上面的系列资料；ID 和类型无需再次维护。
export type BlogSeriesId = (typeof BLOG_SERIES)[number]['id'];
export type BlogSeries = Omit<BlogSeriesDefinition, 'id'> & { id: BlogSeriesId };
export const BLOG_SERIES_IDS = BLOG_SERIES.map(series => series.id) as [BlogSeriesId, ...BlogSeriesId[]];
