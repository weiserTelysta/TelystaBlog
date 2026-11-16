import { test } from 'node:test';
import assert from 'node:assert/strict';
import { booksInCategory, ebookShelfHref, filterShelf, paginateShelf, shelfBooklists, shelfCategories, shelfPageNumbers, sortShelfBooks } from '../src/lib/ebooks/shelf';
import { normalizeEbookTitle } from '../src/lib/ebooks/metadata';

test('书架每页24项，完整覆盖且不重复，边缘页与越界明确', () => {
	const books = Array.from({ length: 697 }, (_, i) => i);
	const pages = Array.from({ length: 30 }, (_, i) => paginateShelf(books, i + 1));
	assert.equal(pages[0].items.length, 24);
	assert.equal(pages[29].items.length, 1);
	assert.deepEqual(pages.flatMap(page => page.items), books);
	assert.throws(() => paginateShelf(books, 31));
	assert.throws(() => paginateShelf(books, 0));
	assert.deepEqual(paginateShelf([]).items, []);
});

test('仅书单条目不通过总览或大类搜索泄漏，二级书单按细类精确筛选', () => {
	const books = [
		{ title: '普通图书', authors: ['甲'], clcCode: 'B84', files: [{ format: 'PDF' }] },
		{ title: '专题研究', authors: ['乙'], clcCode: 'B84', files: [{ format: 'EPUB' }], categoryOnly: true },
		{ title: '其他专题', authors: ['丙'], clcCode: 'B841', files: [{ format: 'EPUB' }] },
	];
	assert.equal(booksInCategory(books).length, 2);
	assert.deepEqual(filterShelf(books, undefined, '专题研究'), []);
	assert.deepEqual(filterShelf(books, 'B', '乙'), []);
	assert.deepEqual(filterShelf(books, undefined, '乙', 'EPUB', 'B84'), [books[1]]);
	assert.deepEqual(filterShelf(books, undefined, '乙', 'PDF', 'B84'), []);
	assert.deepEqual(booksInCategory(books, undefined, 'B84'), books.slice(0, 2));
	assert.equal(shelfBooklists(books, 'B')[0].count, 2);
	assert.equal(shelfCategories([books[1]])[0].code, 'B');
	assert.deepEqual(booksInCategory([books[1]], 'B'), []);
});

test('范围类号生成单段书单地址，碰撞显式失败；页码保留首末页', () => {
	assert.equal(ebookShelfHref(2, undefined, 'F13/17'), '/ebooks/booklists/F13-17/page/2/');
	assert.throws(() => shelfBooklists([{ clcCode: 'F13/17' }, { clcCode: 'F13-17' }]));
	for (let page = 1; page <= 27; page++) {
		const numbers = shelfPageNumbers(page, 27).filter(Boolean);
		assert.equal(numbers[0], 1); assert.equal(numbers.at(-1), 27);
		assert.ok(numbers.includes(page)); assert.equal(new Set(numbers).size, numbers.length);
	}
});

test('仅去除包裹整个题名的成对引号，保留题名内部标点', () => {
	assert.equal(normalizeEbookTitle('"玛拉兹英灵录 卷二：死屋之门"'), '玛拉兹英灵录 卷二：死屋之门');
	assert.equal(normalizeEbookTitle('《“书名”》'), '书名');
	assert.equal(normalizeEbookTitle('‘Private Pleasures’ of the Mughal Empire'), '‘Private Pleasures’ of the Mughal Empire');
});

test('中图分类使用类号，空类不展示；总览和分类分页使用独立网址', () => {
	assert.deepEqual(shelfCategories([{ clcCode: 'B84' }, { clcCode: 'B351' }, { clcCode: 'I313' }, {}]), [
		{ code: 'B', label: '哲学、宗教', count: 2 }, { code: 'I', label: '文学', count: 1 },
	]);
	assert.equal(ebookShelfHref(), '/ebooks/');
	assert.equal(ebookShelfHref(2), '/ebooks/page/2/');
	assert.equal(ebookShelfHref(1, 'B'), '/ebooks/clc/B/');
	assert.equal(ebookShelfHref(3, 'B'), '/ebooks/clc/B/page/3/');
});


test('公共书架与认证目录使用同一稳定排序，同名书按 ID 决胜', () => {
 const books = [{ id: 'b', title: '《书名》' }, { id: 'a', title: '书名' }, { id: 'c', title: '另一册' }];
 const expected = sortShelfBooks(books);
 assert.deepEqual(sortShelfBooks([...books].reverse()), expected);
 assert.ok(expected.findIndex(book => book.id === 'a') < expected.findIndex(book => book.id === 'b'));
 assert.deepEqual(books.map(book => book.id), ['b', 'a', 'c']);
 assert.deepEqual(paginateShelf(expected, 2, 1).items, paginateShelf(sortShelfBooks([...books].reverse()), 2, 1).items);
});
