import assert from 'node:assert/strict';
import { test } from 'node:test';
import remarkArticleTitle from '../scripts/remark-article-title.mjs';

test('没有 frontmatter 的博客也只在文章头部展示一次标题', () => {
	const tree = { children: [
		{ type: 'heading', depth: 1, children: [{ type: 'text', value: '新文章' }] },
		{ type: 'paragraph', children: [{ type: 'text', value: '正文' }] },
	] };
	const frontmatter: Record<string, unknown> = {};
	remarkArticleTitle()(tree, {
		path: 'C:\\project\\src\\content\\weiser-posts\\notes\\2026-9-13-test.md',
		data: { astro: { frontmatter } },
	});
	assert.equal(frontmatter.articleTitle, '新文章');
	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, 'paragraph');
});

test('从博客正文提取唯一 H1 并保留后续章节', () => {
	const tree = {
		type: 'root',
		children: [
			{ type: 'heading', depth: 1, children: [{ type: 'text', value: '草木有时' }] },
			{ type: 'paragraph', children: [{ type: 'text', value: '正文' }] },
			{ type: 'heading', depth: 2, children: [{ type: 'text', value: '第一节' }] },
		],
	};
	const frontmatter: Record<string, unknown> = { category: 'notes' };
	const file = { data: { astro: { frontmatter } } };

	remarkArticleTitle()(tree, file);

	assert.equal(frontmatter.articleTitle, '草木有时');
	assert.deepEqual(tree.children.map((node) => node.type), ['paragraph', 'heading']);
	assert.equal(tree.children[1]?.depth, 2);
});

test('不改写非博客 Markdown', () => {
	const heading = { type: 'heading', depth: 1, children: [{ type: 'text', value: '资源标题' }] };
	const tree = { type: 'root', children: [heading] };
	const file = { data: { astro: { frontmatter: { type: 'illustration' } } } };

	remarkArticleTitle()(tree, file);

	assert.deepEqual(tree.children, [heading]);
	assert.equal('articleTitle' in file.data.astro.frontmatter, false);
});
