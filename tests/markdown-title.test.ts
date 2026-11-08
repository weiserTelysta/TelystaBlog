import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractMarkdownTitle, resolvePostTitle } from '../src/lib/markdownTitle';

test('显式 frontmatter 标题优先于正文 H1', () => {
	assert.equal(
		resolvePostTitle('# **草木有时**\n\n正文。', '格式标题'),
		'格式标题',
	);
});

test('省略正文 H1 仍使用 frontmatter；标题留空时才提取 Markdown H1', () => {
	assert.equal(resolvePostTitle('## 第一节\n\n正文。', '格式标题'), '格式标题');
	assert.equal(resolvePostTitle('# **草木有时**\n\n正文。', '  '), '草木有时');
	assert.equal(resolvePostTitle('# 拜占庭的赠礼', '《拜占庭的赠礼》阅读笔记'), '《拜占庭的赠礼》阅读笔记');
});

test('忽略代码围栏里的 H1 示例', () => {
	assert.equal(extractMarkdownTitle('```md\n# 示例标题\n```\n\n## 正文'), undefined);
});

test('长围栏与不同标记不能提前结束代码；下划线式 H1 与正文渲染一致', () => {
	assert.equal(extractMarkdownTitle('````md\n```\n# 示例\n~~~\n````\n\n正式标题\n========\n'), '正式标题');
	assert.equal(resolvePostTitle('正文标题\n===\n', ''), '正文标题');
	assert.equal(extractMarkdownTitle('# [**角色**](https://example.com/a(b)) &amp; `a_b`'), '角色 & a_b');
});
