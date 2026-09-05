type DownloadCandidate = {
	format?: string;
	href?: string;
};

const PRIVATE_SOURCE_FORMATS = new Set(['PSD']);

export function isPublicResourceFormat(format: string): boolean {
	return !PRIVATE_SOURCE_FORMATS.has(format.trim().toUpperCase());
}

export function isPublicResourceDownload(candidate: DownloadCandidate): boolean {
	if (candidate.format && !isPublicResourceFormat(candidate.format)) {
		return false;
	}

	const path = candidate.href?.split(/[?#]/, 1)[0]?.toLowerCase();
	return !path?.endsWith('.psd');
}
