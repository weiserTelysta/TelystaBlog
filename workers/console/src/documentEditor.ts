import { parseDocument } from 'yaml';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toString } from 'mdast-util-to-string';
import { HttpError } from './http';
import {
	CONFIG_DEFINITIONS,
	configSections,
	patchConfig
} from './configEditor';
import { BLOG_CATEGORIES } from '../../../src/config/content/blogCategories';
import { BLOG_SERIES, type BlogSeries } from '../../../src/config/content/blogSeries';
import manifest from '../../../src/generated/cdn-assets.json';
import { validateDocumentFields } from './documentFields';
import { RESOURCE_TYPES } from '../../../src/config/content/resourceTypes';
import { LIBRARY_CLASSES } from '../../../src/config/library';

export type DocumentRecord = {
	id: string;
	kind: string;
	source: string;
	source_path?: string | null;
	title: string;
	access: string;
	revision: number;
	owner_id?: string | null;
	state?: string;
	updated_at?: number;
};
const fields: Record<string, string[]> = {
	post: [
		'title',
		'titleEn',
		'description',
		'descriptionEn',
		'publishedAt',
		'updatedAt',
		'category',
		'tags',
		'series',
		'seriesOrder',
		'draft',
		'cover'
	],
	gallery: [
		'title',
		'summary',
		'type',
		'status',
		'image',
		'cover',
		'preview',
		'gallery',
		'credits',
		'license',
		'formats',
		'publishedAt',
		'updatedAt',
		'actions'
	],
	ebook: [
		'title',
		'authors',
		'authorStatus',
		'translator',
		'publisher',
		'publicationYear',
		'language',
		'description',
		'clcCode',
		'clcName',
		'categoryOnly',
		'notes',
		'cover',
		'files',
		'draft',
		'publishedAt',
		'updatedAt'
	],
	score: ['title', 'subtitle', 'poet', 'composer', 'copyright']
};
function split(source: string) {
	const match = /^(?:\uFEFF)?---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(
		source
	);
	if (!match) throw new HttpError(400, '内容缺少有效的元信息。');
	const doc = parseDocument(match[1], { uniqueKeys: true });
	if (doc.errors.length) throw new HttpError(400, '元信息格式有误。');
	const value = doc.toJS({ maxAliasCount: 0 });
	if (!value || typeof value !== 'object' || Array.isArray(value))
		throw new HttpError(400, '元信息需要是对象。');
	return {
		doc,
		value: value as Record<string, unknown>,
		body: source.slice(match[0].length),
		newline: source.includes('\r\n') ? '\r\n' : '\n'
	};
}
function firstHeading(body: string) {
	const heading = fromMarkdown(body).children.find(
		(node) => node.type === 'heading' && node.depth === 1
	);
	if (
		!heading ||
		heading.position?.start.offset === undefined ||
		heading.position.end.offset === undefined
	)
		return null;
	return {
		start: heading.position.start.offset,
		end: heading.position.end.offset,
		title: toString(heading, { includeHtml: false })
			.normalize('NFKC')
			.replace(/\s+/g, ' ')
			.trim()
	};
}
export function describeDocument(record: DocumentRecord) {
	try {
		if (record.kind === 'config')
			return {
				format: 'settings',
				sections: configSections(record.source, record.source_path || '')
			};
		if (record.kind === 'ebook') {
			const value = JSON.parse(record.source);
			return {
				format: 'book',
				fields: value,
				body: '',
				preview: assetImage(value.cover)
			};
		}
		if (record.kind === 'score') {
			const data: Record<string, unknown> = {};
			for (const key of fields.score) {
				const match = new RegExp('^' + key + '=(.*)$', 'm').exec(record.source);
				data[key] = match?.[1] || '';
			}
			return {
				format: 'score',
				fields: data,
				body: record.source.replace(
					/^(?:title|subtitle|poet|composer|copyright)=.*\r?\n/gm,
					''
				)
			};
		}
		const parsed = split(record.source);
		let body = parsed.body;
		const value = { ...parsed.value };
		if (record.kind === 'post') {
			const heading = firstHeading(body);
			value.title = heading?.title || value.title || record.title;
			if (heading)
				body =
					body.slice(0, heading.start) +
					body.slice(heading.end).replace(/^\r?\n/, '');
		}
		return {
			format: record.kind === 'post' ? 'article' : 'artwork',
			fields: value,
			body: body.replace(/^\s*\n/, ''),
			preview: assetImage(String(value.cover || value.image || ''))
		};
	} catch (error) {
		return {
			format: 'advanced',
			error: error instanceof Error ? error.message : '无法读取此内容。'
		};
	}
}
function object(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}
function validate(kind: string, patch: Record<string, unknown>, series: readonly BlogSeries[]) {
	for (const [key, value] of Object.entries(patch)) {
		if (!fields[kind]?.includes(key))
			throw new HttpError(400, '该字段不能通过此表单修改。');
		if (
			typeof value === 'string' &&
			(value.length > 40000 || value.includes('\0'))
		)
			throw new HttpError(400, '文本内容过长或无效。');
		if (['draft', 'categoryOnly'].includes(key) && typeof value !== 'boolean')
			throw new HttpError(400, '开关值无效。');
		if (
			['authors', 'tags', 'formats'].includes(key) &&
			(!Array.isArray(value) ||
				value.length > 100 ||
				value.some((v) => typeof v !== 'string' || v.length > 300))
		)
			throw new HttpError(400, '列表内容无效。');
		if (
			['seriesOrder', 'publicationYear'].includes(key) &&
			value !== null &&
			(!Number.isSafeInteger(value) || Number(value) < 1)
		)
			throw new HttpError(400, '请输入有效的正整数。');
		if (['publishedAt', 'updatedAt'].includes(key) && value !== null) {
			const date = String(value);
			if (
				!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
				!Number.isFinite(Date.parse(date)) ||
				new Date(date).toISOString().slice(0, 10) !== date
			)
				throw new HttpError(400, '请输入有效日期。');
		}
		if (
			key === 'category' &&
			!(BLOG_CATEGORIES as readonly { id: string }[]).some(
				(v) => v.id === value
			)
		)
			throw new HttpError(400, '文章分类不存在。');
		if (
			key === 'series' &&
			value !== null &&
			value !== '' &&
			!series.some((v) => v.id === value)
		)
			throw new HttpError(400, '文章系列不存在。');
		if (
			['files', 'gallery', 'credits', 'actions'].includes(key) &&
			(!Array.isArray(value) ||
				value.length > 100 ||
				value.some((v) => !object(v)))
		)
			throw new HttpError(400, '条目列表无效。');
	}
}
export function patchDocument(
	record: DocumentRecord,
	input: Record<string, unknown>,
	series: readonly BlogSeries[] = BLOG_SERIES
) {
	if (record.kind === 'config') {
		const source = patchConfig(
			record.source,
			record.source_path || '',
			String(input.section || ''),
			input.patches
		);
		return { source, title: record.title, access: record.access };
	}
	if (!object(input.fields) || JSON.stringify(input.fields).length > 500000)
		throw new HttpError(400, '表单数据无效。');
	validate(record.kind, input.fields, series);
	validateDocumentFields(record.kind, input.fields);
	const patch = input.fields;
	if (
		input.body !== undefined &&
		(typeof input.body !== 'string' ||
			input.body.length > 1000000 ||
			input.body.includes('\0'))
	)
		throw new HttpError(400, '正文无效或过长。');
	const access = input.access === undefined ? record.access : input.access;
	if (!['public', 'protected'].includes(String(access)))
		throw new HttpError(400, '访问范围无效。');
	if (record.kind === 'ebook') {
		const before = JSON.parse(record.source),
			value = { ...before, ...patch, access };
		for (const key of ['publicationYear', 'publishedAt', 'updatedAt'])
			if (value[key] === null) delete value[key];
		return {
			source: JSON.stringify(value, null, 2),
			title: String(value.title || record.title),
			access: String(access)
		};
	}
	if (record.kind === 'score') {
		let source =
			typeof input.body === 'string'
				? input.body
				: record.source.replace(
						/^(?:title|subtitle|poet|composer|copyright)=.*\r?\n/gm,
						''
					);
		const before = describeDocument(record).fields || {},
			data = { ...before, ...patch };
		source =
			fields.score
				.map((key) =>
					data[key] ? key + '=' + String(data[key]).replace(/[\r\n]/g, ' ') : ''
				)
				.filter(Boolean)
				.join('\n') +
			'\n\n' +
			source;
		return {
			source,
			title: String(data.title || record.title),
			access: String(access)
		};
	}
	const parsed = split(record.source);
	let body = typeof input.body === 'string' ? input.body : parsed.body;
	for (const [key, value] of Object.entries(patch)) {
		if (
			value === null ||
			(value === '' && ['series', 'cover', 'preview'].includes(key))
		)
			parsed.doc.delete(key);
		else parsed.doc.set(key, value);
	}
	if (record.kind === 'post') {
		const title =
			typeof patch.title === 'string'
				? patch.title
				: String(describeDocument(record).fields?.title || record.title);
		const heading = firstHeading(body);
		if (heading)
			body =
				body.slice(0, heading.start) + '# ' + title + body.slice(heading.end);
		else if (firstHeading(parsed.body))
			body = '# ' + title + '\n\n' + body.replace(/^\s*\n/, '');
		const data = parsed.doc.toJS({ maxAliasCount: 0 });
		if (Boolean(data.series) !== (data.seriesOrder !== undefined))
			throw new HttpError(400, '选择系列时，请同时填写章节顺序。');
		if (data.series) {
			const s = series.find((s) => s.id === data.series);
			if (s && s.category !== data.category)
				throw new HttpError(400, '系列与文章分类不匹配。');
		}
		return {
			source:
				'---' +
				parsed.newline +
				parsed.doc.toString().trimEnd().replace(/\n/g, parsed.newline) +
				parsed.newline +
				'---' +
				parsed.newline +
				'\n' +
				body.replace(/^\s*\n/, ''),
			title,
			access: String(access)
		};
	}
	return {
		source:
			'---\n' +
			parsed.doc.toString().trimEnd() +
			'\n---\n\n' +
			body.replace(/^\s*\n/, ''),
		title: String(patch.title || parsed.value.title || record.title),
		access: String(access)
	};
}
export function assetImage(value?: string) {
	if (!value) return '';
	if (value.startsWith('asset:')) {
		const row = (
			manifest.assets as Record<
				string,
				{ cover?: { path: string }; display?: { path: string } }
			>
		)[value.slice(6)];
		const path = row?.cover?.path || row?.display?.path;
		return path ? new URL(path, manifest.origin).href : '';
	}
	try {
		const url = new URL(value);
		return url.protocol === 'https:' &&
			!url.username &&
			!url.password &&
			['assets.telysta.com', 'library-files.telysta.com'].includes(url.hostname)
			? url.href
			: '';
	} catch {
		return '';
	}
}
export function editorOptions(series: readonly BlogSeries[] = BLOG_SERIES) {
	return {
		categories: BLOG_CATEGORIES.map((c) => ({
			id: c.id,
			title: c.title,
			titleEn: c.titleEn
		})),
		series: series.map((s) => ({
			id: s.id,
			title: s.title,
			titleEn: s.titleEn,
			category: s.category
		})),
		resourceTypes: RESOURCE_TYPES.map((v) => ({ id: v.id, title: v.label })),
		classes: LIBRARY_CLASSES,
		assets: Object.keys(manifest.assets).map((key) => ({
			value: 'asset:' + key,
			label: key,
			preview: assetImage('asset:' + key)
		})),
		settings: CONFIG_DEFINITIONS
	};
}
