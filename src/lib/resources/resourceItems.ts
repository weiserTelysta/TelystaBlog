import { getCollection, type CollectionEntry } from 'astro:content';
import type { ResourceActionType, ResourceStatus, ResourceTypeId } from '../../config/content/resourceTypes';

type ImageModule = {
	default: {
		src: string;
		width?: number;
		height?: number;
	};
};

type ResourceImageAsset = {
	src: string;
	width?: number;
	height?: number;
	aspectRatio: number;
};

const resourceImages = import.meta.glob<ImageModule>(
	[
		'../../assets/images/resources/**/*.{png,jpg,jpeg,webp,avif}',
		'../../assets/images/illustration/**/*.{png,jpg,jpeg,webp,avif}',
	],
	{ eager: true },
);

const RESOURCE_IMAGE_PATH_HINT = [
	'src/assets/images/resources/**',
	'src/assets/images/illustration/**',
].join(', ');

export type ResourceAction = {
	type: ResourceActionType;
	label: string;
	href?: string;
	format?: string;
	provider?: string;
	code?: string;
	primary: boolean;
	disabled: boolean;
	note?: string;
};

export type ResourceGalleryImage = {
	src: string;
	width?: number;
	height?: number;
	aspectRatio: number;
	downloadHref: string;
	label?: string;
	alt?: string;
};

export type ResourceCredit = {
	label: string;
	name: string;
	href?: string;
};

export type ResourceDownloadFile = {
	kind: 'file' | 'external';
	label: string;
	href: string;
	format: string;
	provider?: string;
	code?: string;
	note?: string;
	sourceIndex?: number;
};

export type ResourceRelatedAction = ResourceAction;

export type ResourceListItem = {
	id: string;
	slug: string;
	title: string;
	summary: string;
	type: ResourceTypeId;
	status: ResourceStatus;
	cover: string;
	coverAspectRatio: number;
	preview: string;
	gallery: ResourceGalleryImage[];
	credits: ResourceCredit[];
	publishedAt: string;
	updatedAt: string;
	formats: string[];
	variantCount?: number;
	license?: string;
	actions: ResourceAction[];
	downloadFiles: ResourceDownloadFile[];
	relatedActions: ResourceRelatedAction[];
	details: string[];
};

type ResourceEntry = CollectionEntry<'resources'>;
type ResourceImageVariant = 'cover' | 'preview';
const DEFAULT_RESOURCE_ASPECT_RATIO = 0.78;

export async function getResourceItems(): Promise<ResourceListItem[]> {
	const resources = await getCollection('resources');
	const visibleResources = resources.filter((resource) => !isDraftResource(resource));

	assertUniqueResourceIds(visibleResources);

	return visibleResources
		.map(toResourceListItem)
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
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
	const actions = resource.data.actions.map((action) => ({
		...action,
		href: action.href && !action.disabled
			? resolveResourceActionHref(action.href, resource.data.id, action.label)
			: undefined,
	}));

	return {
		id: resource.data.id,
		slug: resource.id,
		title: resource.data.title,
		summary: resource.data.summary,
		type: resource.data.type,
		status: resource.data.status,
		cover: cover.src,
		coverAspectRatio: cover.aspectRatio,
		preview: preview.src,
		gallery,
		credits: resource.data.credits,
		publishedAt: toDateText(resource.data.publishedAt),
		updatedAt: toDateText(resource.data.updatedAt),
		formats: resource.data.formats,
		variantCount: resource.data.variantCount,
		license: resource.data.license,
		actions,
		downloadFiles,
		relatedActions: actions.filter((action) => action.type !== 'download'),
		details: getResourceDetails(resource),
	};
}

