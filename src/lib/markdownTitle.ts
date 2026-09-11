export function extractMarkdownTitle(markdown: string): string | undefined {
	const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
	let fence: '`' | '~' | undefined;

	for (const line of lines) {
		const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);

		if (fenceMatch) {
			const marker = fenceMatch[1][0] as '`' | '~';
			if (!fence) fence = marker;
			else if (fence === marker) fence = undefined;
			continue;
		}

		if (fence) continue;

		const heading = /^ {0,3}#(?!#)[ \t]+(.+?)\s*#*\s*$/.exec(line);
		if (heading) return normalizeMarkdownHeading(heading[1] ?? '');
	}

	return undefined;
}

export function resolvePostTitle(markdown: string, fallbackTitle: string): string {
	return extractMarkdownTitle(markdown) || fallbackTitle.trim();
}

function normalizeMarkdownHeading(value: string): string {
	return value
		.normalize('NFKC')
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[*_`~]/g, '')
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}
