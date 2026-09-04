const DEFAULT_EXCERPT_LENGTH = 180;
const MIN_PARAGRAPH_LENGTH = 24;

const PLACEHOLDER_PARAGRAPHS = new Set([
	'这里开始写正文。',
	'这里开始写正文',
	'Start writing here.',
]);

/**
 * Builds an archive excerpt from the first substantial prose paragraph.
 * Structural Markdown is ignored so the list does not repeat article headings,
 * formulas, media, or code before reaching the actual writing.
 */
export function buildPostExcerpt(
	body: string | undefined,
	fallback: string,
	maxLength = DEFAULT_EXCERPT_LENGTH,
): string {
	const paragraph = getProseParagraphs(body ?? '').find(
		(candidate) =>
			countCharacters(candidate) >= MIN_PARAGRAPH_LENGTH &&
			!PLACEHOLDER_PARAGRAPHS.has(candidate),
	);
	const excerpt = paragraph ?? cleanInlineMarkdown(fallback);

	return truncateExcerpt(excerpt, maxLength);
}

function getProseParagraphs(markdown: string): string[] {
	const visibleLines: string[] = [];
	let fenceCharacter: '`' | '~' | undefined;
	let fenceLength = 0;
	let inDisplayMath = false;

	for (const sourceLine of markdown.replace(/\r\n?/g, '\n').split('\n')) {
		const line = sourceLine.trim();
		const fenceMatch = /^(?<fence>`{3,}|~{3,})/.exec(line);

		if (fenceCharacter) {
			if (
				line.startsWith(fenceCharacter.repeat(fenceLength)) &&
				new RegExp(`^${fenceCharacter}{${fenceLength},}\\s*$`).test(line)
			) {
				fenceCharacter = undefined;
				fenceLength = 0;
			}
			visibleLines.push('');
			continue;
		}

		if (fenceMatch?.groups?.fence) {
			fenceCharacter = fenceMatch.groups.fence[0] as '`' | '~';
			fenceLength = fenceMatch.groups.fence.length;
			visibleLines.push('');
			continue;
		}

		if (line.startsWith('$$')) {
			const closesOnSameLine = line.length > 2 && line.slice(2).includes('$$');
			if (!closesOnSameLine) {
				inDisplayMath = !inDisplayMath;
			}
			visibleLines.push('');
			continue;
		}

		if (inDisplayMath || isStructuralMarkdownLine(line)) {
			visibleLines.push('');
			continue;
		}

		visibleLines.push(sourceLine);
	}

	return visibleLines
		.join('\n')
		.split(/\n\s*\n/)
		.map((block) => cleanInlineMarkdown(block.replace(/\s*\n\s*/g, ' ')))
		.filter(Boolean);
}

function isStructuralMarkdownLine(line: string): boolean {
	if (!line) {
		return false;
	}

	return (
		/^#{1,6}(?:\s|$)/.test(line) ||
		/^(?:[-+*]|\d+[.)])\s+/.test(line) ||
		/^>\s?/.test(line) ||
		/^!\[[^\]]*\](?:\([^)]*\)|\[[^\]]*\])\s*$/.test(line) ||
		/^\[[^\]]+\]:\s+/.test(line) ||
		/^\|.*\|\s*$/.test(line) ||
		/^:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)+\s*$/.test(line) ||
		/^(?:-{3,}|\*{3,}|_{3,})$/.test(line) ||
		/^<(?:!--|\/?[a-zA-Z][^>]*)>/.test(line)
	);
}

function cleanInlineMarkdown(value: string): string {
	return value
		.replace(/!\[[^\]]*\](?:\([^)]*\)|\[[^\]]*\])/g, '')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\$[^$\n]+\$/g, '')
		.replace(/<[^>]+>/g, '')
		.replace(/(?:\*\*|__|~~|\*|_)/g, '')
		.replace(/\\([\\`*_[\]{}()#+\-.!>])/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
}

function truncateExcerpt(value: string, maxLength: number): string {
	const characters = Array.from(value);
	const safeMaxLength = Math.max(1, Math.floor(maxLength));

	if (characters.length <= safeMaxLength) {
		return value;
	}

	const shortened = characters.slice(0, safeMaxLength).join('').trimEnd();
	const lastSpace = shortened.lastIndexOf(' ');
	const naturalCut =
		lastSpace >= Math.floor(safeMaxLength * 0.72)
			? shortened.slice(0, lastSpace).trimEnd()
			: shortened;

	return `${naturalCut.replace(/[，。！？、,.;:!?]+$/u, '')}…`;
}

function countCharacters(value: string): number {
	return Array.from(value).length;
}
