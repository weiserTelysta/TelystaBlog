import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { fixture } from './fixture.mjs';

test('站主可导出已保存的公开版本，快照可重试且不改变发布状态', async (t) => {
	const { db, login, request } = await fixture(t);
	const owner = await login('weiser@telysta.com');
	const reader = await login('reader@example.com');
	const id = 'post_WEISER012345abcdef';
	const endpoint = `/api/documents/${id}/publication`;
	const file = 'src/content/weiser-posts/notes/2026-11-23-fixture.md';
	const draft = '---\nuuid: 012345abcdef\ndraft: true\n---\n# Test article\n';

	await db.prepare("INSERT INTO documents(id,kind,title,source_path,source,owner_id,updated_at,imported_at) VALUES(?1,'post','Test article',?2,?3,?4,0,0)")
		.bind(id, file, draft, owner.body.user.id).run();

	assert.equal((await request(endpoint, 'POST', { revision: 1 }, reader.cookie)).status, 403);
	assert.equal((await request(endpoint, 'POST', { revision: 1 }, owner.cookie)).status, 422);
	const source = draft.replace('draft: true', 'draft: false');
	await db.prepare('UPDATE documents SET source=?1,revision=2 WHERE id=?2').bind(source, id).run();
	assert.equal((await request(endpoint, 'POST', { revision: 1 }, owner.cookie)).status, 409);
	const first = await request(endpoint, 'POST', { revision: 2 }, owner.cookie);
	assert.equal(first.status, 200, await first.clone().text());
	const snapshot = await first.json();
	assert.deepEqual(snapshot, {
		version: 1, documentId: id, revision: 2, path: file, source, baseHash: null,
		sha256: createHash('sha256').update(source).digest('hex'), author: { name: 'telysta', username: 'telysta' },
	});
	const duplicate = await request(endpoint, 'POST', { revision: 2 }, owner.cookie);
	assert.deepEqual(await duplicate.json(), snapshot);
	assert.equal((await db.prepare('SELECT state FROM documents WHERE id=?1').bind(id).first()).state, 'draft');
	assert.equal((await db.prepare('SELECT count(*) AS count FROM post_publication_snapshots').first()).count, 1);
});
