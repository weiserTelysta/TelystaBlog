export const REFLOW_FORMATS = ['EPUB', 'MOBI', 'AZW3'] as const;
export function readerHref(id: string, format: string) {
	return `/ebooks/read/?book=${encodeURIComponent(id)}&format=${encodeURIComponent(format)}`;
}
export function pdfPreviewHref(href: string) {
	const url = new URL(href);
	url.searchParams.delete('download');
	return url.href;
}
export function readingLink(id: string, file: { href: string; format: string }) {
	return file.format === 'PDF'
		? { href: pdfPreviewHref(file.href), target: '_blank', rel: 'noopener noreferrer', label: '打开 PDF（新标签页）' }
		: { href: readerHref(id, file.format), label: `在线阅读 ${file.format}` };
}
