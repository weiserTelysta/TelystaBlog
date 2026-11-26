import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { readPostLinkIndex } from './lib/post-link-index.mjs';
import { postLinkErrors } from '../src/lib/postLinks.mjs';
import { splitMarkdownSource } from '../src/lib/markdownSource';

const [file, ...flags] = process.argv.slice(2);
if (!file || flags.some(flag => flag !== '--apply')) throw new Error('用法：npm run post:publication -- <发布快照.json> [--apply]');

const snapshot = JSON.parse(readFileSync(file, 'utf8'));
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const isHash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
if (snapshot?.version !== 1 || !/^post_WEISER[a-f0-9]{12}$/.test(snapshot.documentId)
	|| !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1
	|| typeof snapshot.source !== 'string' || snapshot.source.length > 1_000_000
	|| !isHash(snapshot.sha256) || hash(snapshot.source) !== snapshot.sha256
	|| (snapshot.baseHash !== null && !isHash(snapshot.baseHash))) {
	throw new Error('发布快照无效，或文章原文已被改动。');
}

const relative = snapshot.path;
if (typeof relative !== 'string' || !relative.startsWith('src/content/weiser-posts/') || !relative.endsWith('.md')
	|| relative.split('/').some(part => !part || part === '.' || part === '..' || /[\\:\u0000-\u001f]/u.test(part))) {
	throw new Error('发布路径必须位于文章目录。');
}

const root = realpathSync(process.cwd());
const target = path.join(root, relative);
if (realpathSync(path.dirname(target)) !== path.dirname(target)) throw new Error('发布目录必须是仓库里的真实目录。');
const uuid = snapshot.documentId.slice('post_WEISER'.length);
const source = splitMarkdownSource(snapshot.source);
const frontmatter = parseDocument(source.frontmatter ?? '');
const data = frontmatter.toJS({ maxAliasCount: 0 });
if (frontmatter.errors.length || !data || data.uuid !== uuid || data.draft === true || postLinkErrors(data).length) {
	throw new Error('该快照的文章编号、可见状态或旧链接无效。');
}

const existing = readPostLinkIndex(root).routes.get(`/blog/WEISER${uuid}/`);
if (existing && existing.file !== target) throw new Error('现有文章已采用不同的文件路径，请先核对旧链接与迁移。');

const stat = lstatSync(target, { throwIfNoEntry: false });
if (stat && !stat.isFile()) throw new Error('发布路径已被非普通文件占用。');
const original = stat ? readFileSync(target, 'utf8') : null;
if (original === snapshot.source) {
	console.log(`文章 ${uuid} 的 r${snapshot.revision} 已在工作区。`);
	process.exit(0);
}
if (original === null ? snapshot.baseHash !== null : snapshot.baseHash !== hash(original)) {
	throw new Error('工作区与云端导入时的基线不同，需要先审查并合并，自动导入已停止。');
}
if (!flags.includes('--apply')) {
	console.log(`${relative}  ·  r${snapshot.revision}  ·  ${original === null ? '新增' : '更新'}  ·  预演`);
	process.exit(0);
}

const temp = path.join(path.dirname(target), `.${randomUUID()}.publication`);
let written = false;
try {
	if (original === null) writeFileSync(target, snapshot.source, { encoding: 'utf8', flag: 'wx' });
	else {
		writeFileSync(temp, snapshot.source, { encoding: 'utf8', flag: 'wx', mode: stat!.mode & 0o777 });
		if (readFileSync(target, 'utf8') !== original) throw new Error('工作区文件刚刚改动，导入停止。');
		renameSync(temp, target);
	}
	written = true;
	execFileSync(process.execPath, ['--import', 'tsx', 'scripts/validate-content.ts'], { stdio: 'inherit', cwd: root });
} catch (error) {
	// Revert our write only if the target still contains precisely the bytes we wrote.
	if (written && lstatSync(target, { throwIfNoEntry: false })?.isFile() && readFileSync(target, 'utf8') === snapshot.source) {
		if (original === null) rmSync(target);
		else writeFileSync(target, original, 'utf8');
	}
	throw error;
} finally {
	rmSync(temp, { force: true });
}
console.log(`已导入 ${relative}；通过内容检查，等待 Git 评审和构建。`);
