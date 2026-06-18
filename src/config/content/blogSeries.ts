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
] as const satisfies readonly BlogSeries[];
