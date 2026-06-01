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

export function getBlogSeriesById(id: string | null | undefined): BlogSeries | undefined {
	if (!id) {
		return undefined;
	}

	return BLOG_SERIES.find((series) => series.id === id);
}

export function buildSeriesHref(seriesId: string): string {
	return `/series/${encodeURIComponent(seriesId)}/`;
}
