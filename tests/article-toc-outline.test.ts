import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildArticleTocTree } from '../src/lib/articleTocOutline';

test('builds a stable H2-H4 outline', () => {
	const tree = buildArticleTocTree([
		{ depth: 2, slug: 'history', text: '历史' },
		{ depth: 3, slug: 'traditional', text: '传统广告' },
		{ depth: 4, slug: 'print', text: '平面广告' },
		{ depth: 2, slug: 'rules', text: '广告规则' },
		{ depth: 3, slug: 'bidding', text: '竞价策略' },
	]);

	assert.equal(tree.length, 2);
	assert.equal(tree[0]?.slug, 'history');
	assert.equal(tree[0]?.children[0]?.slug, 'traditional');
	assert.equal(tree[0]?.children[0]?.children[0]?.slug, 'print');
	assert.equal(tree[1]?.children[0]?.slug, 'bidding');
});

test('keeps an orphan heading at the root when no shallower heading precedes it', () => {
	const [item] = buildArticleTocTree([
		{ depth: 3, slug: 'preface', text: '序言' },
	]);

	assert.equal(item?.slug, 'preface');
	assert.deepEqual(item?.children, []);
});

test('uses the nearest shallower heading when a level is skipped', () => {
	const tree = buildArticleTocTree([
		{ depth: 2, slug: 'history', text: '历史' },
		{ depth: 4, slug: 'auction', text: '广告拍卖' },
	]);

	assert.equal(tree[0]?.children[0]?.slug, 'auction');
});
