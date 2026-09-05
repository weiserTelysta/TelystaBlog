import type { ResourceListItem } from './resourceItems';
import { isPublicResourceDownload } from './resourceDownloadPolicy';

const IMAGE_FORMATS = new Set(['PNG', 'JPG', 'JPEG', 'WEBP', 'AVIF', 'GIF']);

export function getLightboxDownloads(resource: ResourceListItem) {
	return resource.downloadFiles.filter((file) =>
		isPublicResourceDownload(file) && IMAGE_FORMATS.has(file.format.trim().toUpperCase()),
	);
}

export function getLightboxSlides(resource: ResourceListItem) {
	return resource.gallery.map((image, index) => ({
		src: image.src,
		width: image.width ?? Math.round((image.aspectRatio || 1) * 1600),
		height: image.height ?? 1600,
		alt: image.alt || resource.title + (resource.gallery.length > 1 ? ` · ${index + 1}` : ''),
	}));
}
