import { nowSeconds } from './auth';
import { body, HttpError, json } from './http';
import { can, publicDisplayName, type User } from './permissions';

type Thread = { id: string; kind: 'post'|'ebook'; title: string; access: string; state: string; base_hash: string | null };
type CommentRow = { id: string; document_id: string; author_id: string; parent_id: string | null; body: string; state: 'visible'|'hidden'|'deleted'; created_at: number; updated_at: number; display_name: string | null; username: string | null; parent_username?: string | null; parent_author_id?: string | null; parent_display_name?: string | null };
function moderationAudit(env: ConsoleEnv, actor: string, action: string, target: string) {
 return env.DB.prepare('INSERT INTO audit_events(id,actor_id,action,target_id,created_at) VALUES(?1,?2,?3,?4,?5)').bind(crypto.randomUUID(),actor,action,target,nowSeconds());
}
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/;
function message(value: unknown) {
 if (typeof value !== 'string' || !value.trim() || [...value.trim()].length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new HttpError(400, '评论应为1–4000个字符。');
 return value.trim();
}
function signedIn(user: User | null): asserts user is User { if (!user || user.status !== 'active' || user.email_verified_at == null) throw new HttpError(401, '请先验证邮箱。'); }
function writeOrigin(request: Request, env: ConsoleEnv) {
 const allowed: readonly string[] = [env.SITE_ORIGIN, env.CONSOLE_ORIGIN];
 if (!allowed.includes(request.headers.get('Origin') || '')) throw new HttpError(403, '请求来源无效。');
}
async function thread(env: ConsoleEnv, id: string, user: User | null): Promise<Thread> {
 const record = await env.DB.prepare('SELECT id,kind,title,access,state,base_hash FROM documents WHERE id=?1 AND kind IN (\'post\',\'ebook\')').bind(id).first<Thread>();
 if (!record || record.state !== 'published' && !record.base_hash && !can(user, 'site:manage') || record.access === 'protected' && !can(user, 'restricted:read')) throw new HttpError(404, '此讨论暂时不可访问。');
 return record;
}
/** Atomic rolling window: concurrent requests cannot reserve more than ten slots. */
async function reserve(env: ConsoleEnv, user: User) {
 const now = nowSeconds();
 const reserved = await env.DB.prepare("INSERT INTO comment_limits(user_id,timestamps) VALUES(?1,json_array(?2)) ON CONFLICT(user_id) DO UPDATE SET timestamps=(SELECT json_group_array(value) FROM (SELECT value FROM json_each(comment_limits.timestamps) WHERE CAST(value AS INTEGER)>?3 UNION ALL SELECT ?2)) WHERE (SELECT count(*) FROM json_each(comment_limits.timestamps) WHERE CAST(value AS INTEGER)>?3)<10 RETURNING user_id").bind(user.id, now, now - 60).first();
 if (!reserved) throw new HttpError(429, '每分钟最多发表10条评论，请稍后再试。');
}
function publicComment(row: CommentRow, user: User | null) {
 return {
  id: row.id, body: row.body, parentId: row.parent_id,
  parentAuthorName: row.parent_author_id ? publicDisplayName({ id: row.parent_author_id, display_name: row.parent_display_name, username: row.parent_username }) : null,
  authorName: publicDisplayName({ id: row.author_id, display_name: row.display_name, username: row.username }),
  createdAt: row.created_at, updatedAt: row.updated_at,
  canEdit: user?.id === row.author_id && row.state === 'visible',
  canDelete: user?.id === row.author_id || can(user, 'content:review'),
 };
}
const publicWhere = "c.document_id=?1 AND c.state='visible' AND (c.parent_id IS NULL OR p.state='visible')";
const joined = 'comments c JOIN users u ON u.id=c.author_id LEFT JOIN comments p ON p.id=c.parent_id LEFT JOIN users pu ON pu.id=p.author_id';
const selected = 'c.*,u.display_name,u.username,p.author_id AS parent_author_id,pu.display_name AS parent_display_name,pu.username AS parent_username';

export async function handleComments(request: Request, env: ConsoleEnv, user: User | null, url: URL) {
 if (request.method !== 'GET') writeOrigin(request, env);
 if (url.pathname === '/api/comments/manage') {
  signedIn(user);
  if (!can(user, 'content:review')) throw new HttpError(403, '没有评论管理权限。');
  if (request.method !== 'GET') throw new HttpError(405, '方法不支持。');
  const state = url.searchParams.get('state') || '', query = (url.searchParams.get('q') || '').trim().slice(0,100), page = Number(url.searchParams.get('page') || 1);
  if (!['','all','visible','hidden'].includes(state) || !Number.isSafeInteger(page) || page < 1 || page > 4000) throw new HttpError(400, '筛选条件无效。');
  const clause = "c.state<>'deleted' AND (?1 IN ('','all') OR c.state=?1) AND (instr(c.body,?2)>0 OR instr(d.title,?2)>0) AND (d.access='public' OR ?3=1)";
  const values = [state, query, can(user, 'restricted:read') ? 1 : 0];
  const records = await env.DB.prepare(`SELECT c.*,u.display_name,u.username,d.kind AS thread_kind,d.title AS thread_title FROM comments c JOIN documents d ON d.id=c.document_id JOIN users u ON u.id=c.author_id WHERE ${clause} ORDER BY c.created_at DESC,c.id DESC LIMIT 25 OFFSET ?4`).bind(...values, (page - 1) * 25).all<CommentRow & {thread_kind:string;thread_title:string}>();
  const count = await env.DB.prepare(`SELECT count(*) AS count FROM comments c JOIN documents d ON d.id=c.document_id WHERE ${clause}`).bind(...values).first<{count:number}>();
  return json({ records: records.results.map(row => ({ id: row.id, body: row.body, authorName: publicDisplayName({id:row.author_id,display_name:row.display_name,username:row.username}), threadKind: row.thread_kind, threadId: row.document_id.slice(row.thread_kind.length + 1), threadTitle: row.thread_title, state: row.state, parentId: row.parent_id, createdAt: row.created_at, updatedAt: row.updated_at })), total: count?.count || 0, page, pageSize: 25 });
 }
 if (url.pathname === '/api/comments') {
  const kind = url.searchParams.get('kind'), id = url.searchParams.get('id') || '';
  if (!['post','ebook'].includes(kind || '') || !ID.test(id)) throw new HttpError(400, '讨论编号无效。');
  const document = await thread(env, kind + '_' + id, user);
  if (request.method === 'GET') {
   const cursor = url.searchParams.get('before') || '';
   const match = cursor ? /^(\d{1,12})\.([a-f0-9-]{36})$/.exec(cursor) : null;
   if (cursor && !match) throw new HttpError(400, '分页位置无效。');
   const before = match ? Number(match[1]) : Number.MAX_SAFE_INTEGER, beforeId = match?.[2] || 'z';
   const records = await env.DB.prepare(`SELECT ${selected} FROM ${joined} WHERE ${publicWhere} AND (c.created_at<?2 OR (c.created_at=?2 AND c.id<?3)) ORDER BY c.created_at DESC,c.id DESC LIMIT 21`).bind(document.id, before, beforeId).all<CommentRow>();
   const page = records.results.slice(0,20), last = page.at(-1);
   return json({ records: page.map(row => publicComment(row,user)), nextCursor: records.results.length > 20 && last ? `${last.created_at}.${last.id}` : null, viewer: user ? { id: user.id, displayName: publicDisplayName(user) } : null });
  }
  if (request.method !== 'POST') throw new HttpError(405, '方法不支持。');
  signedIn(user);
  const input = await body(request,20000), text = message(input.body);
  let parent: string | null = null;
  if (input.parentId !== undefined && input.parentId !== null) {
   if (typeof input.parentId !== 'string' || !/^[a-f0-9-]{36}$/.test(input.parentId)) throw new HttpError(400, '回复对象无效。');
   const original = await env.DB.prepare("SELECT id,parent_id FROM comments WHERE id=?1 AND document_id=?2 AND state='visible'").bind(input.parentId, document.id).first<{id:string;parent_id:string|null}>();
   if (!original || original.parent_id) throw new HttpError(400, '请回复一条仍可见的主评论。');
   parent = original.id;
  }
  await reserve(env,user);
  const commentId = crypto.randomUUID(), now = nowSeconds();
  await env.DB.prepare("INSERT INTO comments(id,document_id,author_id,parent_id,body,state,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,'visible',?6,?6)").bind(commentId, document.id, user.id, parent, text, now).run();
  return json({ ok: true, id: commentId },201);
 }
 const id = /^\/api\/comments\/([a-f0-9-]{36})$/.exec(url.pathname)?.[1];
 if (!id) throw new HttpError(404, '未找到评论。');
 signedIn(user);
 const current = await env.DB.prepare("SELECT c.*,u.display_name,u.username FROM comments c JOIN users u ON u.id=c.author_id WHERE c.id=?1 AND c.state<>'deleted'").bind(id).first<CommentRow>();
 if (!current) throw new HttpError(404, '未找到评论。');
 await thread(env,current.document_id,user);
 if (request.method === 'DELETE') {
  if (current.author_id !== user.id && !can(user,'content:review')) throw new HttpError(403, '只能删除自己的评论。');
  await env.DB.batch([env.DB.prepare("UPDATE comments SET state='deleted',body='',updated_at=?1 WHERE id=?2").bind(nowSeconds(),id), moderationAudit(env,user.id,'comments.delete',id)]);
  return json({ok:true});
 }
 if (request.method !== 'PATCH') throw new HttpError(405,'方法不支持。');
 const input = await body(request,20000);
 if (Object.keys(input).length !== 1) throw new HttpError(400, '请单独修改评论内容或可见状态。');
 if ('state' in input) {
  if (!can(user,'content:review')) throw new HttpError(403,'没有评论管理权限。');
  if (typeof input.state !== 'string' || !['visible','hidden'].includes(input.state)) throw new HttpError(400,'评论状态无效。');
  await env.DB.batch([env.DB.prepare('UPDATE comments SET state=?1,updated_at=?2 WHERE id=?3').bind(input.state,nowSeconds(),id), moderationAudit(env,user.id,'comments.'+(input.state === 'hidden' ? 'hide' : 'restore'),id)]);
 } else {
  if (current.author_id !== user.id || current.state !== 'visible') throw new HttpError(403,'只能编辑自己仍可见的评论。');
  const text = message(input.body);
  await reserve(env,user);
  await env.DB.prepare("UPDATE comments SET body=?1,updated_at=?2 WHERE id=?3 AND state='visible'").bind(text,nowSeconds(),id).run();
 }
 return json({ok:true});
}
