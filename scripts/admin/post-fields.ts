import { isMap, isNode, isScalar, isSeq, parseDocument } from 'yaml';
import { completePostMetadata } from '../../src/lib/postMetadata';
import { splitMarkdownSource } from '../../src/lib/markdownSource';
import { AdminError } from './store';

export const postFieldNames = [
	'title',
	'titleEn',
	'description',
	'descriptionEn',
	'publishedAt',
	'updatedAt',
	'category',
	'series',
	'seriesOrder',
	'draft',
	'tags',
	'cover',
] as const;

function parseSource(source: string) {
	const candidate = /^(\uFEFF?---\r?\n)([\s\S]*?)(^---(?:\r?\n|$))/m.exec(
		source,
	);
	const match = candidate?.index === 0 ? candidate : null;
	if (!match && /^\uFEFF?\s*---/.test(source))
		throw new AdminError('请先修复 frontmatter 分隔符');
	const yamlText = match?.[2] ?? '';
	const doc = parseDocument(yamlText, { uniqueKeys: true });
	if (doc.errors.length || (doc.contents !== null && !isMap(doc.contents)))
		throw new AdminError(
			'请先在源码中修复 YAML：' + doc.errors.map((e) => e.message).join('；'),
		);
	return { match, yamlText, doc };
}

export function describePost(
	source: string,
	relative: string,
	categoryIds?: ReadonlySet<string>,
) {
	const { doc } = parseSource(source);
	const authored = (doc.toJS() ?? {}) as Record<string, unknown>;
	return {
		authored,
		metadata: completePostMetadata(
			authored,
			splitMarkdownSource(source).body,
			relative,
			categoryIds,
		),
	};
}

function hasProtectedSyntax(node: unknown): boolean {
	if (!isNode(node)) return false;
	if (('anchor' in node && node.anchor) || node.tag) return true;
	if (isScalar(node))
		return Boolean(node.type?.startsWith('BLOCK') && node.comment);
	if (isSeq(node))
		return node.items.some(
			(item) =>
				isNode(item) &&
				(item.comment || item.commentBefore || hasProtectedSyntax(item)),
		);
	return true;
}

/** Patch only selected YAML value ranges. Body and unrelated fields never pass through a serializer. */
export function patchPostFields(
	source: string,
	patch: Record<string, unknown>,
) {
	if (!patch || typeof patch !== 'object' || Array.isArray(patch))
		throw new AdminError('字段修改必须是对象');
	const { match, yamlText, doc } = parseSource(source);
	const newline = source.includes('\r\n') ? '\r\n' : '\n';
	const edits: { start: number; end: number; text: string }[] = [];
	const additions: string[] = [];
	for (const [key, value] of Object.entries(patch)) {
		if (!(postFieldNames as readonly string[]).includes(key))
			throw new AdminError(`不允许通过表单修改 ${key}`);
		if (
			key === 'draft'
				? typeof value !== 'boolean'
				: key === 'seriesOrder'
					? value !== null && (!Number.isInteger(value) || Number(value) < 1)
					: key === 'tags'
						? !Array.isArray(value) || value.some((v) => typeof v !== 'string')
						: value !== null && typeof value !== 'string'
		)
			throw new AdminError(`${key} 类型无效`);
		if (typeof value === 'string' && value.length > 40000)
			throw new AdminError('字段内容过长');
		if (['publishedAt', 'updatedAt'].includes(key) && value !== null) {
			const date = String(value),
				parsed = new Date(date);
			if (
				!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
				!Number.isFinite(parsed.valueOf()) ||
				parsed.toISOString().slice(0, 10) !== date
			)
				throw new AdminError('日期应为有效的 YYYY-MM-DD');
		}
		const old = doc.get(key);
		if (
			JSON.stringify(old) === JSON.stringify(value) ||
			(!doc.has(key) && value === null)
		)
			continue;
		const node = doc.get(key, true);
		const encoded = JSON.stringify(value);
		if (!doc.has(key)) {
			additions.push(`${key}: ${encoded}`);
			continue;
		}
		if (!isNode(node) || !node.range || hasProtectedSyntax(node))
			throw new AdminError(
				`${key} 包含复杂 YAML 节点、锚点或列表注释，请在源码中编辑此字段`,
			);
		const [start, end] = node.range;
		const original = yamlText.slice(start, end);
		const prefix = start > 0 && yamlText[start - 1] === ':' ? ' ' : '';
		edits.push({
			start,
			end,
			text: prefix + encoded + (/\r?\n$/.test(original) ? newline : ''),
		});
	}
	if (!edits.length && !additions.length) return source;
	let next = yamlText;
	for (const edit of edits.sort((a, b) => b.start - a.start))
		next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
	if (additions.length)
		next +=
			(next && !next.endsWith('\n') ? newline : '') +
			additions.join(newline) +
			newline;
	const bom = source.startsWith('\uFEFF') ? '\uFEFF' : '';
	const result = match
		? match[1] + next + source.slice(match[1].length + yamlText.length)
		: `${bom}---${newline}${next}---${newline}${newline}${source.slice(bom.length)}`;
	const resultDoc = parseSource(result).doc;
	for (const [key, value] of Object.entries(patch))
		if (
			!(value === null && !resultDoc.has(key)) &&
			JSON.stringify(resultDoc.toJS()?.[key]) !== JSON.stringify(value)
		)
			throw new AdminError('字段往返校验失败，没有改写源码');
	return result;
}
