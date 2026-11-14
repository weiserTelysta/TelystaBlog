import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ebookShelfHref, paginateShelf, shelfCategories } from '../src/lib/ebooks/shelf';

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

test('中图分类使用类号，空类不展示；总览和分类分页使用独立网址', () => {
	assert.deepEqual(shelfCategories([{ clcCode: 'B84' }, { clcCode: 'B351' }, { clcCode: 'I313' }, {}]), [
		{ code: 'B', label: '哲学、宗教', count: 2 }, { code: 'I', label: '文学', count: 1 },
	]);
	assert.equal(ebookShelfHref(), '/ebooks/');
	assert.equal(ebookShelfHref(2), '/ebooks/page/2/');
	assert.equal(ebookShelfHref(1, 'B'), '/ebooks/clc/B/');
	assert.equal(ebookShelfHref(3, 'B'), '/ebooks/clc/B/page/3/');
});
