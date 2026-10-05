import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import { buildPostExcerpt } from '../../src/lib/blogExcerpt';
import { extractMarkdownTitle } from '../../src/lib/markdownTitle';
import { splitMarkdownSource } from '../../src/lib/markdownSource';
import type { ContentDocument } from '../lib/content-validation';

/** Suggestions are read-only; accepting one still uses the existing YAML patcher. */
export function writingContext(
	source: string,
	relative: string,
	posts: ContentDocument[],
) {
	const { body, bodyStartLine } = splitMarkdownSource(source);
	const title = extractMarkdownTitle(body);
	const excerpt = buildPostExcerpt(body, '');
	const orders: Record<string, number> = {};
	for (const post of posts) {
		if (post.kind !== 'post' || post.relativePath === relative) continue;
		const { series, seriesOrder } = post.frontmatter;
		if (
			typeof series === 'string' &&
			Number.isInteger(seriesOrder) &&
			Number(seriesOrder) > 0
		)
			orders[series] = Math.max(orders[series] ?? 0, Number(seriesOrder));
	}
	const hints: { message: string; line: number }[] = [];
	const tree = unified().use(remarkParse).use(remarkMath).parse(body);
	const lines = body.split('\n');
	for (const node of tree.children) {
		if (node.type !== 'heading' || !node.position) continue;
		const after = node.position.end.line;
		if (after < lines.length && lines[after].trim())
			hints.push({
				message: '标题后建议留一行空行，便于阅读和 Markdown 格式检查。',
				line: bodyStartLine + after - 1,
			});
	}
	return {
		title: title ?? '',
		excerpt,
		seriesOrders: Object.fromEntries(
			Object.entries(orders).map(([id, order]) => [id, order + 1]),
		),
		hints,
	};
}