function resolveResourceGallery(resource: ResourceEntry, fallbackImage: ResourceImageAsset): ResourceGalleryImage[] {
	const gallery = resource.data.gallery.map((image, index) => {
		const displayImage = resolveDisplayResourceImageAsset(image.src, resource.data.id, `gallery[${index}]`, 'preview');
		const downloadImage = resolveRequiredResourceImageAsset(image.src, resource.data.id, `gallery[${index}] download`);

		return {
			src: displayImage.src,
			width: displayImage.width,
			height: displayImage.height,
			aspectRatio: displayImage.aspectRatio,
			downloadHref: downloadImage.src,
			label: image.label,
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
			downloadHref: resolveRequiredResourceImageAsset(resource.data.image, resource.data.id, 'image download').src,
			label: 'Main',
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
	const files = images.map((image, index) => ({
		kind: 'file' as const,
		label: image.label ?? String(index + 1).padStart(2, '0'),
		href: resolveRequiredResourceImageAsset(image.src, resource.data.id, `downloadFiles[${index}]`).src,
		format: getPathFormat(image.src),
		sourceIndex: index,
	}));
	const actionFiles = resource.data.actions
		.filter((action) => action.type === 'download' && !action.disabled && action.href)
		.map((action) => resolveResourceDownloadAction(resource, action));

	return dedupeDownloadFiles([...files, ...actionFiles]);
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

function isDraftResource(resource: ResourceEntry): boolean {
	return resource.data.draft || resource.data.status === 'draft';
}

function resolveRequiredResourceImage(path: string, resourceId: string, field: string): string {
	return resolveRequiredResourceImageAsset(path, resourceId, field).src;
}

function resolveRequiredResourceImageAsset(path: string, resourceId: string, field: string): ResourceImageAsset {
	const image = resolveResourceImage(path);

	if (!image) {
		throw new Error(
			`[resources] Unable to resolve ${field} for "${resourceId}": ${path}. ` +
				`Allowed local resource image paths: ${RESOURCE_IMAGE_PATH_HINT}.`,
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
	return (
		resolveDerivedResourceImage(path, variant) ??
		resolveRequiredResourceImageAsset(path, resourceId, field)
	);
}

function resolveDerivedResourceImage(path: string, variant: ResourceImageVariant): ResourceImageAsset | undefined {
	if (!/\.(png|jpe?g)$/i.test(path)) {
		return undefined;
	}

	const derivedPath = path.replace(/\.(png|jpe?g)$/i, `.${variant}.webp`);
	return resolveResourceImage(derivedPath);
}

function resolveResourceImage(path: string): ResourceImageAsset | undefined {
	const normalized = path.replace(/^\/+/, '');
	const candidates = [
		path,
		normalized,
		normalized.replace(/^src\/assets\//, '../../assets/'),
		`../../assets/${normalized}`,
	];
	const image = candidates.map((candidate) => resourceImages[candidate]).find(Boolean);

	if (!image) {
		return undefined;
	}

	return {
		src: image.default.src,
		width: image.default.width,
		height: image.default.height,
		aspectRatio: getImageAspectRatio(image.default.width, image.default.height),
	};
}

function resolveResourceActionHref(href: string, resourceId: string, label: string): string {
	if (/^(https?:|mailto:)/.test(href)) {
		return href;
	}

	return resolveRequiredResourceImage(href, resourceId, `action "${label}" href`);
}

function getPathFormat(path: string): string {
	const extension = path.split(/[?#]/)[0]?.split('.').pop()?.toUpperCase();

	if (extension === 'JPEG') {
		return 'JPG';
	}

	return extension || 'FILE';
}

function resolveResourceDownloadAction(resource: ResourceEntry, action: ResourceAction): ResourceDownloadFile {
	const href = action.href ?? '';
	const isExternal = isExternalHref(href);
	const resolvedHref = isExternal
		? href
		: resolveRequiredResourceImageAsset(href, resource.data.id, `download action "${action.label}" href`).src;

	return {
		kind: isExternal ? 'external' : 'file',
		label: action.label,
		href: resolvedHref,
		format: action.format ?? getPathFormat(href),
		provider: action.provider,
		code: action.code,
		note: action.note,
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

function getResourceDetails(resource: ResourceEntry): string[] {
	return (resource.body ?? '')
		.trim()
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
		.filter(Boolean);
}

function toDateText(date: Date): string {
	return date.toISOString().slice(0, 10);
}
