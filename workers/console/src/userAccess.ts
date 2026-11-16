import { audit, nowSeconds } from './auth';
import { body, HttpError, json } from './http';
import { ADMIN_EMAIL, can, publicDisplayName, ROLES, type User } from './permissions';
import { displayNameInput } from './usernames';

type UserRow = User & { created_at: number; last_login_at: number | null };
function view(user: UserRow | User) {
 return {
  id: user.id, email: user.email, username: user.username || null, role: user.role, status: user.status,
  displayName: publicDisplayName(user), restrictedAccess: can(user, 'restricted:read'),
  ...('created_at' in user ? { createdAt: user.created_at, lastLoginAt: user.last_login_at } : {}),
 };
}
export async function handleUsers(request: Request, env: ConsoleEnv, user: User, url: URL) {
 if (url.pathname === '/api/profile') {
  if (request.method === 'GET') return json(view(user));
  if (request.method !== 'PATCH') throw new HttpError(405, '方法不支持。');
  const input = await body(request);
  if (Object.keys(input).some(key => key !== 'displayName')) throw new HttpError(400, '此处只能修改自己的昵称。');
  const displayName = displayNameInput(input.displayName);
  await env.DB.prepare('UPDATE users SET display_name=?1,updated_at=?2 WHERE id=?3').bind(displayName, nowSeconds(), user.id).run();
  await audit(env, user.id, 'profile.update', user.id);
  return json(view({ ...user, display_name: displayName }));
 }
 if (!can(user, 'users:manage')) throw new HttpError(403, '只有超级管理员可以管理用户授权。');
 if (url.pathname === '/api/users' && request.method === 'GET') {
  const pageValue = Number(url.searchParams.get('page') || 1);
  if (!Number.isSafeInteger(pageValue) || pageValue < 1 || pageValue > 4000) throw new HttpError(400, '页码无效。');
  const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
  const role = url.searchParams.get('role') || '', status = url.searchParams.get('status') || '';
  if (role && !(ROLES as readonly string[]).includes(role) || status && !['active','suspended'].includes(status)) throw new HttpError(400, '筛选条件无效。');
  const clause = "(instr(lower(email),lower(?1))>0 OR instr(lower(coalesce(username,'')),lower(?1))>0 OR instr(lower(coalesce(display_name,'')),lower(?1))>0) AND (?2='' OR role=?2) AND (?3='' OR status=?3)";
  const rows = await env.DB.prepare(`SELECT id,email,role,status,restricted_access,display_name,username,created_at,last_login_at FROM users WHERE ${clause} ORDER BY created_at DESC,id LIMIT 25 OFFSET ?4`).bind(query, role, status, (pageValue - 1) * 25).all<UserRow>();
  const count = await env.DB.prepare(`SELECT count(*) AS count FROM users WHERE ${clause}`).bind(query, role, status).first<{count:number}>();
  return json({ records: rows.results.map(view), total: count?.count || 0, page: pageValue, pageSize: 25 });
 }
 const id = /^\/api\/users\/([a-f0-9-]{36})$/.exec(url.pathname)?.[1];
 if (!id) throw new HttpError(404, '未找到用户。');
 if (request.method !== 'PATCH') throw new HttpError(405, '方法不支持。');
 const target = await env.DB.prepare('SELECT id,email,role,status,restricted_access,display_name,username FROM users WHERE id=?1').bind(id).first<User>();
 if (!target) throw new HttpError(404, '未找到用户。');
 if (target.email === ADMIN_EMAIL) throw new HttpError(403, '超级管理员身份和访问权限固定。');
 const input = await body(request);
 if (!Object.keys(input).length || Object.keys(input).some(key => !['role','status','restrictedAccess'].includes(key))) throw new HttpError(400, '授权参数无效。');
 const role = input.role ?? target.role, status = input.status ?? target.status;
 const restrictedAccess = input.restrictedAccess === undefined ? target.restricted_access === 1 : input.restrictedAccess;
 if (typeof role !== 'string' || typeof status !== 'string' || !['viewer','member','superuser'].includes(role) || !['active','suspended'].includes(status) || typeof restrictedAccess !== 'boolean') throw new HttpError(400, '角色、账号状态或访问权限无效。');
 const changed = role !== target.role || status !== target.status || restrictedAccess !== (target.restricted_access === 1);
 if (changed) {
  await env.DB.batch([
   env.DB.prepare('UPDATE users SET role=?1,status=?2,restricted_access=?3,updated_at=?4 WHERE id=?5').bind(role, status, restrictedAccess ? 1 : 0, nowSeconds(), id),
   env.DB.prepare('DELETE FROM sessions WHERE user_id=?1').bind(id),
  ]);
  await audit(env, user.id, 'users.update', id);
 }
 return json({ ok: true, sessionsRevoked: changed });
}
