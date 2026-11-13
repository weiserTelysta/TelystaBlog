import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ebookSchema, ebookHref } from '../src/lib/ebooks/ebookSchema';
import { parseContentDocument, validateEbookDocuments } from '../scripts/lib/content-validation';

const book = { id: 'stable-book-01', title: '一本书', authors: ['作者'], description: '书籍简介', cover: 'https://assets.telysta.com/ebooks/stable-book-01/cover.webp', files: [{ format: 'EPUB', href: 'https://assets.telysta.com/ebooks/stable-book-01/v1/book.epub' }], draft: false };
test('公开书目要求作者、封面与文件；草稿不进入强制发布约束', () => {
	assert.equal(ebookSchema.safeParse(book).success, true);
	assert.equal(ebookSchema.safeParse({ id: 'draft', title: '草稿' }).success, true);
	for (const key of ['authors', 'cover', 'description', 'files']) {
		const invalid = { ...book, [key]: key === 'files' || key === 'authors' ? [] : '' };
		assert.equal(ebookSchema.safeParse(invalid).success, false, key);
	}
});
test('电子书仅接受独立 R2 前缀与正确格式，拒绝重复格式和无效日期', () => {
	for (const href of ['javascript:alert(1)', 'https://example.com/ebooks/book.epub', 'https://assets.telysta.com/avatars/book.epub', 'https://assets.telysta.com/ebooks/book.pdf']) {
		assert.equal(ebookSchema.safeParse({ ...book, files: [{ format: 'EPUB', href }] }).success, false, href);
	}
	assert.equal(ebookSchema.safeParse({ ...book, files: [...book.files, ...book.files] }).success, false);
	assert.equal(ebookSchema.safeParse({ ...book, updatedAt: '2026-02-30' }).success, false);
	assert.equal(ebookHref(book.id), ebookHref(ebookSchema.parse({ ...book, title: '改名后的书' }).id));
});
test('内容检查包含电子书错误与重复固定 ID', () => {
	const root = '/repo';
	const source = '---\nid: same\ntitle: 草稿\ndraft: true\n---\n';
	const docs = ['a', 'b'].map(name => parseContentDocument(`${root}/src/content/ebooks/${name}.md`, source, 'ebook', root));
	assert.ok(validateEbookDocuments(docs).some(issue => issue.code === 'ebook-id-duplicate'));
	const invalid = parseContentDocument(`${root}/src/content/ebooks/bad.md`, source.replace('draft: true', 'draft: false'), 'ebook', root);
	assert.ok(validateEbookDocuments([invalid]).some(issue => issue.code === 'ebook-invalid'));
});
