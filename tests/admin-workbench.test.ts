import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { writingContext } from '../scripts/admin/post-assist';
import { parseContentDocument } from '../scripts/lib/content-validation';
import { adminFixture } from './helpers/admin-fixture';
import {
	diffLines,
	imageReference,
	localDate,
	contentDate,
} from '../scripts/admin/ui/workbench.mjs';

test('source review retains line numbers, handles repeated lines and bounds large replacements', () => {
	const before = 'title\r\nkeep\r\nrepeat\r\nold\r\nrepeat\r\nend';
	const after = 'title\nkeep\nrepeat\nnew\nrepeat\nend';
	const rows = diffLines(before, after);
	assert.deepEqual(
		rows.filter((r) => r.kind !== 'same'),
		[
			{ kind: 'remove', text: 'old', oldLine: 4, newLine: null },
			{ kind: 'add', text: 'new', oldLine: null, newLine: 4 },
		],
	);
	assert.deepEqual(diffLines(before, before.replace(/\r\n/g, '\n')), []);
	const large = diffLines('old\n'.repeat(700), 'new\n'.repeat(700));
	assert.equal(large.filter((r) => r.kind === 'remove').length, 700);
	assert.equal(large.filter((r) => r.kind === 'add').length, 700);
});

test('inserting media uses website addresses and article-relative encoded local paths', () => {
	const article =
		'src/content/weiser-posts/portraits/Telysta/2026-9-17-test.md';
	assert.equal(
		imageReference(
			{ publicUrl: 'https://assets.telysta.com/a.webp', reference: 'asset:a' },
			article,
		),
		'https://assets.telysta.com/a.webp',
	);
	assert.equal(
		imageReference({ reference: 'src/assets/contact/带 空格#.png' }, article),
		'../../../../assets/contact/%E5%B8%A6%20%E7%A9%BA%E6%A0%BC%23.png',
	);
	assert.equal(
		imageReference({ reference: '/media/a.webp' }, article),
		'/media/a.webp',
	);
	assert.equal(imageReference({ reference: 'asset:missing' }, article), '');
	assert.equal(localDate(new Date(2026, 0, 2, 23)), '2026-01-02');
	assert.equal(contentDate('2026-8-30'), '2026-08-30');
	assert.equal(contentDate('2026-10-04T00:00:00.000Z'), '2026-10-04');
	assert.ok(contentDate('2026-10-04') > contentDate('2026-8-30'));
});

test('writing suggestions ignore code headings and include draft chapter orders without counting the edited article', () => {
	const relative = 'src/content/weiser-posts/portraits/2026-9-17-test.md';
	const old = parseContentDocument(
		'/repo/' + relative,
		'---\nseries: telysta-notes\nseriesOrder: 99\n---\n',
		'post',
		'/repo',
	);
	const chapter = parseContentDocument(
		'/repo/src/content/weiser-posts/portraits/2026-9-18-next.md',
		'---\nseries: telysta-notes\nseriesOrder: 4\ndraft: true\n---\n',
		'post',
		'/repo',
	);
	const source =
		'---\ndraft: true\n---\n\n```md\n# 假标题\n代码正文\n```\n\n# 真标题\n这里是一段完整的正文，用来检查摘要提取不会误用代码里的文字。\n';
	const info = writingContext(source, relative, [old, chapter]);
	assert.equal(info.title, '真标题');
	assert.match(info.excerpt, /^这里是一段完整的正文/);
	assert.equal(info.seriesOrders['telysta-notes'], 5);
	assert.equal(info.hints.length, 1);
	assert.equal(source.split('\n')[info.hints[0].line - 1], '# 真标题');
});

test('assistant reports invalid content with source locations while keeping source and external changes untouched', async () => {
	const fixture = await adminFixture();
	try {
		const source =
			fixture.source + '\r\n# 错位标题\r\n\r\n![丢失图片](missing.png)\r\n';
		const result = await fixture.request('/api/post-assist', {
			path: fixture.relative,
			source,
		});
		assert.equal(result.status, 200);
		const data = await result.json();
		const imageIssue = data.issues.find((i: { message: string }) =>
			i.message.includes('missing.png'),
		);
		assert.ok(imageIssue);
		assert.equal(
			source.replace(/\r\n/g, '\n').split('\n')[imageIssue.line - 1],
			'![丢失图片](missing.png)',
		);
		assert.equal(
			await fs.readFile(path.join(fixture.root, fixture.relative), 'utf8'),
			fixture.source,
		);
		const fields = await (
			await fixture.request('/api/post-fields', {
				path: fixture.relative,
				source: fixture.source,
			})
		).json();
		assert.ok(fields.writing);
		const saved = await fixture.request('/api/post', {
			path: fixture.relative,
			version: null,
			source,
		});
		assert.equal(saved.status, 400);
		assert.equal(
			await fs.readFile(path.join(fixture.root, fixture.relative), 'utf8'),
			fixture.source,
		);
		const escaped = await fixture.request('/api/post-assist', {
			path: 'src/content/weiser-posts/../../private.md',
			source: '# test',
		});
		assert.equal(escaped.status, 400);
	} finally {
		await fixture.close();
	}
});
