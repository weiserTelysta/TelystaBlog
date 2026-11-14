/** Strip paired wrapping quotation marks, preserving punctuation within a title. */
export function normalizeEbookTitle(value: string): string {
	let title = value.trim();
	const pairs = [['"', '"'], ["'", "'"], ['“', '”'], ['‘', '’'], ['《', '》'], ['「', '」']];
	while (pairs.some(([start, end]) => title.startsWith(start) && title.endsWith(end) && title.length > 2)) title = title.slice(1, -1).trim();
	return title;
}
