import { HttpError, body, json } from './http';
import { audit, nowSeconds, sessionToken, tokenHash } from './auth';
import { can, type User } from './permissions';
import { BLOG_CATEGORY_IDS } from '../../../src/config/content/blogCategories';
import { validatedSource } from './validation';
import { exportBackup } from './backup';
import { describeDocument, editorOptions, patchDocument, type DocumentRecord } from './documentEditor';
import { CONFIG_DEFINITIONS } from './configEditor';
const KINDS = ['post','ebook','gallery','score','config'];
function requireOwner(user: User) { if (!can(user, 'site:manage')) throw new HttpError(403, '需要超级管理员权限。'); }
export async function handleManagement(request: Request, env: ConsoleEnv, user: User, url: URL) {
 const path = url.pathname;
 if (path === '/api/dashboard' && request.method === 'GET') {
  if (!can(user, 'site:manage')) return json({ role: user.role, uploads: await env.DB.prepare('SELECT count(*) AS count FROM uploads WHERE owner_id=?1 AND state=\'ready\'').bind(user.id).first() });
  const content = await env.DB.prepare('SELECT kind,count(*) AS count FROM documents GROUP BY kind').all();
  const users = await env.DB.prepare('SELECT role,count(*) AS count FROM users GROUP BY role').all();
  return json({ content: content.results, users: users.results });
 }
 if (path === '/api/editor/options' && request.method === 'GET') { requireOwner(user); return json(editorOptions()); }
 const editorMatch=/^\/api\/documents\/([A-Za-z0-9_-]{1,100})\/editor$/.exec(path);
 if(editorMatch){
  requireOwner(user);
  const record=await env.DB.prepare('SELECT * FROM documents WHERE id=?1').bind(editorMatch[1]).first<DocumentRecord>();
  if(!record)throw new HttpError(404,'内容不存在。');
  if(request.method==='GET')return json({record,editor:describeDocument(record)});
  if(request.method!=='PATCH')throw new HttpError(405,'方法不支持。');
  const input=await body(request,1_200_000);
  if(!Number.isSafeInteger(input.revision))throw new HttpError(400,'版本无效。');
  if(input.revision!==record.revision)throw new HttpError(409,'内容已被更新，请对照最新版本合并。','VERSION_CONFLICT');
  let base=record;
  if(input.restoreRevision!==undefined){
   if(!Number.isSafeInteger(input.restoreRevision)||Number(input.restoreRevision)<1)throw new HttpError(400,'历史版本无效。');
   const old=await env.DB.prepare('SELECT source FROM document_revisions WHERE document_id=?1 AND revision=?2').bind(record.id,input.restoreRevision).first<{source:string}>();
   if(!old)throw new HttpError(404,'历史版本不存在。');
   base={...record,source:old.source};
  }
  const next=patchDocument(base,input);
  const source=validatedSource(record.kind,record.id,next.source,next.access as 'public'|'protected');
  const revision=await saveDocument(request,env,user,record,source,next.title,next.access);
  return json({ok:true,revision,record:{...record,...next,source,revision,state:'draft'},editor:describeDocument({...record,...next,source,revision})});
 }
 if (path === '/api/documents' && request.method === 'GET') {
  requireOwner(user); const kind = url.searchParams.get('kind') || 'post';
  if (!KINDS.includes(kind)) throw new HttpError(400, '内容类型无效。');
  const query = (url.searchParams.get('q') || '').slice(0,100), offset = Math.min(100000, Math.max(0, Number(url.searchParams.get('offset')) || 0));
  const records = await env.DB.prepare('SELECT id,kind,title,source_path,access,state,revision,updated_at FROM documents WHERE kind=?1 AND instr(title,?2)>0 ORDER BY updated_at DESC,id LIMIT 100 OFFSET ?3').bind(kind,query,offset).all();
  const total = await env.DB.prepare('SELECT count(*) AS count FROM documents WHERE kind=?1 AND instr(title,?2)>0').bind(kind,query).first();
  return json({ records: kind==='config'?records.results.map(record=>({...record,settings:CONFIG_DEFINITIONS.filter(def=>def.file===record.source_path)})):records.results, total });
 }
 if (path === '/api/documents' && request.method === 'POST') {
  requireOwner(user); const input = await body(request);
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
  requireOwner(user);
  const record = await env.DB.prepare('SELECT * FROM documents WHERE id=?1').bind(documentId).first();
  if (!record) throw new HttpError(404, '内容不存在。'); return json(record);
 }
 if (documentId && request.method === 'PUT') {
  requireOwner(user); const input = await body(request, 1_200_000);
  if (typeof input.source !== 'string' || input.source.length > 1_000_000 || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 300 || !Number.isSafeInteger(input.revision)) throw new HttpError(400, '内容、标题或版本无效。');
  const access = input.access === 'protected' ? 'protected' : input.access === 'public' ? 'public' : null;
  if (!access) throw new HttpError(400, '可见范围无效。');
  const current = await env.DB.prepare('SELECT source,revision,kind FROM documents WHERE id=?1').bind(documentId).first<{ source: string; revision: number; kind: string }>();
  if (!current) throw new HttpError(404, '内容不存在。');
  if (current.revision !== input.revision) throw new HttpError(409, '内容已被其他编辑更新，请重新读取并合并。');
  const source = validatedSource(current.kind,documentId,input.source,access);
  const revision=await saveDocument(request,env,user,{id:documentId,revision:current.revision},source,input.title.trim(),access);
  return json({ok:true,revision});
 }
 if (path === '/api/export' && request.method === 'GET') {
  requireOwner(user);
  const type = url.searchParams.get('type') || 'all';
  if (![...KINDS,'users','uploads','audit','all'].includes(type)) throw new HttpError(400, '备份类型无效。');
  return exportBackup(env,user.id,type,KINDS);
 }
 if (path === '/api/audit' && request.method === 'GET') {
  requireOwner(user); return json((await env.DB.prepare('SELECT a.action,a.target_id,a.created_at,u.email FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100').all()).results);
 }
 throw new HttpError(404, '未找到接口。');
}

