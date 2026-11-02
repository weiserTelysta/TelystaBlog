import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { stringify } from 'yaml';
import { loadContentDocuments } from './content-validation';
import { legacyPostId, postHref, POST_UUID_PATTERN } from '../../src/lib/postLinks.mjs';

export const createPostUuid = () => randomUUID().replaceAll('-', '').slice(0, 12);

/** Explicit authoring step. Builds and checks never create or change identities. */
export async function assignPostIds(rootDir: string): Promise<string[]> {
	const posts = loadContentDocuments(rootDir).filter(document => document.kind === 'post');
	const used = new Map<string, string>();
	for (const post of posts) {
		if (post.parseIssues.length) throw new Error(`${post.relativePath}: 请先修复 frontmatter。`);
		const uuid = post.frontmatter.uuid;
		if (uuid === undefined) continue;
		if (typeof uuid !== 'string' || !POST_UUID_PATTERN.test(uuid)) throw new Error(`${post.relativePath}: uuid 格式错误，未覆盖既有编号。`);
		if (used.has(uuid)) throw new Error(`uuid 重复: ${used.get(uuid)} / ${post.relativePath}`);
		used.set(uuid, post.relativePath);
	}
	const changed: string[] = [];
	for (const post of posts) {
		if (post.frontmatter.uuid !== undefined) continue;
		let uuid: string;
		do { uuid = createPostUuid(); } while (used.has(uuid));
		used.set(uuid, post.relativePath);
		const relative = path.relative(path.join(rootDir, 'src/content/weiser-posts'), post.filePath);
		const oldPath = postHref(legacyPostId(relative));
		const fields: Record<string, unknown> = { uuid };
		if (post.frontmatter.redirectFrom === undefined) fields.redirectFrom = [oldPath];
		if (post.frontmatter.commentId === undefined) fields.commentId = oldPath.slice(1);
		const source = await fs.readFile(post.filePath, 'utf8');
		const newline = source.includes('\r\n') ? '\r\n' : '\n';
		const additions = stringify(fields, { lineWidth: 0 }).replaceAll('\n', newline);
		const opening = /^(\uFEFF?---\r?\n)/.exec(source);
		const bom = source.startsWith('\uFEFF') ? '\uFEFF' : '';
		const next = opening
			? opening[0] + additions + source.slice(opening[0].length)
			: `${bom}---${newline}${additions}---${newline}${newline}${source.slice(bom.length)}`;
		await fs.writeFile(post.filePath, next, 'utf8');
		changed.push(post.relativePath);
	}
	return changed;
}
