import { getCollection, type CollectionEntry } from 'astro:content';
import type { ResourceActionType, ResourceStatus, ResourceTypeId } from '../../config/content/resourceTypes';

type ImageModule = {
	default: {
		src: string;
	};
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
	label?: string;
	alt?: string;
};

export type ResourceCredit = {
	label: string;
	name: string;
	href?: string;
};

export type ResourceListItem = {
	id: string;
	slug: string;
	title: string;
	summary: string;
	type: ResourceTypeId;
	status: ResourceStatus;
	cover: string;
	preview: string;
	gallery: ResourceGalleryImage[];
	credits: ResourceCredit[];
	publishedAt: string;
	updatedAt: string;
	formats: string[];
	variantCount?: number;
	license?: string;
	actions: ResourceAction[];
	details: string[];
};

type ResourceEntry = CollectionEntry<'resources'>;

export async function getResourceItems(): Promise<ResourceListItem[]> {
	const resources = await getCollection('resources');
	const visibleResources = resources.filter((resource) => !isDraftResource(resource));

	assertUniqueResourceIds(visibleResources);

	return visibleResources
		.map(toResourceListItem)
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function toResourceListItem(resource: ResourceEntry): ResourceListItem {
	const image = resolveRequiredResourceImage(resource.data.image, resource.data.id, 'image');
	const cover = resource.data.cover
		? resolveRequiredResourceImage(resource.data.cover, resource.data.id, 'cover')
		: image;
	const preview = resource.data.preview
		? resolveRequiredResourceImage(resource.data.preview, resource.data.id, 'preview')
		: image;
	const gallery = resolveResourceGallery(resource, preview);

	return {
		id: resource.data.id,
		slug: resource.id,
		title: resource.data.title,
		summary: resource.data.summary,
		type: resource.data.type,
		status: resource.data.status,
		cover,
		preview,
		gallery,
		credits: resource.data.credits,
		publishedAt: toDateText(resource.data.publishedAt),
		updatedAt: toDateText(resource.data.updatedAt),
		formats: resource.data.formats,
		variantCount: resource.data.variantCount,
		license: resource.data.license,
		actions: resource.data.actions.map((action) => ({
			...action,
			href: action.href && !action.disabled
				? resolveResourceActionHref(action.href, resource.data.id, action.label)
				: undefined,
		})),
		details: getResourceDetails(resource),
	};
}

function resolveResourceGallery(resource: ResourceEntry, fallbackImage: string): ResourceGalleryImage[] {
	const gallery = resource.data.gallery.map((image, index) => ({
		src: resolveRequiredResourceImage(image.src, resource.data.id, `gallery[${index}]`),
		label: image.label,
		alt: image.alt,
	}));

	if (gallery.length > 0) {
		return gallery;
	}

	return [
		{
			src: fallbackImage,
			label: 'Main',
			alt: resource.data.title,
		},
	];
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
	const normalized = path.replace(/^\/+/, '');
	const candidates = [
		path,
		normalized,
		normalized.replace(/^src\/assets\//, '../../assets/'),
		`../../assets/${normalized}`,
	];
	const image = candidates.map((candidate) => resourceImages[candidate]).find(Boolean);

	if (!image) {
		throw new Error(
			`[resources] Unable to resolve ${field} for "${resourceId}": ${path}. ` +
				`Allowed local resource image paths: ${RESOURCE_IMAGE_PATH_HINT}.`,
		);
	}

	return image.default.src;
}

function resolveResourceActionHref(href: string, resourceId: string, label: string): string {
	if (/^(https?:|mailto:)/.test(href)) {
		return href;
	}

	return resolveRequiredResourceImage(href, resourceId, `action "${label}" href`);
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
