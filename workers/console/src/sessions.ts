import { HttpError, json } from './http';
import { audit, nowSeconds, sessionToken, tokenHash } from './auth';
import { can, type User } from './permissions';
export async function handleSessions(request: Request, env: ConsoleEnv, user: User, url: URL) {
 const target=/^\/api\/users\/([a-f0-9-]{36})\/sessions$/.exec(url.pathname)?.[1];
 if(target&&!can(user,'users:manage'))throw new HttpError(403,'需要管理员权限。');
 const owner=target||user.id;
 if((url.pathname==='/api/sessions'||target)&&request.method==='GET'){
  const token=sessionToken(request.headers.get('Cookie')),current=token?await tokenHash(token):null;
  const records=await env.DB.prepare('SELECT id,created_at,expires_at,user_agent,ip_hint,token_hash FROM sessions WHERE user_id=?1 AND expires_at>?2 ORDER BY created_at DESC LIMIT 100').bind(owner,nowSeconds()).all<{id:string;created_at:number;expires_at:number;user_agent:string;ip_hint:string;token_hash:string}>();
  return json(records.results.map(({token_hash,...record})=>({...record,current:token_hash===current})));
 }
 if(target&&request.method==='DELETE'){
  const result=await env.DB.prepare('DELETE FROM sessions WHERE user_id=?1').bind(target).run();
  await audit(env,user.id,'sessions.revoke_all',target);return json({ok:true,revoked:result.meta.changes});
 }
 const id=/^\/api\/sessions\/([a-f0-9-]{32,36})$/.exec(url.pathname)?.[1];
 if(id&&request.method==='DELETE'){
  const record=await env.DB.prepare('SELECT user_id FROM sessions WHERE id=?1').bind(id).first<{user_id:string}>();
  if(!record)throw new HttpError(404,'会话已结束。');
  if(record.user_id!==user.id&&!can(user,'users:manage'))throw new HttpError(403,'只能退出自己的会话。');
  await env.DB.prepare('DELETE FROM sessions WHERE id=?1').bind(id).run();await audit(env,user.id,'sessions.revoke',id);return json({ok:true});
 }
 throw new HttpError(405,'方法不支持。');
}
