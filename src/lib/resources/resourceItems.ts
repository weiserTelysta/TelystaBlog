import { getCollection, type CollectionEntry } from 'astro:content';
import type { ResourceTypeId } from '../../config/content/resourceTypes';
import {
	buildCdnAssetUrl,
	getCdnAsset,
	getCdnAssetKey,
	isCdnAssetReference,
	isCdnAssetUrl,
	type CdnAssetFile,
	type CdnDisplayAssetFile,
} from '../cdnAssets';
import {
	isPublicResourceDownload,
} from './resourceDownloadPolicy';
import { isPublicIllustration } from './resourceDisplayPolicy';

type ResourceImageAsset = {
	src: string;
	width?: number;
	height?: number;
	aspectRatio: number;
};

export type ResourceGalleryImage = {
	src: string;
	width?: number;
	height?: number;
	aspectRatio: number;
	alt?: string;
};

export type ResourceDownloadFile = {
	kind: 'file' | 'remote-file' | 'external';
	label: string;
	href: string;
	format: string;
	provider?: string;
	code?: string;
	note?: string;
	sourceIndex?: number;
};

// Only send the gallery's display data to the React island. Authored metadata stays in Markdown.
export type ResourceListItem = {
	id: string;
	title: string;
	type: ResourceTypeId;
	cover: string;
	coverAspectRatio: number;
	pixelArt: boolean;
	preview: string;
	gallery: ResourceGalleryImage[];
	downloadFiles: ResourceDownloadFile[];
};

type ResourceEntry = CollectionEntry<'resources'>;
type ResourceImageVariant = 'cover' | 'preview';
const DEFAULT_RESOURCE_ASPECT_RATIO = 0.78;

export async function getResourceItems(): Promise<ResourceListItem[]> {
	const resources = await getCollection('resources');
	const visibleResources = resources.filter((resource) => isPublicIllustration(resource.data));

	assertUniqueResourceIds(visibleResources);

	return visibleResources
		.sort((left, right) => right.data.updatedAt.getTime() - left.data.updatedAt.getTime())
		.map(toResourceListItem);
}

function toResourceListItem(resource: ResourceEntry): ResourceListItem {
	resolveRequiredResourceImageAsset(resource.data.image, resource.data.id, 'image');
	const cover = resource.data.cover
		? resolveRequiredResourceImageAsset(resource.data.cover, resource.data.id, 'cover')
		: resolveDisplayResourceImageAsset(resource.data.image, resource.data.id, 'cover', 'cover');
	const preview = resource.data.preview
		? resolveRequiredResourceImageAsset(resource.data.preview, resource.data.id, 'preview')
		: resolveDisplayResourceImageAsset(resource.data.image, resource.data.id, 'preview', 'preview');
	const gallery = resolveResourceGallery(resource, preview);
	const downloadFiles = resolveResourceDownloadFiles(resource);

	return {
		id: resource.data.id,
		title: resource.data.title,
		type: resource.data.type,
		cover: cover.src,
		coverAspectRatio: cover.aspectRatio,
		pixelArt: Boolean(cover.width && cover.height && cover.width <= 128 && cover.height <= 128),
		preview: preview.src,
		gallery,
		downloadFiles,
	};
}

function resolveResourceGallery(resource: ResourceEntry, fallbackImage: ResourceImageAsset): ResourceGalleryImage[] {
	const gallery = resource.data.gallery.map((image, index) => {
		const displayImage = resolveDisplayResourceImageAsset(image.src, resource.data.id, `gallery[${index}]`, 'preview');

		return {
			src: displayImage.src,
			width: displayImage.width,
			height: displayImage.height,
			aspectRatio: displayImage.aspectRatio,
			alt: image.alt,
		};
	});

	if (gallery.length > 0) {
		return gallery;
	}

	return [
		{
			src: fallbackImage.src,
			width: fallbackImage.width,
			height: fallbackImage.height,
			aspectRatio: fallbackImage.aspectRatio,
			alt: resource.data.title,
		},
	];
}

function resolveResourceDownloadFiles(resource: ResourceEntry): ResourceDownloadFile[] {
	const images = resource.data.gallery.length > 0
		? resource.data.gallery
		: [
			{
				src: resource.data.image,
				label: '01',
				alt: resource.data.title,
			},
		];
	const files = images.flatMap((image, index) =>
		resolveResourceImageDownloads(
			image.src,
			resource.data.id,
			`downloadFiles[${index}]`,
			image.label ?? String(index + 1).padStart(2, '0'),
			index,
		),
	);
	const actionFiles = resource.data.actions
		.filter((action) => action.type === 'download' && !action.disabled && action.href)
		.map((action) => resolveResourceDownloadAction(resource, action));

	return dedupeDownloadFiles([...files, ...actionFiles]).filter(isPublicResourceDownload);
}

function assertUniqueResourceIds(resources: ResourceEntry[]) {
	const usedIds = new Set<string>();

	for (const resource of resources) {
		const id = resource.data.id;
		if (usedIds.has(id)) {
			throw new Error(`[resources] Duplicate resource id "${id}". Resource ids must be unique.`);
		}

		usedIds.add(id);
	}
}

