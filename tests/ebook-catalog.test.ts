import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseEbookCatalog, readEbookCatalogFiles, serializeEbookCatalog } from '../src/lib/ebooks/catalogFiles';
import { setEbookAccess } from '../scripts/set-ebook-access';

const book = { id: 'WEISER012345abcdef', title: '分类测试书', authors: ['测试作者'], description: '测试简介', files: [{ format: 'EPUB', href: 'https://library-files.telysta.com/books/original/book.epub' }], access: 'public', draft: false };
const value = () => ({ category: 'K', booklists: [{ clcCode: 'K27', clcName: '中华人民共和国史', books: [{ ...book }] }] });
function fixture(t: TestContext) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'telysta-catalog-'));
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	const directory = path.join(root, 'src/content/ebooks/catalog'); fs.mkdirSync(directory, { recursive: true });
	const file = path.join(directory, 'K.json'); fs.writeFileSync(file, JSON.stringify(value()));
	return { root, file };
}
test('书单继承细类，分类修订保留固定ID和原始对象URL', () => {
	const original = parseEbookCatalog('K.json', value());
	assert.equal(original.books[0].clcCode, 'K27');
	assert.equal(original.books[0].clcName, '中华人民共和国史');
	const changed = { ...original.books[0], clcCode: 'K0', clcName: '史学理论' };
	const serialized = serializeEbookCatalog('K', [changed]);
	assert.equal(serialized.booklists[0].books[0].clcCode, undefined);
	const restored = parseEbookCatalog('K.json', serialized).books[0];
	assert.equal(restored.id, book.id); assert.deepEqual(restored.files, book.files);
	assert.equal(restored.clcCode, 'K0');
});
test('拒绝放错大类、书单与书籍类号冲突、重复ID和完整私有资料', t => {
	assert.throws(() => parseEbookCatalog('K.json', { category: 'K', booklists: [{ clcCode: 'B0', clcName: '错误分类', books: [book] }] }));
	const mismatched = value(); Object.assign(mismatched.booklists[0].books[0], { clcCode: 'K1' });
	assert.throws(() => parseEbookCatalog('K.json', mismatched));
	assert.throws(() => parseEbookCatalog('K.json', { category: 'K', books: [{ ...book, access: 'protected' }] }));
	const { root, file } = fixture(t), duplicate = value(); duplicate.booklists[0].books.push({ ...book });
	fs.writeFileSync(file, JSON.stringify(duplicate)); assert.throws(() => readEbookCatalogFiles(root), /重复/);
});
test('上锁保留本地完整书目，公开占位不泄露信息，恢复不改变身份或文件', t => {
	const { root, file } = fixture(t);
	setEbookAccess(root, book.id, 'protected');
	const publicData = fs.readFileSync(file, 'utf8');
	assert.ok(!publicData.includes(book.title) && !publicData.includes(book.authors[0]) && !publicData.includes(book.files[0].href));
	const privateFile = path.join(root, '.library-private/catalog/K.json');
	assert.equal(fs.statSync(privateFile).mode & 0o777, 0o600);
	assert.equal(parseEbookCatalog(privateFile, JSON.parse(fs.readFileSync(privateFile, 'utf8')), false).books[0].title, book.title);
	setEbookAccess(root, book.id, 'public');
	const restored = readEbookCatalogFiles(root)[0].books[0];
	assert.equal(restored.id, book.id); assert.equal(restored.title, book.title); assert.deepEqual(restored.files, book.files);
	assert.equal(parseEbookCatalog(privateFile, JSON.parse(fs.readFileSync(privateFile, 'utf8')), false).books.length, 0);
});
test('缺失私有完整书目时停止恢复，不破坏已有占位', t => {
	const { root, file } = fixture(t); setEbookAccess(root, book.id, 'protected');
	const before = fs.readFileSync(file, 'utf8'); fs.rmSync(path.join(root, '.library-private/catalog/K.json'));
	assert.throws(() => setEbookAccess(root, book.id, 'public'), /缺失/);
	assert.equal(fs.readFileSync(file, 'utf8'), before);
});
