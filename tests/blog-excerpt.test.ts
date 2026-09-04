import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPostExcerpt } from '../src/lib/blogExcerpt';

test('extracts the first substantial body paragraph instead of Markdown headings', () => {
	const body = [
		'## 双核投放法',
		'## 内容摘要',
		'### 第一章：广告发展历史',
		'**广告**是由已确定的出资人通过各种媒介传播的产品信息，这一段才是文章真正的正文内容。',
	].join('\n');

	assert.equal(
		buildPostExcerpt(body, 'frontmatter summary'),
		'广告是由已确定的出资人通过各种媒介传播的产品信息，这一段才是文章真正的正文内容。',
	);
});

test('skips short salutations and selects the first useful prose paragraph', () => {
	const body = [
		'神戸新一様',
		'',
		'こんにちは。',
		'',
		'以前より神戸新一様の画風がとても好きで、キャラクターや作品全体の雰囲気を形にされる力にも大変魅力を感じております。',
	].join('\n');

	assert.match(buildPostExcerpt(body, 'fallback'), /^以前より神戸新一様/);
});

test('ignores non-prose blocks and falls back to the authored description', () => {
	const body = [
		'# Heading',
		'',
		'```ts',
		'const value = 1;',
		'```',
		'',
		'$$',
		'x = 1',
		'$$',
		'',
		'![Cover](./cover.png)',
		'',
		'- list item',
	].join('\n');

	assert.equal(buildPostExcerpt(body, 'A concise fallback description.'), 'A concise fallback description.');
});

test('keeps link text and truncates long excerpts on Unicode boundaries', () => {
	const body = `Read the [project notes](/notes) before continuing. ${'这是一段较长的正文。'.repeat(30)}`;
	const excerpt = buildPostExcerpt(body, 'fallback', 80);

	assert.match(excerpt, /^Read the project notes before continuing\./);
	assert.ok(Array.from(excerpt).length <= 81);
	assert.ok(excerpt.endsWith('…'));
});
