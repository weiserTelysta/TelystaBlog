/** Split delimiters once so validation and metadata extraction agree on the body. */
export function splitMarkdownSource(source: string) {
	const normalizedSource = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
	const match = /^---\n(?:([\s\S]*?)\n)?---(?:\n|$)/.exec(normalizedSource);
	return {
		normalizedSource,
		frontmatter: match ? match[1] ?? '' : undefined,
		body: match ? normalizedSource.slice(match[0].length) : normalizedSource,
		bodyStartLine: match ? match[0].split('\n').length : 1,
	};
}
