import { HttpError, body, json } from './http';
import { audit, nowSeconds } from './auth';
import { ADMIN_EMAIL, can, ROLES, type User } from './permissions';
import { BLOG_CATEGORY_IDS } from '../../../src/config/content/blogCategories';
import { validatedSource } from './validation';
import { exportBackup } from './backup';
const KINDS = ['post','ebook','gallery','score','config'];
function requireAdmin(user: User) { if (!can(user, 'site:manage')) throw new HttpError(403, '需要管理员权限。'); }
export async function handleManagement(request: Request, env: ConsoleEnv, user: User, url: URL) {
 const path = url.pathname;
 if (path === '/api/dashboard' && request.method === 'GET') {
  if (!can(user, 'site:manage')) return json({ role: user.role, uploads: await env.DB.prepare('SELECT count(*) AS count FROM uploads WHERE owner_id=?1 AND state=\'ready\'').bind(user.id).first() });
  const content = await env.DB.prepare('SELECT kind,count(*) AS count FROM documents GROUP BY kind').all();
  const users = await env.DB.prepare('SELECT role,count(*) AS count FROM users GROUP BY role').all();
  return json({ content: content.results, users: users.results });
 }
 if (path === '/api/users' && request.method === 'GET') {
  requireAdmin(user); const query = (url.searchParams.get('q') || '').slice(0,100);
  return json((await env.DB.prepare('SELECT id,email,role,status,created_at,last_login_at FROM users WHERE instr(email,?1)>0 ORDER BY created_at DESC LIMIT 100').bind(query).all()).results);
 }
 const userId = /^\/api\/users\/([a-f0-9-]{36})$/.exec(path)?.[1];
 if (userId && request.method === 'PATCH') {
  requireAdmin(user); const input = await body(request);
  const target = await env.DB.prepare('SELECT id,email FROM users WHERE id=?1').bind(userId).first<{ id: string; email: string }>();
  if (!target) throw new HttpError(404, '用户不存在。');
  if (target.email === ADMIN_EMAIL) throw new HttpError(403, '管理员身份固定，不能降权或停用。');
  if (typeof input.role !== 'string' || !ROLES.includes(input.role as User['role']) || input.role === 'admin' || !['active','suspended'].includes(String(input.status))) throw new HttpError(400, '角色或状态无效。');
  await env.DB.batch([
   env.DB.prepare('UPDATE users SET role=?1,status=?2,updated_at=?3 WHERE id=?4').bind(input.role, input.status, nowSeconds(), userId),
   env.DB.prepare('DELETE FROM sessions WHERE user_id=?1').bind(userId),
  ]);
  await audit(env, user.id, 'users.update', userId); return json({ ok: true });
 }
 if (path === '/api/documents' && request.method === 'GET') {
  requireAdmin(user); const kind = url.searchParams.get('kind') || 'post';
  if (!KINDS.includes(kind)) throw new HttpError(400, '内容类型无效。');
  const query = (url.searchParams.get('q') || '').slice(0,100), offset = Math.min(100000, Math.max(0, Number(url.searchParams.get('offset')) || 0));
  const records = await env.DB.prepare('SELECT id,kind,title,source_path,access,state,revision,updated_at FROM documents WHERE kind=?1 AND instr(title,?2)>0 ORDER BY updated_at DESC,id LIMIT 100 OFFSET ?3').bind(kind,query,offset).all();
  const total = await env.DB.prepare('SELECT count(*) AS count FROM documents WHERE kind=?1 AND instr(title,?2)>0').bind(kind,query).first();
  return json({ records: records.results, total });
 }
 if (path === '/api/documents' && request.method === 'POST') {
  requireAdmin(user); const input = await body(request);
  if (input.kind !== 'post' || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 300) throw new HttpError(400, '请填写文章标题。');
  const category = typeof input.category === 'string' ? input.category : 'notes';
  if (!(BLOG_CATEGORY_IDS as readonly string[]).includes(category)) throw new HttpError(400, '分类不存在。');
  const uuid = crypto.randomUUID().replaceAll('-', '').slice(0, 12), id = 'post_WEISER' + uuid;
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());
  const source = `---\nuuid: ${JSON.stringify(uuid)}\ntitle: ${JSON.stringify(input.title.trim())}\ntitleEn: Draft\ndescription: 待补充摘要\ndescriptionEn: Draft\npublishedAt: ${date}\nupdatedAt: ${date}\ncategory: ${category}\ndraft: true\ntags: []\n---\n\n# ${input.title.trim()}\n\n`;
  const sourcePath = `src/content/weiser-posts/${category}/${date}-${uuid}.md`;
  await env.DB.prepare('INSERT INTO documents(id,kind,title,source_path,source,owner_id,updated_at,imported_at) VALUES(?1,\'post\',?2,?3,?4,?5,?6,?6)').bind(id,input.title.trim(),sourcePath,source,user.id,nowSeconds()).run();
  await audit(env,user.id,'documents.create',id); return json({ id },201);
 }
 const documentId = /^\/api\/documents\/([A-Za-z0-9_-]{1,100})$/.exec(path)?.[1];
 if (documentId && request.method === 'GET') {
  requireAdmin(user);
  const record = await env.DB.prepare('SELECT * FROM documents WHERE id=?1').bind(documentId).first();
  if (!record) throw new HttpError(404, '内容不存在。'); return json(record);
 }
 if (documentId && request.method === 'PUT') {
  requireAdmin(user); const input = await body(request, 1_200_000);
  if (typeof input.source !== 'string' || input.source.length > 1_000_000 || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 300 || !Number.isSafeInteger(input.revision)) throw new HttpError(400, '内容、标题或版本无效。');
  const access = input.access === 'protected' ? 'protected' : input.access === 'public' ? 'public' : null;
  if (!access) throw new HttpError(400, '可见范围无效。');
  const current = await env.DB.prepare('SELECT source,revision,kind FROM documents WHERE id=?1').bind(documentId).first<{ source: string; revision: number; kind: string }>();
  if (!current) throw new HttpError(404, '内容不存在。');
  if (current.revision !== input.revision) throw new HttpError(409, '内容已被其他编辑更新，请重新读取并合并。');
  const source = validatedSource(current.kind,documentId,input.source,access);
  // Conditional revision insertion makes the following optimistic UPDATE safe in one D1 transaction.
  const changed = await env.DB.batch([
   env.DB.prepare('INSERT INTO document_revisions(document_id,revision,source,actor_id,created_at) SELECT id,revision,source,?1,?2 FROM documents WHERE id=?3 AND revision=?4').bind(user.id,nowSeconds(),documentId,input.revision),
   env.DB.prepare('UPDATE documents SET source=?1,title=?2,access=?3,state=\'draft\',revision=revision+1,updated_at=?4 WHERE id=?5 AND revision=?6 RETURNING revision').bind(source,input.title.trim(),access,nowSeconds(),documentId,input.revision),
  ]);
  if (!changed[1].results.length) throw new HttpError(409, '版本冲突，输入未保存。');
  await audit(env, user.id, 'documents.save', documentId); return json({ ok: true, revision: (changed[1].results[0] as { revision: number }).revision });
 }
 if (path === '/api/export' && request.method === 'GET') {
  requireAdmin(user);
  const type = url.searchParams.get('type') || 'all';
  if (![...KINDS,'users','uploads','audit','all'].includes(type)) throw new HttpError(400, '备份类型无效。');
  return exportBackup(env,user.id,type,KINDS);
 }
 if (path === '/api/audit' && request.method === 'GET') {
  requireAdmin(user); return json((await env.DB.prepare('SELECT a.action,a.target_id,a.created_at,u.email FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100').all()).results);
 }
 throw new HttpError(404, '未找到接口。');
}
