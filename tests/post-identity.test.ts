import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { assignPostIds } from '../scripts/lib/post-identity';
import { buildPostRedirects, createPostLinkIndex, postRouteId } from '../src/lib/postLinks.mjs';

const post = (file: string, data = {}) => ({
	file, legacyHref: `/blog/reading/${file}/`, data: { uuid: 'a3f7c92d8e10', category: 'reading', ...data },
});

test('短编号与标题、文件夹和分类无关，缺失或非法编号不能在构建中临时生成', () => {
	assert.equal(postRouteId({ uuid: 'a3f7c92d8e10', category: 'reading' }), 'WEISERa3f7c92d8e10');
	assert.equal(postRouteId({ uuid: 'a3f7c92d8e10', category: 'notes', title: '新标题' }), 'WEISERa3f7c92d8e10');
	for (const uuid of [undefined, '', 'A3F7C92D8E10', 'a3f7c92d', '../article', 123456789012]) {
		assert.throws(() => postRouteId({ uuid }), /uuid/);
	}
	assert.throws(() => createPostLinkIndex([post('one'), post('two', { category: 'notes' })]), /地址重复/);
});

test('旧路径直接跳转至短编号，草稿不生成公开跳转，冲突和外部地址必须报错', () => {
	const index = createPostLinkIndex([
		post('current', { redirectFrom: ['/blog/reading/original/', '/blog/reading/older/'] }),
		post('draft', { uuid: 'b3f7c92d8e10', draft: true, redirectFrom: ['/blog/reading/secret/'] }),
	]);
	assert.deepEqual(buildPostRedirects(index), {
		'/blog/reading/current/': '/blog/WEISERa3f7c92d8e10/',
		'/blog/reading/original/': '/blog/WEISERa3f7c92d8e10/',
		'/blog/reading/older/': '/blog/WEISERa3f7c92d8e10/',
	});
	assert.throws(() => createPostLinkIndex([post('one'), post('two', { uuid: 'b3f7c92d8e10', redirectFrom: ['/blog/reading/one/'] })]), /旧地址冲突/);
	assert.throws(() => createPostLinkIndex([post('one'), post('two', { uuid: 'b3f7c92d8e10', redirectFrom: ['/blog/WEISERa3f7c92d8e10/'] })]), /旧地址冲突/);
	for (const oldPath of ['https://example.com/', '//example.com/', '/blog/category/reading/', '/blog/../about/', '/blog/%2e%2e/about/']) {
		assert.throws(() => createPostLinkIndex([post('one', { redirectFrom: [oldPath] })]), /redirectFrom/);
	}
});

test('显式补号保留 BOM、CRLF、YAML 注释与全文，重复运行不改编号；移动文件仍保留旧入口', async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'telysta-identity-'));
	try {
		const directory = path.join(root, 'src/content/weiser-posts/reading');
		await fs.mkdir(directory, { recursive: true });
		const file = path.join(directory, '2026-11-3-original.md');
		const source = '\uFEFF---\r\n# 作者注释\r\ntitle: 原标题\r\ncustom: { keep: yes }\r\n---\r\n\r\n正文全文。\r\n';
		await fs.writeFile(file, source);
		assert.equal((await assignPostIds(root)).length, 1);
		const saved = await fs.readFile(file, 'utf8');
		const metadata = parse(saved.split('---')[1]);
		assert.match(metadata.uuid, /^[0-9a-f]{12}$/);
		assert.deepEqual(metadata.redirectFrom, ['/blog/reading/2026-11-3-original/']);
		assert.equal(metadata.commentId, 'blog/reading/2026-11-3-original/');
		assert.ok(saved.startsWith('\uFEFF---\r\n'));
		assert.ok(saved.endsWith(source.slice('\uFEFF---\r\n'.length)));
		assert.ok(!saved.replaceAll('\r\n', '').includes('\n'));
		assert.deepEqual(await assignPostIds(root), []);
		assert.equal(await fs.readFile(file, 'utf8'), saved);
		const moved = path.join(directory, 'renamed.md');
		await fs.rename(file, moved);
		assert.deepEqual(await assignPostIds(root), []);
		assert.equal(await fs.readFile(moved, 'utf8'), saved);
		await fs.writeFile(path.join(directory, 'duplicate.md'), saved);
		await assert.rejects(() => assignPostIds(root), /uuid 重复/);
		assert.equal(await fs.readFile(moved, 'utf8'), saved);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});
