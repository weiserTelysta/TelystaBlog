import { z } from 'astro/zod';
import { getCdnAssetManifest } from '../cdnAssets';
import { parseContentDate } from '../contentDate';
import { LIBRARY_FILE_ORIGIN } from '../../config/library';
import { normalizeEbookTitle } from './metadata';

export const EBOOK_FORMATS = ['PDF', 'EPUB', 'MOBI', 'AZW3'] as const;
const origin = new URL(getCdnAssetManifest().origin).origin;

export function isEbookAssetUrl(value: string, format?: string): boolean {
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:' || url.username || url.password) return false;
		const legacyAsset = url.origin === origin && url.pathname.startsWith('/ebooks/');
		const libraryAsset = url.origin === LIBRARY_FILE_ORIGIN && url.pathname.startsWith(format ? '/books/' : '/covers/');
		if (!legacyAsset && !libraryAsset) return false;
		return format ? url.pathname.toLowerCase().endsWith(`.${format.toLowerCase()}`) : /\.(webp|png|jpe?g|avif)$/i.test(url.pathname);
	} catch { return false; }
}

const date = z.preprocess(value => parseContentDate(value) ?? value, z.date());
export const ebookSchema = z.object({
	id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/, 'id 必须为固定保存的英文、数字、连字符或下划线，最长 64 字符。'),
	title: z.string().trim().min(1).transform(normalizeEbookTitle),
	authors: z.array(z.string().trim().min(1)).default([]),
	authorStatus: z.enum(['unreviewed', 'verified', 'anonymous', 'partial-collection']).optional(),
	clcCode: z.string().optional(),
	clcName: z.string().optional(),
	categoryOnly: z.boolean().default(false),
	access: z.enum(['public', 'protected']).default('public'),
	privateStub: z.boolean().default(false),
	notes: z.string().optional(),
	translator: z.string().trim().optional(),
	language: z.string().trim().optional(),
	publisher: z.string().trim().optional(),
	publicationYear: z.number().int().positive().optional(),
	description: z.string().trim().default(''),
	cover: z.string().refine(value => !value || isEbookAssetUrl(value), '封面须为书库 covers/ 或原 R2 ebooks/ 下的图片 URL。').optional(),
	files: z.array(z.object({
		format: z.enum(EBOOK_FORMATS),
		href: z.string(),
		bytes: z.number().int().positive().optional(),
	}).superRefine((file, context) => {
		if (!isEbookAssetUrl(file.href, file.format)) context.addIssue({ code: 'custom', path: ['href'], message: '文件须为书库 books/ 或原 R2 ebooks/ 下与 format 对应的 HTTPS 文件 URL。' });
	})).default([]),
	draft: z.boolean().default(true),
	publishedAt: date.optional(),
	updatedAt: date.optional(),
}).superRefine((book, context) => {
	if (!book.draft && !book.privateStub) {
		for (const [field, valid] of [['authors', book.authors.length], ['description', book.description], ['files', book.files.length]] as const) {
			if (!valid) context.addIssue({ code: 'custom', path: [field], message: `公开书目必须填写 ${field}。` });
		}
	}
	if (book.privateStub && (book.access !== 'protected' || book.title !== '受保护书籍' || book.authors.length || book.files.length || book.cover || book.notes || book.description || book.translator || book.language || book.publisher || book.publicationYear)) context.addIssue({ code: 'custom', message: '公开目录中的受保护占位只能保存固定ID、分类和保护状态，完整资料放入 .library-private/catalog/。' });
	const formats = book.files.map(file => file.format);
	if (new Set(formats).size !== formats.length) context.addIssue({ code: 'custom', path: ['files'], message: '同一本书的文件格式不能重复。' });
});

export type EbookData = z.infer<typeof ebookSchema>;
export function ebookHref(id: string) { return `/ebooks/${encodeURIComponent(id)}/`; }
