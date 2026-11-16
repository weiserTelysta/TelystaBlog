import { HttpError } from './http';
import manifest from '../../../src/generated/cdn-assets.json';
import {
	RESOURCE_ACTION_TYPES,
	RESOURCE_STATUS_IDS,
	RESOURCE_TYPE_IDS
} from '../../../src/config/content/resourceTypes';

const imageHosts = new Set(['assets.telysta.com', 'library-files.telysta.com']);
const formats = new Set(['PDF', 'EPUB', 'MOBI', 'AZW3']);
const record = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
function invalid(field: string, message = '此字段的内容无效。'): never {
	throw new HttpError(400, message, 'DOCUMENT_INVALID', field);
}
function text(value: unknown, field: string, max = 40000, required = false) {
	if (
		typeof value !== 'string' ||
		value.length > max ||
		value.includes('\0') ||
		(required && !value.trim())
	)
		invalid(field);
	return value;
}
export function safeLink(value: string) {
	if (
		value.startsWith('/') &&
		!value.startsWith('//') &&
		!/[\\\r\n\u0000-\u001f]/.test(value)
	)
		return true;
	try {
		const url = new URL(value);
		return (
			!url.username &&
			!url.password &&
			['https:', 'mailto:'].includes(url.protocol) &&
			!/[\r\n\u0000-\u001f]/.test(value)
		);
	} catch {
		return false;
	}
}
function image(value: unknown, field: string, kind: string) {
	const source = text(value, field, 4000);
	if (!source) return;
	if (kind === 'post') {
		if (!source.startsWith('/images/posts/') || /[\\\r\n]/.test(source))
			invalid(field, '文章封面应使用 posts 图片路径。');
		return;
	}
	if (source.startsWith('asset:')) {
		if (kind === 'ebook' || !Object.hasOwn(manifest.assets, source.slice(6)))
			invalid(field, '请选择已收录的图片。');
		return;
	}
	try {
		const url = new URL(source);
		if (
			url.protocol !== 'https:' ||
			url.username ||
			url.password ||
			!imageHosts.has(url.hostname) ||
			url.port ||
			!/\.(webp|png|jpe?g|avif)$/i.test(url.pathname)
		)
			invalid(field, '图片地址须属于本站图片或书库服务。');
		if (
			kind === 'ebook' &&
			!(
				(url.origin === 'https://library-files.telysta.com' &&
					url.pathname.startsWith('/covers/')) ||
				(url.origin === manifest.origin && url.pathname.startsWith('/ebooks/'))
			)
		)
			invalid(field, '书籍封面应使用 covers 目录。');
	} catch (error) {
		if (error instanceof HttpError) throw error;
		invalid(field, '图片地址无效。');
	}
}
export function validateDocumentFields(
	kind: string,
	patch: Record<string, unknown>
) {
	for (const [key, value] of Object.entries(patch)) {
		if (
			value === null &&
			[
				'publicationYear',
				'seriesOrder',
				'publishedAt',
				'updatedAt',
				'series',
				'cover',
				'preview'
			].includes(key)
		)
			continue;
		if (['draft', 'categoryOnly'].includes(key)) {
			if (typeof value !== 'boolean') invalid(key);
			continue;
		}
		if (['publicationYear', 'seriesOrder'].includes(key)) {
			if (
				!Number.isSafeInteger(value) ||
				Number(value) < 1 ||
				Number(value) > 100000
			)
				invalid(key);
			continue;
		}
		if (['authors', 'tags', 'formats'].includes(key)) {
			if (!Array.isArray(value) || value.length > 100) invalid(key);
			for (const item of value) text(item, key, 300, true);
			continue;
		}
		if (['files', 'gallery', 'credits', 'actions'].includes(key)) {
			if (!Array.isArray(value) || value.length > 100) invalid(key);
			const seen = new Set<string>();
			for (const [index, item] of value.entries()) {
				const field = key + '.' + index;
				if (
					!record(item) ||
					Object.keys(item).some((k) =>
						['__proto__', 'prototype', 'constructor'].includes(k)
					)
				)
					invalid(field);
				if (key === 'files') {
					const format = text(item.format, field + '.format', 10, true),
						href = text(item.href, field + '.href', 4000, true);
					if (!formats.has(format) || seen.has(format))
						invalid(field + '.format', '格式不存在或重复。');
					seen.add(format);
					let url: URL;
					try {
						url = new URL(href);
					} catch {
						invalid(field + '.href');
					}
					if (
						url.protocol !== 'https:' ||
						url.username ||
						url.password ||
						url.port ||
						!(
							(url.origin === 'https://library-files.telysta.com' &&
								url.pathname.startsWith('/books/')) ||
							(url.origin === manifest.origin &&
								url.pathname.startsWith('/ebooks/'))
						) ||
						!url.pathname.toLowerCase().endsWith('.' + format.toLowerCase())
					)
						invalid(field + '.href', '文件地址与格式不匹配，或不属于书库。');
					if (
						item.bytes !== undefined &&
						(!Number.isSafeInteger(item.bytes) || Number(item.bytes) < 1)
					)
						invalid(field + '.bytes');
				} else if (key === 'gallery') {
					image(item.src, field + '.src', kind);
					for (const k of ['alt', 'label'])
						if (item[k] !== undefined) text(item[k], field + '.' + k, 1000);
				} else if (key === 'credits') {
					text(item.label, field + '.label', 300, true);
					text(item.name, field + '.name', 300, true);
					if (
						item.href !== undefined &&
						!safeLink(text(item.href, field + '.href', 4000, true))
					)
						invalid(field + '.href');
				} else {
					if (
						!(RESOURCE_ACTION_TYPES as readonly unknown[]).includes(item.type)
					)
						invalid(field + '.type');
					text(item.label, field + '.label', 300, true);
					for (const k of ['disabled', 'primary'])
						if (item[k] !== undefined && typeof item[k] !== 'boolean')
							invalid(field + '.' + k);
					if (!item.disabled && !item.href) invalid(field + '.href');
					if (
						item.href !== undefined &&
						!safeLink(text(item.href, field + '.href', 4000, true))
					)
						invalid(field + '.href');
					for (const k of ['format', 'provider', 'code', 'note'])
						if (item[k] !== undefined) text(item[k], field + '.' + k, 2000);
				}
			}
			continue;
		}
		text(
			value,
			key,
			['title', 'titleEn'].includes(key) ? 300 : 40000,
			['title', 'titleEn'].includes(key)
		);
		if (['title', 'titleEn'].includes(key) && /[\r\n]/.test(String(value)))
			invalid(key, '标题应为一行文字。');
		if (['cover', 'preview', 'image'].includes(key)) image(value, key, kind);
		if (
			key === 'type' &&
			!(RESOURCE_TYPE_IDS as readonly unknown[]).includes(value)
		)
			invalid(key);
		if (
			key === 'status' &&
			!(RESOURCE_STATUS_IDS as readonly unknown[]).includes(value)
		)
			invalid(key);
		if (
			key === 'authorStatus' &&
			!['unreviewed', 'verified', 'anonymous', 'partial-collection'].includes(
				String(value)
			)
		)
			invalid(key);
		if (
			key === 'clcCode' &&
			!/^[A-Z][A-Z0-9./+()=-]{0,30}$/.test(String(value))
		)
			invalid(key, '请使用有效的中图类号。');
	}
}
