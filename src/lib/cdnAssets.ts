import manifestData from '../generated/cdn-assets.json';

export const CDN_ASSET_PREFIX = 'asset:';

export type CdnAssetFile = {
	path: string;
	bytes: number;
	format: string;
};

export type CdnDisplayAssetFile = CdnAssetFile & {
	width: number;
	height: number;
};

export type CdnAssetRecord = {
	cover?: CdnDisplayAssetFile;
	display?: CdnDisplayAssetFile;
	original?: CdnAssetFile;
	sources: CdnAssetFile[];
};

export type CdnAssetManifest = {
	version: 2;
	origin: string;
	assets: Record<string, CdnAssetRecord>;
};

const manifest = manifestData as CdnAssetManifest;

export function isCdnAssetReference(reference: string): boolean {
	return reference.startsWith(CDN_ASSET_PREFIX);
}

export function getCdnAssetKey(reference: string): string {
	return reference.slice(CDN_ASSET_PREFIX.length).trim();
}

export function getCdnAsset(reference: string): CdnAssetRecord | undefined {
	if (!isCdnAssetReference(reference)) {
		return undefined;
	}

	return manifest.assets[getCdnAssetKey(reference)];
}

export function buildCdnAssetUrl(file: CdnAssetFile): string {
	const encodedPath = file.path
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/');

	return new URL(encodedPath, manifest.origin).toString();
}

export function isCdnAssetUrl(value: string): boolean {
	try {
		return new URL(value).toString().startsWith(manifest.origin);
	} catch {
		return false;
	}
}

export function getCdnAssetManifest(): CdnAssetManifest {
	return manifest;
}
