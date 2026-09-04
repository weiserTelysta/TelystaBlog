export const BLOG_SERIES_IDS = [
	'telysta-blog-build',
	'weiser-blog-construction-records',
	'marketing-ecommerce-notes',
	'ningbo-catholic-observation-log',
] as const;

export type BlogSeriesId = (typeof BLOG_SERIES_IDS)[number];

export type BlogSeries = {
	id: BlogSeriesId;
	title: string;
	description: string;
};

export const BLOG_SERIES = [
	{
		id: 'telysta-blog-build',
		title: 'Telysta Blog Build',
		description: 'A quiet record of this blog slowly becoming a real writing space.',
	},
	{
		id: 'weiser-blog-construction-records',
		title: "Weiser's Blog Construction Records",
		description: 'Notes about how this quiet blog is built, adjusted, and made livable.',
	},
	{
		id: 'marketing-ecommerce-notes',
		title: 'Notes of Marketing and E-Commerce',
		description: 'Reading notes and fragments about ads, commerce, and platform logic.',
	},
	{
		id: 'ningbo-catholic-observation-log',
		title: '宁波天主教观察日志',
		description: '关于宁波天主教堂、礼仪、慕道课程与教会生活的田野观察。',
	},
] as const satisfies readonly BlogSeries[];
