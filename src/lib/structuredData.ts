import { SITE_CONFIG } from '../config/site';
import { resolveCanonicalUrl } from './shareMetadata';

export type ArticleMetadata = { title: string; publishedAt: Date; updatedAt: Date; tags: string[] };

export function buildStructuredData(input: {
	site: URL; pathname: string; title: string; description: string; image?: string; article?: ArticleMetadata;
}) {
	const { site, title, description, image, article } = input;
	const canonical = resolveCanonicalUrl(input.pathname, site);
	const home = new URL('/', site).href;
	const author = { '@type': 'Person', '@id': `${home}#author`, name: SITE_CONFIG.authorName, url: new URL('/about/', site).href };
	const website = { '@type': 'WebSite', '@id': `${home}#website`, url: home, name: SITE_CONFIG.name, description: SITE_CONFIG.home.description, publisher: { '@id': author['@id'] } };
	const about = input.pathname.replace(/\/+$/, '') === '/about';
	const page = {
		'@type': about ? 'AboutPage' : !article && /^\/(blog|series|resources)(\/|$)/.test(input.pathname) ? 'CollectionPage' : 'WebPage',
		'@id': `${canonical}#webpage`, url: canonical, name: title, description,
		isPartOf: { '@id': website['@id'] },
		...(about ? { mainEntity: { '@id': author['@id'] } } : {}),
		...(article ? { mainEntity: { '@id': `${canonical}#article` } } : {}),
	};
	return {
		'@context': 'https://schema.org',
		'@graph': [website, author, page, ...(article ? [{
			'@type': 'BlogPosting', '@id': `${canonical}#article`, url: canonical,
			headline: article.title, description, ...(image ? { image: [image] } : {}),
			datePublished: article.publishedAt.toISOString(), dateModified: article.updatedAt.toISOString(),
			author: { '@id': author['@id'] }, publisher: { '@id': author['@id'] },
			mainEntityOfPage: { '@id': page['@id'] }, keywords: article.tags,
		}] : [] )],
	};
}

/** JSON-LD is embedded in HTML: prevent article text from ending the script element. */
export function serializeStructuredData(data: unknown) {
	return JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