function resolveRequiredResourceImageAsset(path: string, resourceId: string, field: string): ResourceImageAsset {
	const image = resolveResourceImage(path);

	if (!image) {
		throw new Error(
			`[resources] Unable to resolve ${field} for "${resourceId}": ${path}. ` +
				'Use an asset: reference from src/generated/cdn-assets.json.',
		);
	}

	return image;
}

function resolveDisplayResourceImageAsset(
	path: string,
	resourceId: string,
	field: string,
	variant: ResourceImageVariant,
): ResourceImageAsset {
	if (isCdnAssetReference(path)) {
		const asset = getCdnAsset(path);
		const image = variant === 'cover'
			? asset?.cover ?? asset?.display
			: asset?.display ?? asset?.cover;

		if (!image) {
			return resolveRequiredResourceImageAsset(path, resourceId, field);
		}

		return toResourceImageAsset(image);
	}

	return resolveRequiredResourceImageAsset(path, resourceId, field);
}

function resolveResourceImage(path: string): ResourceImageAsset | undefined {
	if (isCdnAssetReference(path)) {
		const asset = getCdnAsset(path);
		const display = asset?.display ?? asset?.cover;

		if (!display) {
			return undefined;
		}

		return toResourceImageAsset(display);
	}

	return undefined;
}

function toResourceImageAsset(image: CdnDisplayAssetFile): ResourceImageAsset {
	return {
		src: buildCdnAssetUrl(image),
		width: image.width,
		height: image.height,
		aspectRatio: getImageAspectRatio(image.width, image.height),
	};
}

function getPathFormat(path: string): string {
	const extension = path.split(/[?#]/)[0]?.split('.').pop()?.toUpperCase();

	if (extension === 'JPEG') {
		return 'JPG';
	}

	return extension || 'FILE';
}

function resolveResourceDownloadAction(resource: ResourceEntry, action: ResourceEntry['data']['actions'][number]): ResourceDownloadFile {
	const href = action.href ?? '';
	if (isCdnAssetReference(href)) {
		const target = resolveResourceDownloadTarget(
			href,
			resource.data.id,
			`download action "${action.label}" href`,
		);

		return {
			kind: target.kind,
			label: action.label,
			href: target.href,
			format: action.format ?? target.format,
			provider: action.provider,
			code: action.code,
			note: action.note,
		};
	}

	const isExternal = isExternalHref(href);
	const resolvedHref = isExternal
		? href
		: resolveRequiredResourceImageAsset(href, resource.data.id, `download action "${action.label}" href`).src;

	return {
		kind: isExternal && isCdnAssetUrl(href) ? 'remote-file' : isExternal ? 'external' : 'file',
		label: action.label,
		href: resolvedHref,
		format: action.format ?? getPathFormat(href),
		provider: action.provider,
		code: action.code,
		note: action.note,
	};
}

function resolveResourceImageDownloads(
	reference: string,
	resourceId: string,
	field: string,
	label: string,
	sourceIndex: number,
): ResourceDownloadFile[] {
	if (!isCdnAssetReference(reference)) {
		const target = resolveResourceDownloadTarget(reference, resourceId, field);

		return [{ ...target, label, sourceIndex }];
	}

	const asset = getCdnAsset(reference);
	if (!asset?.display) {
		throw new Error(
			`[resources] CDN asset "${getCdnAssetKey(reference)}" for "${resourceId}" has no display image.`,
		);
	}

	const primaryFile = asset.original ?? asset.display;
	const primary: ResourceDownloadFile = {
		kind: 'remote-file',
		label,
		href: buildCdnAssetUrl(primaryFile),
		format: primaryFile.format,
		sourceIndex,
	};
	const sources = asset.sources.map((file) => ({
		kind: 'remote-file' as const,
		label: `${label} · ${file.format}`,
		href: buildCdnAssetUrl(file),
		format: file.format,
	}));

	return [primary, ...sources];
}

function resolveResourceDownloadTarget(
	reference: string,
	resourceId: string,
	field: string,
): Pick<ResourceDownloadFile, 'kind' | 'href' | 'format'> {
	if (isCdnAssetReference(reference)) {
		const asset = getCdnAsset(reference);
		const file = asset?.original ?? asset?.display;

		if (!file) {
			throw new Error(
				`[resources] Unable to resolve ${field} for "${resourceId}": ${reference}.`,
			);
		}

		return toCdnDownloadTarget(file);
	}

	const localImage = resolveRequiredResourceImageAsset(reference, resourceId, field);
	return {
		kind: 'file',
		href: localImage.src,
		format: getPathFormat(reference),
	};
}

function toCdnDownloadTarget(
	file: CdnAssetFile,
): Pick<ResourceDownloadFile, 'kind' | 'href' | 'format'> {
	return {
		kind: 'remote-file',
		href: buildCdnAssetUrl(file),
		format: file.format,
	};
}

function dedupeDownloadFiles(files: ResourceDownloadFile[]): ResourceDownloadFile[] {
	const seen = new Set<string>();

	return files.filter((file) => {
		const key = `${file.kind}:${file.href}`;

		if (seen.has(key)) {
			return false;
		}

		seen.add(key);
		return true;
	});
}

function getImageAspectRatio(width?: number, height?: number): number {
	if (!width || !height || width <= 0 || height <= 0) {
		return DEFAULT_RESOURCE_ASPECT_RATIO;
	}

	return width / height;
}

function isExternalHref(href: string): boolean {
	return /^(https?:|mailto:)/.test(href);
}
