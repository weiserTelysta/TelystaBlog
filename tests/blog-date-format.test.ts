import assert from 'node:assert/strict';
import test from 'node:test';
import {
	formatArticleDate,
	formatFullDate,
	formatIndexDate,
	formatPostDate,
} from '../src/lib/blogDate';

test('文章页日期使用 AP 风格的紧凑月份写法', () => {
	assert.equal(formatArticleDate(new Date(2026, 0, 2, 12)), 'Jan. 2');
	assert.equal(formatArticleDate(new Date(2026, 4, 8, 12)), 'May 8');
	assert.equal(formatArticleDate(new Date(2026, 8, 4, 12)), 'Sept. 4');
	assert.equal(formatIndexDate(new Date(2026, 8, 4, 12)), 'Sept. 4, 2026');
});

test('紧凑展示不改变完整日期和机器可读日期', () => {
	const date = new Date(2026, 8, 4, 12);

	assert.equal(formatPostDate(date), 'September 4, 2026');
	assert.equal(formatFullDate(date), '2026-09-04');
});
