import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describePost, patchPostFields } from '../scripts/admin/post-fields';
import { renderPostPreview } from '../scripts/admin/post-preview';
import { adminFixture } from './helpers/admin-fixture';

test('metadata patches preserve unrelated YAML, comments, CRLF, BOM and raw Markdown', () => {
	const source =
		'\uFEFF---\r\n# 头部注释\r\ntitle: 原标题 # 保留行内注释\r\ncustom: { keep: "yes", number: 123 }\r\ndescription: |\r\n  原来的多行\r\n  内容。\r\ntags: [one, two]\r\ndraft: true\r\n---\r\n\r\n# 标题\r\n\r\n$$x^2$$\r\n';
	assert.equal(patchPostFields(source, {}), source);
	assert.equal(patchPostFields(source, { title: '原标题' }), source);
	const next = patchPostFields(source, {
		title: '引号 " 换行\n标题',
		description: '新的介绍',
		tags: ['标签一', '标签二'],
		series: 'telysta-notes',
		seriesOrder: 1,
	});
	assert.ok(next.startsWith('\uFEFF---\r\n# 头部注释\r\n'));
	assert.ok(
		next.includes('# 保留行内注释\r\ncustom: { keep: "yes", number: 123 }\r\n'),
	);
	assert.ok(next.endsWith(source.slice(source.indexOf('---\r\n\r\n# 标题'))));
	assert.deepEqual(
		describePost(next, 'src/content/weiser-posts/portraits/2026-9-15-test.md')
			.authored.tags,
		['标签一', '标签二'],
	);
	assert.equal(describePost(next, 'x.md').authored.title, '引号 " 换行\n标题');
});
test('plain Markdown accepts new metadata without consuming horizontal rules; complex nodes and invalid dates reject safely', () => {
	const plain = '正文\n\n---\n\n分隔内容\n\n---\n';
	const updated = patchPostFields(plain, { draft: true, title: '新标题' });
	assert.ok(updated.endsWith(plain));
	assert.equal(
		describePost(updated, 'src/content/weiser-posts/letters/2026-9-15-test.md')
			.metadata.draft,
		true,
	);
	assert.throws(
		() =>
			patchPostFields('---\ntitle: &shared 文本\nother: *shared\n---\n', {
				title: '改',
			}),
		/复杂/,
	);
	assert.throws(
		() =>
			patchPostFields('---\ntags:\n - one # 不要丢失注释\n---\n', {
				tags: ['two'],
			}),
		/复杂/,
	);
	assert.throws(
		() => patchPostFields(plain, { publishedAt: '2026-02-30' }),
		/日期/,
	);
	assert.throws(() => patchPostFields(plain, { draft: 'false' }), /类型/);
	assert.throws(() => patchPostFields(plain, { unknown: 'value' }), /不允许/);
	const cleared = patchPostFields(
		'---\nseries: telysta-notes\nseriesOrder: 1\n---\n',
		{ series: null, seriesOrder: null },
	);
	assert.equal(describePost(cleared, 'x.md').metadata.series, undefined);
});
test('draft preview renders Markdown and native math, makes HTML inert and strips navigation', async () => {
	const html = await renderPostPreview(
		'# 标题\n\n**加粗**\n\n$$x^2$$\n\n<script>parent.injected=true</script>\n\n[危险](javascript:alert(1))\n\n![测试](./safe.png)',
		'标题',
		'testNonce',
		async (src) =>
			src === './safe.png' ? 'data:image/webp;base64,AA==' : undefined,
	);
	assert.match(html, /<strong>加粗<\/strong>/);
	assert.match(html, /<math/);
	assert.match(html, /(?:&lt;|&#x3C;)script>/);
	assert.doesNotMatch(html, /<script|href="javascript:|__ASTRO_IMAGE_/);
	assert.equal((html.match(/<h1>/g) ?? []).length, 1);
	assert.match(html, /data:image\/webp/);
	assert.match(html, /default-src 'none'/);
});
test('metadata and rendered previews do not write draft files; saving still requires valid metadata and file version', async () => {
	const fixture = await adminFixture();
	try {
		const patch = await fixture.request('/api/post-fields', {
			path: fixture.relative,
			source: fixture.source,
			patch: {
				title: '预览中的标题',
				category: 'letters',
				publishedAt: '2026-09-14',
			},
		});
		assert.equal(patch.status, 200);
		const data = await patch.json();
		assert.equal(data.authored.title, '预览中的标题');
		assert.equal(
			await fs.readFile(path.join(fixture.root, fixture.relative), 'utf8'),
			fixture.source,
		);
		const preview = await fixture.request('/api/post', {
			path: fixture.relative,
			version: 'not-needed-for-read',
			source: data.source,
			preview: true,
		});
		assert.equal(preview.status, 200);
		assert.match((await preview.json()).html, /预览中的标题/);
		assert.equal(
			await fs.readFile(path.join(fixture.root, fixture.relative), 'utf8'),
			fixture.source,
		);
		const bad = await fixture.request('/api/post', {
			path: fixture.relative,
			version: 'bad',
			source: data.source,
			preview: false,
		});
		assert.equal(bad.status, 409);
	} finally {
		await fixture.close();
	}
});
