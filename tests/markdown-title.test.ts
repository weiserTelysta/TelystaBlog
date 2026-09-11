import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractMarkdownTitle, resolvePostTitle } from '../src/lib/markdownTitle';

test('正文 H1 优先于 frontmatter 标题并清理常见 Markdown 标记', () => {
	assert.equal(
		resolvePostTitle('# **草木有时**\n\n正文。', '格式标题'),
		'草木有时',
	);
});

test('没有正文 H1 时回退到 frontmatter 标题', () => {
	assert.equal(resolvePostTitle('## 第一节\n\n正文。', '格式标题'), '格式标题');
});

test('忽略代码围栏里的 H1 示例', () => {
	assert.equal(extractMarkdownTitle('```md\n# 示例标题\n```\n\n## 正文'), undefined);
});
