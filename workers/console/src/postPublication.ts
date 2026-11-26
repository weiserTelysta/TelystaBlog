import { describeDocument, type DocumentRecord } from './documentEditor';
import { validatedSource } from './validation';
import { body, HttpError, json } from './http';
import { nowSeconds, sessionToken, tokenHash } from './auth';
import type { User } from './permissions';

type PostSnapshot = {
	document_id: string;
	revision: number;
	source_path: string;
	source: string;
	base_hash: string | null;
	source_hash: string;
	author_name: string;
	author_username: string | null;
};

function sourcePath(value: string | null | undefined): value is string {
	if (!value?.startsWith('src/content/weiser-posts/') || !value.endsWith('.md')) return false;
	return value.split('/').every(part => part && part !== '.' && part !== '..' && !/[\\:\u0000-\u001f]/u.test(part));
}

export async function preparePostPublication(request: Request, env: ConsoleEnv, user: User, id: string) {
	if (request.method !== 'POST') throw new HttpError(405, '方法不支持。');
	const input = await body(request);
	if (typeof input.revision !== 'number' || !Number.isSafeInteger(input.revision) || input.revision < 1) {
		throw new HttpError(400, '版本无效。');
	}
	const record = await env.DB.prepare("SELECT * FROM documents WHERE id=?1 AND kind='post'")
		.bind(id).first<DocumentRecord>();
	if (!record) throw new HttpError(404, '文章不存在。');
	if (input.revision !== record.revision) throw new HttpError(409, '请读取最新已保存版本。', 'VERSION_CONFLICT');
	const editor = describeDocument(record);
	if (record.access !== 'public' || editor.format !== 'article' || !editor.fields ||
		(editor.fields.draft !== undefined && editor.fields.draft !== false) || !sourcePath(record.source_path)) {
		throw new HttpError(422, '请先保存一篇可公开发布、具有有效路径的文章。', 'POST_NOT_READY');
	}
	const token = sessionToken(request.headers.get('Cookie'));
	if (!token) throw new HttpError(401, '请重新登录。');
	const source = validatedSource('post', id, record.source, 'public');
	const [hash, sessionHash] = await Promise.all([tokenHash(source), tokenHash(token)]);
	const snapshot = await env.DB.prepare(`
		INSERT INTO post_publication_snapshots
		(document_id, revision, source_path, source, base_hash, source_hash,
		 author_id, author_name, author_username, prepared_by, prepared_at)
		SELECT d.id, d.revision, d.source_path, d.source, d.base_hash, ?1,
		       u.id, COALESCE(CASE WHEN instr(u.display_name, '@')=0 THEN NULLIF(trim(u.display_name), '') END, u.username, 'Weiser'), u.username,
		       requester.id, ?2
		FROM documents d JOIN users u ON u.id=COALESCE(d.owner_id, ?3)
		JOIN sessions s ON s.token_hash=?4 AND s.user_id=?3 AND s.expires_at>?2
		JOIN users requester ON requester.id=s.user_id AND requester.status='active'
		     AND requester.role='admin' AND requester.credential_version=s.credential_version
		WHERE d.id=?5 AND d.kind='post' AND d.revision=?6 AND d.source=?7 AND d.access='public'
		ON CONFLICT(document_id,revision) DO UPDATE SET prepared_at=prepared_at
		RETURNING document_id,revision,source_path,source,base_hash,source_hash,author_name,author_username
	`).bind(hash, nowSeconds(), user.id, sessionHash, id, record.revision, source).first<PostSnapshot>();
	if (!snapshot) throw new HttpError(409, '版本或登录状态已改变。', 'VERSION_CONFLICT');
	return json({
		version: 1,
		documentId: snapshot.document_id,
		revision: snapshot.revision,
		path: snapshot.source_path,
		source: snapshot.source,
		baseHash: snapshot.base_hash,
		sha256: snapshot.source_hash,
		author: { name: snapshot.author_name, username: snapshot.author_username },
	});
}