async function saveDocument(request:Request,env:ConsoleEnv,user:User,record:Pick<DocumentRecord,'id'|'revision'>,source:string,title:string,access:string){
 if(!title.trim()||title.length>300||source.length>1_000_000)throw new HttpError(400,'内容或标题无效。');
 const token=sessionToken(request.headers.get('Cookie'));if(!token)throw new HttpError(401,'请重新登录。');
 const sessionHash=await tokenHash(token),now=nowSeconds();
 const permission="EXISTS(SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?5 AND s.user_id=?1 AND s.expires_at>?2 AND s.credential_version=u.credential_version AND u.status='active')";
 const changed=await env.DB.batch([
  env.DB.prepare(`INSERT INTO document_revisions(document_id,revision,source,actor_id,created_at) SELECT id,revision,source,?1,?2 FROM documents WHERE id=?3 AND revision=?4 AND ${permission}`).bind(user.id,now,record.id,record.revision,sessionHash),
  env.DB.prepare(`UPDATE documents SET source=?6,title=?7,access=?8,state='draft',revision=revision+1,updated_at=?2 WHERE id=?3 AND revision=?4 AND ${permission} RETURNING revision`).bind(user.id,now,record.id,record.revision,sessionHash,source,title.trim(),access),
  env.DB.prepare("INSERT INTO audit_events(id,actor_id,action,target_id,created_at) SELECT ?1,?2,'documents.save',?3,?4 WHERE changes()=1").bind(crypto.randomUUID(),user.id,record.id,now),
 ]);
 if(!changed[1].results.length)throw new HttpError(409,'版本或登录状态已改变，输入未保存。','VERSION_CONFLICT');
 return (changed[1].results[0] as {revision:number}).revision;
}
