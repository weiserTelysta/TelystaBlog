import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkPostLinks from '../scripts/remark-post-links.mjs';
import { createPostLinkIndex, legacyPostId, postHref, resolveWikiLink } from '../src/lib/postLinks.mjs';
import { buildPostExcerpt } from '../src/lib/blogExcerpt';
import { searchBody } from '../src/lib/blogSearch';
import { readPostLinkIndex } from '../scripts/lib/post-link-index.mjs';
import { parseContentDocument, validatePostLinks } from '../scripts/lib/content-validation';

const post = (file = 'portraits/Telysta/2026-9-5-旧标题.md', data = {}) => ({
	id: legacyPostId(file), file, data: { category: 'portraits', aliases: ['Telysta', '特莉丝塔'], ...data },
});
const index = () => createPostLinkIndex([post()]);
function parse(body: string) {
	const processor = unified().use(remarkParse).use(remarkMath).use(remarkPostLinks, { index: index() });
	return processor.runSync(processor.parse(body), { value: body });
}

test('只登记 alias，改名或移动文件后自动计算新地址', () => {
	assert.equal(legacyPostId('Notes/Telysta/2026-9-5-设计 理念.md'), 'notes/telysta/2026-9-5-设计-理念');
	const renamed = createPostLinkIndex([post('portraits/Other/2026-9-5-新标题.md')]);
	assert.equal(resolveWikiLink(index(), 'Telysta'), '/blog/portraits/telysta/2026-9-5-旧标题/');
	assert.equal(resolveWikiLink(renamed, 'Ｔｅｌｙｓｔａ'), '/blog/portraits/other/2026-9-5-新标题/');
	assert.equal(resolveWikiLink(renamed, '特莉丝塔'), '/blog/portraits/other/2026-9-5-新标题/');
	assert.equal(postHref('letters/example'), '/blog/letters/example/');
	assert.throws(() => resolveWikiLink(createPostLinkIndex([post('unnamed.md', { aliases: [] })]), 'unnamed'), /没有对应文章/);
});

test('重复别名、路由冲突及非法别名字段必须报错', () => {
	assert.throws(() => createPostLinkIndex([post(), post('second.md', { aliases: ['telysta'] })]), /名称重复/);
	assert.throws(() => createPostLinkIndex([post('Same.md'), post('same.md', { aliases: [] })]), /地址重复/);
	assert.throws(() => createPostLinkIndex([post('one.md', { aliases: 'Telysta' })]), /aliases/);
});

test('缺失目标、未发布目标和未实现的锚点不生成假链接', () => {
	assert.throws(() => parse('[[Missing]]'), /没有对应文章/);
	assert.throws(() => resolveWikiLink(createPostLinkIndex([post('draft.md', { draft: true })]), 'Telysta'), /草稿/);
	assert.throws(() => parse('[[Telysta#姓名]]'), /暂不支持/);
});

test('Micromark 区分 WikiLink、转义、代码、公式和普通链接', () => {
	const tree = parse('[[Telysta|她的姐姐]]，[[特莉丝塔]]。\n\n`[[Missing]]` \\[\\[Missing\\]\\] $[[Missing]]$\n\n```md\n[[Missing]]\n```\n\n[普通链接](/portraits/telysta/)');
	const links: any[] = [];
	const walk = (node: any) => { if (node.type === 'link') links.push(node); node.children?.forEach(walk); };
	walk(tree);
	assert.equal(links.length, 3);
	assert.equal(links[0].url, '/blog/portraits/telysta/2026-9-5-旧标题/');
	assert.equal(links[0].children[0].value, '她的姐姐');
	assert.equal(links[2].children[0].value, '普通链接');
});

test('显示文字由 Markdown 转义，不能注入 HTML；摘要和搜索不残留双括号', async () => {
	const processor = await createMarkdownProcessor({ syntaxHighlight: false, remarkPlugins: [[remarkPostLinks, { index: index() }]] });
	const result = await processor.render('[[Telysta|<script>alert(1)</script>]]');
	assert.ok(!result.code.includes('<script>'));
	assert.ok(result.code.includes(`href="${encodeURI('/blog/portraits/telysta/2026-9-5-旧标题/')}"`));
	assert.equal(buildPostExcerpt(undefined, '她与 [[Telysta|姐姐]] 对照。'), '她与 姐姐 对照。');
	assert.equal(searchBody('她与 [[Telysta|姐姐]] 对照。'), '她与 姐姐 对照。');
});

test('磁盘目标改名后索引摘要变化，无需修改引用它的正文', () => {
	const prefix = path.join(os.tmpdir(), 'telysta-wiki-');
	const root = fs.mkdtempSync(prefix);
	try {
		const dir = path.join(root, 'src/content/weiser-posts/portraits');
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, 'old.md'), '---\naliases: [Telysta]\n---\n正文');
		const before = readPostLinkIndex(root);
		fs.renameSync(path.join(dir, 'old.md'), path.join(dir, 'new.md'));
		const after = readPostLinkIndex(root);
		assert.notEqual(before.digest, after.digest);
		assert.equal(resolveWikiLink(before, 'Telysta'), '/blog/portraits/old/');
		assert.equal(resolveWikiLink(after, 'Telysta'), '/blog/portraits/new/');
	} finally {
		assert.ok(path.resolve(root).startsWith(path.resolve(prefix)));
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test('内容检查给出引用行号；草稿可暂缺引用，发布时必须补齐', () => {
	const root = process.cwd();
	const file = path.join(root, 'src/content/weiser-posts/portraits/2026-9-21-test.md');
	const published = parseContentDocument(file, '---\ntitle: Test\n---\n[[Missing]]', 'post', root);
	const issues = validatePostLinks([published]);
	assert.equal(issues[0].code, 'wikilink-invalid');
	assert.equal(issues[0].line, 4);
	assert.deepEqual(validatePostLinks([{ ...published, frontmatter: { ...published.frontmatter, draft: true } }]), []);
});
