import type { BlogCategoryId } from './blogCategories';

type BlogSeriesDefinition = {
	id: string;
	category: BlogCategoryId;
	artworkId?: string;
	cover?: string;
	title: string;
	titleEn: string;
	description: string;
	descriptionEn: string;
};

export const BLOG_SERIES = [
	{
		id: 'weiser-blog-construction-records',
		artworkId: 'weiser_character_01',
		category: 'manuscript',
		title: '博客建设记录',
		titleEn: "Weiser's Blog Construction Records",
		description: '记录这个安静博客的搭建、调整，以及如何让它逐渐宜居。',
		descriptionEn: 'Notes about how this quiet blog is built, adjusted, and made livable.',
	},
	{
		id: 'marketing-ecommerce-notes',
		artworkId: 'alice_character_primary_01',
		category: 'reading',
		title: '电子商务笔记',
		titleEn: 'Notes on Marketing and E-Commerce',
		description: '关于广告、商业与平台逻辑的阅读笔记和片段。',
		descriptionEn: 'Reading notes and fragments about advertising, commerce, and platform logic.',
	},
	{
		id: 'byzantine-civilization',
		artworkId: 'mirelle_character_primary',
		category: 'reading',
		title: '拜占庭文明史',
		titleEn: 'History of Byzantine Civilization',
		description: '从政治、宗教、艺术与知识传播，梳理拜占庭文明及其延续。',
		descriptionEn: 'Reading notes on Byzantine politics, religion, art, intellectual exchange, and their legacies.',
	},
	{
		id: 'my-journal',
		artworkId: 'weiser_artnouveau',
		category: 'life',
		title: '我的日记',
		titleEn: 'My Journal',
		description: '记录日常生活、心情与个人思考。',
		descriptionEn: 'Personal entries on everyday life, feelings, and reflections.',
	},
	{
		id: 'ningbo-catholic-observation-log',
		artworkId: 'telysta_crinoline',
		category: 'notes',
		title: '宁波天主教观察日志',
		titleEn: 'Ningbo Catholic Observation Log',
		description: '关于宁波天主教堂、礼仪、慕道课程与教会生活的田野观察。',
		descriptionEn: 'Field notes on Catholic churches, liturgy, catechesis, and church life in Ningbo.',
	},
	{
		id: 'telysta-notes',
		artworkId: 'telysta_primary_character_01',
		category: 'portraits',
		title: 'Telysta 札记',
		titleEn: 'Notes on Telysta',
		description: '关于 Telysta 的人物设定、服装语言与世界观创作记录。',
		descriptionEn: "Notes on Telysta's character design, visual language, and worldbuilding.",
	},
	{
		id: 'rhaelysa-notes',
		artworkId: 'rhaelysa_illustration_01',
		category: 'portraits',
		title: 'Rhaelysa 札记',
		titleEn: 'Notes on Rhaelysa',
		description: '关于 Rhaelysa 的人物设定、设计理念与创作记录。',
		descriptionEn: "Notes on Rhaelysa's character design, ideas, and development.",
	},
	{
		id: 'mirelle-notes',
		artworkId: 'mirelle_official_illustration_01',
		category: 'portraits',
		title: 'Mirelle 札记',
		titleEn: 'Notes on Mirelle',
		description: '关于 Mirelle 的人物设定、净化之火与视觉创作记录。',
		descriptionEn: "Notes on Mirelle's character design, cleansing fire, and visual development.",
	},
	{
		id: 'plants-in-their-season',
		artworkId: 'ranunculus',
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
