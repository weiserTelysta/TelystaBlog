import { SITE_CONFIG } from '../config/site';

type ShareImage = { url: string; alt: string; width?: number; height?: number; type?: string };

export function resolveShareImage(image: string | undefined, site: URL, alt?: string): ShareImage {
	const source = image?.trim();
	// Existing cover fields support public-root paths or public HTTP(S) URLs.
	// Markdown-relative files and asset: identifiers need explicit resolution first.
	if (source && (/^https?:\/\//i.test(source) || /^\/(?!\/)/.test(source))) {
		try {
			const url = new URL(source, site);
			if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) {
				return { url: url.href, alt: alt || SITE_CONFIG.name };
			}
		} catch { /* Invalid cover: keep a working site-level sharing image. */ }
	}
	return { ...SITE_CONFIG.shareImage };
}
