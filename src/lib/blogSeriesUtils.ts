import { BLOG_SERIES, type BlogSeries } from '../config/content/blogSeries';

export function getBlogSeriesById(id: string | null | undefined): BlogSeries | undefined {
	if (!id) {
		return undefined;
	}

	return BLOG_SERIES.find((series) => series.id === id);
}

export function buildSeriesHref(seriesId: string): string {
	return `/series/${encodeURIComponent(seriesId)}/`;
}
