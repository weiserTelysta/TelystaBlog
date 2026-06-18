import {
	RESOURCE_TYPES,
	RESOURCE_TYPE_IDS,
	type ResourceTypeId,
	type ResourceTypeInfo,
} from '../config/content/resourceTypes';

export function isResourceTypeId(value: string | null | undefined): value is ResourceTypeId {
	return RESOURCE_TYPE_IDS.includes(value as ResourceTypeId);
}

export function getResourceTypeById(id: ResourceTypeId): ResourceTypeInfo {
	return RESOURCE_TYPES.find((type) => type.id === id) ?? RESOURCE_TYPES[0];
}
