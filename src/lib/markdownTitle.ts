import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Nodes } from 'mdast';

const parser = unified().use(remarkParse);

export function extractMarkdownTitle(markdown: string): string | undefined {
	const heading = parser.parse(markdown).children.find(node => node.type === 'heading' && node.depth === 1);
	return heading ? readText(heading).normalize('NFKC').replace(/\s+/g, ' ').trim() || undefined : undefined;
}

export function resolvePostTitle(markdown: string, fallbackTitle: string): string {
	return extractMarkdownTitle(markdown) || fallbackTitle.trim();
}

function readText(node: Nodes): string {
	if (node.type === 'html') return '';
	if ('value' in node) return node.value;
	if ('alt' in node) return node.alt ?? '';
	return 'children' in node ? node.children.map(readText).join('') : '';
}
