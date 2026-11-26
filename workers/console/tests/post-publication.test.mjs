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

test('上线核对使用公开文章指纹，重试和回滚保留较新的草稿', async t => {
	const postId = 'WEISER012345abcdef';
	const id = 'post_' + postId;
	const endpoint = `/api/documents/${id}/publication`;
	const source = '---\nuuid: 012345abcdef\ndraft: false\n---\n# Fixture\n';
	const second = source + 'Second revision\n';
	const third = source + 'Unpublished edits\n';
	const digest = text => createHash('sha256').update(text).digest('hex');
	let live = new Response(null, {status:404});
	const {db,login,request}=await fixture(t,{outboundService: incoming => {
		const url = new URL(incoming.url);
		assert.equal(url.origin, 'https://telysta.com');
		assert.equal(url.pathname, `/blog/${postId}/`);
		assert.equal(incoming.headers.has('Cookie'), false);
		return live.clone();
	}});
	const owner = await login('weiser@telysta.com');
	const check = () => request(endpoint+'/check', 'POST', undefined, owner.cookie);
	const stored = () => db.prepare('SELECT state,revision,base_hash,source FROM documents WHERE id=?1').bind(id).first();
	const html = (value, revision = 0) => new Response(`<article class="article-page__inner" data-telysta-post="${postId}" data-post-source="${digest(value)}"${revision ? ` data-post-revision="${revision}"` : ''}>Fixture</article>`, {headers:{'Content-Type':'text/html'}});
	await db.prepare("INSERT INTO documents(id,kind,title,source_path,source,owner_id,updated_at,imported_at) VALUES(?1,'post','Fixture','src/content/weiser-posts/notes/fixture.md',?2,?3,0,0)").bind(id,source.replaceAll('\n','\r\n'),owner.body.user.id).run();
	assert.equal((await (await check()).json()).status, 'draft');
	assert.equal((await request(endpoint,'POST',{revision:1},owner.cookie)).status,200);
	assert.equal((await (await check()).json()).status, 'awaiting');
	live = html(source);
	assert.equal((await (await check()).json()).status, 'awaiting');
	live = html(source, 1);
	assert.equal((await (await check()).json()).currentState, 'published');
	assert.equal((await stored()).state, 'published');
	await db.prepare("UPDATE documents SET source=?1,revision=2,state='draft' WHERE id=?2").bind(second,id).run();
	assert.equal((await request(endpoint,'POST',{revision:2},owner.cookie)).status,200);
	live = html(second, 2);
	assert.equal((await (await check()).json()).revision,2);
	await db.prepare("UPDATE documents SET source=?1,revision=3,state='draft' WHERE id=?2").bind(third,id).run();
	live = new Response(null,{status:503});
	assert.equal((await check()).status,503);
	assert.equal((await stored()).base_hash,digest(second));
	live = html(source, 1);
	const rollback = await (await check()).json();
	assert.equal(rollback.revision, 1);
	assert.equal(rollback.currentState, 'draft');
	assert.deepEqual(await stored(),{state:'draft',revision:3,base_hash:digest(source),source:third});
});
