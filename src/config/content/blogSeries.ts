export type BlogSeries = {
	id: string;
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
] as const satisfies readonly BlogSeries[];
