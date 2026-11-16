import { HttpError, json } from './http';
import { ADMIN_EMAIL, normalizeEmail, type User } from './permissions';
import { authenticatedResponse, authAudit, cookie, nowSeconds, sessionInsert, sessionToken, sessionUser, tokenHash, USER_FIELDS } from './authTokens';
import { challengeError, checkChallenge, liveChallenge } from './emailChallenges';
import { hashPassword, passwordInput, verifyPassword } from './passwords';
import { usernameInput } from './usernames';

type Account = User & { password_hash: string | null; credential_version: number };
const SELECT = `SELECT ${USER_FIELDS},password_hash,(password_hash IS NOT NULL) AS has_password FROM users`;
const invalidLogin = () => new HttpError(401, '用户名、邮箱或密码不正确。', 'LOGIN_INVALID');
function emailInput(input: Record<string, unknown>, admin: boolean) {
 const email = normalizeEmail(input.email);
 if (!email) throw new HttpError(400, '请输入有效邮箱。', 'EMAIL_INVALID', 'email');
 if (admin && email !== ADMIN_EMAIL) throw invalidLogin();
 return email;
}
function only(input: Record<string, unknown>, fields: string[]) {
 if (Object.keys(input).some(field => !fields.includes(field))) throw new HttpError(400, '账户参数无效。');
}
async function account(env: ConsoleEnv, field: 'id'|'email', value: string) {
 return env.DB.prepare(`${SELECT} WHERE ${field}=?1`).bind(value).first<Account>();
}
export async function identityLimit(env: ConsoleEnv, identity: string, kind = 'login', maximum = 10) {
 const now = nowSeconds(), window = Math.floor(now / 60), key = `${kind}:${await tokenHash(identity)}:${window}`;
 const result = await env.DB.prepare('INSERT INTO auth_limits(key,count,expires_at) VALUES(?1,1,?2) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<?3 RETURNING count').bind(key, now+120, maximum).first();
 if (!result) throw new HttpError(429, '尝试较多，请稍后再试。');
}
export async function usernameAvailability(request: Request, env: ConsoleEnv, value: string) {
 await identityLimit(env, request.headers.get('CF-Connecting-IP') || 'unknown', 'username', 20);
 let username: string;
 try { username = usernameInput(value); } catch { return json({ available: false }); }
 const existing = await env.DB.prepare('SELECT id FROM users WHERE username=?1').bind(username).first();
 return json({ available: !existing, normalized: username });
}
async function readAfterWrite(env: ConsoleEnv, id: string): Promise<Account> {
 const user = await account(env, 'id', id);
 if (!user) throw new HttpError(409, '账户状态已改变，请重试。');
 return user;
}
function consumeForHash(env: ConsoleEnv, email: string, challenge: string, hash: string, id: string, now: number) {
 return env.DB.prepare('UPDATE email_codes SET used_at=?1 WHERE email=?2 AND challenge_id=?3 AND EXISTS(SELECT 1 FROM users WHERE id=?4 AND password_hash=?5)').bind(now,email,challenge,id,hash);
}
export async function handleCredentials(request: Request, env: ConsoleEnv, path: string, input: Record<string, unknown>, adminEntry: boolean) {
 const now = nowSeconds();
 if (path === '/api/auth/register') {
  only(input, ['email','code','username','password']);
  const email = emailInput(input, adminEntry), username = usernameInput(input.username, email), password = passwordInput(input.password);
  const proof = await checkChallenge(env, email, input.code, 'register');
  const existing = await account(env, 'email', email);
  if (existing) throw new HttpError(409, '此邮箱已有账户，请登录或找回密码。', 'ACCOUNT_EXISTS', 'email');
  if (await env.DB.prepare('SELECT id FROM users WHERE username=?1').bind(username).first()) throw new HttpError(409, '这个用户名已被使用，请换一个。', 'USERNAME_TAKEN', 'username');
  const hash = await hashPassword(password, env.AUTH_PEPPER), id = crypto.randomUUID();
  const session = await sessionInsert(env, request, id, 0, now, hash);
  const result = await env.DB.batch([
   env.DB.prepare(`INSERT INTO users(id,email,username,password_hash,email_verified_at,role,status,created_at,updated_at,last_login_at)
    SELECT ?5,?1,?6,?7,?4,?8,'active',?4,?4,?4 WHERE ${liveChallenge}
    AND NOT EXISTS(SELECT 1 FROM users WHERE email=?1 OR username=?6) RETURNING id`)
    .bind(email, proof.challenge_id, 'register', now, id, username, hash, email === ADMIN_EMAIL ? 'admin' : 'viewer'),
   consumeForHash(env, email, proof.challenge_id, hash, id, now), session.statement,
   authAudit(env,id,'auth.register',{sessionHash:await tokenHash(session.token)}),
  ]);
  if (!result[0].results.length) throw new HttpError(409, '用户名、邮箱或验证码状态已改变，请检查后重试。');
  if (result[2].meta.changes !== 1) throw new HttpError(409, '登录状态已改变，请重新登录。');
  return authenticatedResponse(env, await readAfterWrite(env,id), session.token);
 }
 if (path === '/api/auth/login') {
  only(input, ['identifier','password']);
  if (typeof input.identifier !== 'string' || !input.identifier.trim() || input.identifier.length > 254) throw invalidLogin();
  const identifier = input.identifier.trim().toLowerCase(), password = passwordInput(input.password, false);
  await identityLimit(env, identifier);
  const user = await env.DB.prepare(`${SELECT} WHERE email=?1 OR username=?1`).bind(identifier).first<Account>();
  const valid = await verifyPassword(password, user?.password_hash || null, env.AUTH_PEPPER);
  if (!valid || !user || user.status !== 'active' || user.email_verified_at == null || adminEntry && user.email !== ADMIN_EMAIL) throw invalidLogin();
  const session = await sessionInsert(env, request, user.id, user.credential_version, null, user.password_hash!);
  // An old password verified immediately before a reset must not create a valid new session.
  const result = await env.DB.batch([
   session.statement,
   env.DB.prepare('UPDATE users SET last_login_at=?1 WHERE id=?2 AND EXISTS(SELECT 1 FROM sessions WHERE token_hash=?3)').bind(now,user.id,await tokenHash(session.token)),
   authAudit(env,user.id,'auth.login.password',{sessionHash:await tokenHash(session.token)}),
  ]);
  if (result[0].meta.changes !== 1) throw invalidLogin();
  return authenticatedResponse(env, await readAfterWrite(env,user.id), session.token);
 }
 if (path === '/api/auth/setup') {
  only(input, ['username','password']);
  const user = await sessionUser(env, request.headers.get('Cookie'));
  const token = sessionToken(request.headers.get('Cookie'));
  if (!user || !token) throw new HttpError(401, '请先验证邮箱。');
  const old = await account(env, 'id', user.id);
  if (!old || old.password_hash) throw new HttpError(409, '账户已设置密码，请使用修改密码。');
  const username = usernameInput(input.username, old.email), password = passwordInput(input.password);
  if (old.username && old.username !== username) throw new HttpError(409, '用户名已确定，不能在此修改。');
  const current = await env.DB.prepare('SELECT verified_at FROM sessions WHERE token_hash=?1 AND expires_at>?2').bind(await tokenHash(token), now).first<{verified_at:number|null}>();
  if (current?.verified_at == null || current.verified_at <= now-600) throw new HttpError(401, '请重新验证邮箱后设置密码。', 'EMAIL_REVERIFY');
  if (await env.DB.prepare('SELECT id FROM users WHERE username=?1 AND id<>?2').bind(username, old.id).first()) throw new HttpError(409, '这个用户名已被使用，请换一个。', 'USERNAME_TAKEN', 'username');
  const hash = await hashPassword(password, env.AUTH_PEPPER), version = old.credential_version + 1;
  const next = await sessionInsert(env, request, old.id, version, now, hash);
  const result = await env.DB.batch([
   env.DB.prepare(`UPDATE users SET username=?1,password_hash=?2,credential_version=?3,updated_at=?4
    WHERE id=?5 AND password_hash IS NULL AND credential_version=?6 AND status='active'
    AND NOT EXISTS(SELECT 1 FROM users WHERE username=?1 AND id<>?5)
    AND EXISTS(SELECT 1 FROM sessions WHERE token_hash=?7 AND expires_at>?4 AND verified_at>?8) RETURNING id`)
    .bind(username, hash, version, now, old.id, old.credential_version, await tokenHash(token), now-600),
   env.DB.prepare('DELETE FROM sessions WHERE user_id=?1 AND EXISTS(SELECT 1 FROM users WHERE id=?1 AND password_hash=?2)').bind(old.id,hash),
   next.statement,authAudit(env,old.id,'auth.credentials.setup',{sessionHash:await tokenHash(next.token)}),
  ]);
  if (!result[0].results.length || result[2].meta.changes !== 1) throw new HttpError(409, '账户状态已改变，请重新验证。');
  return authenticatedResponse(env, await readAfterWrite(env,old.id),next.token);
 }
 if (path === '/api/auth/reset') {
  only(input, ['email','code','password','username']);
  const email = emailInput(input, adminEntry), password = passwordInput(input.password);
  const proof = await checkChallenge(env, email, input.code, 'reset');
  const old = await account(env, 'email', email);
  if (!old || old.status !== 'active') throw new HttpError(401, '此账户暂时无法恢复。');
  if (!old.username && !input.username) throw new HttpError(409, '请为旧账户设置用户名。', 'USERNAME_REQUIRED', 'username');
  const username = old.username || usernameInput(input.username, old.email);
  if (await env.DB.prepare('SELECT id FROM users WHERE username=?1 AND id<>?2').bind(username,old.id).first()) throw new HttpError(409, '这个用户名已被使用，请换一个。', 'USERNAME_TAKEN', 'username');
  const hash = await hashPassword(password, env.AUTH_PEPPER);
  const result = await env.DB.batch([
   env.DB.prepare(`UPDATE users SET username=?5,password_hash=?6,credential_version=credential_version+1,updated_at=?4,email_verified_at=?4
    WHERE email=?1 AND status='active' AND credential_version=?7 AND ${liveChallenge}
    AND NOT EXISTS(SELECT 1 FROM users WHERE username=?5 AND id<>?8) RETURNING id`)
    .bind(email,proof.challenge_id,'reset',now,username,hash,old.credential_version,old.id),
   consumeForHash(env,email,proof.challenge_id,hash,old.id,now),
   env.DB.prepare('DELETE FROM sessions WHERE user_id=?1 AND EXISTS(SELECT 1 FROM users WHERE id=?1 AND password_hash=?2)').bind(old.id,hash),
   authAudit(env,old.id,'auth.password.reset',{passwordHash:hash}),
  ]);
  if (!result[0].results.length) throw challengeError();
  const response = json({ok:true}); response.headers.set('Set-Cookie',cookie(env,'',0)); return response;
 }
 if (path === '/api/auth/password') {
  only(input, ['currentPassword','password']);
  const user = await sessionUser(env,request.headers.get('Cookie'));
  if (!user) throw new HttpError(401,'请先登录。');
  const old = await account(env,'id',user.id), password = passwordInput(input.password);
  if (!old || !await verifyPassword(passwordInput(input.currentPassword,false),old.password_hash,env.AUTH_PEPPER)) throw new HttpError(401,'当前密码不正确。','CURRENT_PASSWORD_INVALID','currentPassword');
  const hash = await hashPassword(password,env.AUTH_PEPPER), version = old.credential_version+1;
  const next = await sessionInsert(env,request,user.id,version,null,hash);
  const result = await env.DB.batch([
   env.DB.prepare('UPDATE users SET password_hash=?1,credential_version=?2,updated_at=?3 WHERE id=?4 AND credential_version=?5 AND password_hash=?6 AND status=\'active\' AND EXISTS(SELECT 1 FROM sessions WHERE token_hash=?7 AND user_id=?4 AND expires_at>?3 AND credential_version=?5) RETURNING id').bind(hash,version,now,user.id,old.credential_version,old.password_hash,await tokenHash(sessionToken(request.headers.get('Cookie'))!)),
   env.DB.prepare('DELETE FROM sessions WHERE user_id=?1 AND EXISTS(SELECT 1 FROM users WHERE id=?1 AND password_hash=?2)').bind(user.id,hash),next.statement,
   authAudit(env,user.id,'auth.password.change',{sessionHash:await tokenHash(next.token)}),
  ]);
  if (!result[0].results.length || result[2].meta.changes !== 1) throw new HttpError(409,'账户状态已改变，请重新登录。');
  return authenticatedResponse(env,await readAfterWrite(env,user.id),next.token);
 }
 throw new HttpError(404,'未找到接口。');
}
