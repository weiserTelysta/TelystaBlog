export const RESOURCE_TYPES = [
	{
		id: 'illustration',
		label: 'Illustration',
		shortLabel: 'Illust',
		description: '角色、插画与可以被带走的一点画面。',
	},
	{
		id: 'image',
		label: 'Image',
		shortLabel: 'Image',
		description: '照片、截图与更偏素材性质的图像。',
	},
	{
		id: 'music',
		label: 'Music',
		shortLabel: 'Music',
		description: '音频、曲目与声音片段。',
	},
	{
		id: 'video',
		label: 'Video',
		shortLabel: 'Video',
		description: '视频、剪辑与影像记录。',
	},
	{
		id: 'project',
		label: 'Project',
		shortLabel: 'Project',
		description: '工程包、模板、源工程与可继续扩展的项目资源。',
	},
	{
		id: 'other',
		label: 'Other',
		shortLabel: 'Other',
		description: '暂时无法归类，但仍值得留下的资源。',
	},
] as const;

export type ResourceTypeId = (typeof RESOURCE_TYPES)[number]['id'];

export const RESOURCE_TYPE_IDS = RESOURCE_TYPES.map((type) => type.id) as [
	ResourceTypeId,
	...ResourceTypeId[],
];

export const RESOURCE_STATUS_IDS = ['available', 'draft', 'unavailable'] as const;

export type ResourceStatus = (typeof RESOURCE_STATUS_IDS)[number];

export const RESOURCE_ACTION_TYPES = [
	'download',
	'external',
	'preview',
	'source',
	'mirror',
] as const;

export type ResourceActionType = (typeof RESOURCE_ACTION_TYPES)[number];

export type ResourceTypeInfo = (typeof RESOURCE_TYPES)[number];

export function isResourceTypeId(value: string | null | undefined): value is ResourceTypeId {
	return RESOURCE_TYPE_IDS.includes(value as ResourceTypeId);
}

export function getResourceTypeById(id: ResourceTypeId): ResourceTypeInfo {
	return RESOURCE_TYPES.find((type) => type.id === id) ?? RESOURCE_TYPES[0];
}
