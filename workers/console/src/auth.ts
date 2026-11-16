import { HttpError, body, json } from './http';
import { ADMIN_EMAIL, normalizeEmail, type User } from './permissions';
import { authenticatedResponse, authAudit, cookie, nowSeconds, sessionInsert, sessionToken, sessionUser, sessionView, tokenHash, USER_FIELDS } from './authTokens';
import { challengeError, checkChallenge, sendChallenge } from './emailChallenges';
import { handleCredentials, usernameAvailability } from './credentialAuth';
export { SESSION_COOKIE, sessionUser, sessionView, audit, nowSeconds, sessionToken, tokenHash, randomToken } from './authTokens';

export async function cleanupAuth(env: ConsoleEnv) {
 const now = nowSeconds();
 await env.DB.batch([
  env.DB.prepare('DELETE FROM email_codes WHERE expires_at<?1').bind(now-3600),
  env.DB.prepare('DELETE FROM sessions WHERE expires_at<?1').bind(now),
  env.DB.prepare('DELETE FROM auth_limits WHERE expires_at<?1').bind(now),
  env.DB.prepare('DELETE FROM upload_limits WHERE expires_at<?1').bind(now),
 ]);
}
export async function handleAuth(request: Request, env: ConsoleEnv, path: string, adminEntry = false) {
 if (path === '/api/auth/session' && request.method === 'GET') return json({ ...sessionView(await sessionUser(env, request.headers.get('Cookie'))), entry: { admin: adminEntry, email: adminEntry ? ADMIN_EMAIL : null } });
 if (path === '/api/auth/username' && request.method === 'GET') return usernameAvailability(request,env,new URL(request.url).searchParams.get('value') || '');
 if (request.method !== 'POST') throw new HttpError(405, '方法不支持。');
 if (path === '/api/auth/logout') {
  const token = sessionToken(request.headers.get('Cookie'));
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?1').bind(await tokenHash(token)).run();
  const response = json({ok:true}); response.headers.set('Set-Cookie',cookie(env,'',0)); return response;
 }
 const limited = await env.AUTH_LIMITER.limit({key:request.headers.get('CF-Connecting-IP') || 'unknown'});
 if (!limited.success) throw new HttpError(429, '尝试较多，请稍后重试。');
 const input = await body(request);
 if (path === '/api/auth/code') return sendChallenge(request,env,input,adminEntry);
 if (path !== '/api/auth/verify') return handleCredentials(request,env,path,input,adminEntry);
 const email = normalizeEmail(input.email);
 if (!email) throw new HttpError(400, '请输入有效邮箱。');
 if (adminEntry && email !== ADMIN_EMAIL) throw new HttpError(403, '请使用站主邮箱验证。');
 const now = nowSeconds(), proof = await checkChallenge(env,email,input.code,'login');
 let user = await env.DB.prepare(`SELECT ${USER_FIELDS},(password_hash IS NOT NULL) AS has_password FROM users WHERE email=?1`).bind(email).first<User>();
 if (!user && email !== ADMIN_EMAIL) throw new HttpError(409,'请先注册；已有账户可使用找回密码。');
 if (user?.has_password && email !== ADMIN_EMAIL) throw new HttpError(409,'请使用密码登录，或通过找回密码重新设置。');
 if (user?.status === 'suspended') throw new HttpError(403,'账号已停用。');
 // Only the fixed owner may be bootstrapped by email alone. All other new users register explicitly.
 const ownerId = user?.id || crypto.randomUUID();
 const version = user?.credential_version || 0;
 const proofUse = crypto.randomUUID();
 const session = await sessionInsert(env,request,ownerId,version,now,undefined,proofUse);
 const result = await env.DB.batch([
  env.DB.prepare("UPDATE email_codes SET used_at=?1,consumed_by=?4 WHERE email=?2 AND challenge_id=?3 AND purpose='login' AND used_at IS NULL AND attempts<=5 AND expires_at>?1 RETURNING challenge_id").bind(now,email,proof.challenge_id,proofUse),
  env.DB.prepare("INSERT INTO users(id,email,username,role,status,created_at,updated_at,last_login_at,email_verified_at) SELECT ?1,?2,'weiser','admin','active',?3,?3,?3,?3 WHERE ?2=?4 AND EXISTS(SELECT 1 FROM email_codes WHERE email=?2 AND consumed_by=?5) ON CONFLICT(email) DO NOTHING").bind(ownerId,email,now,ADMIN_EMAIL,proofUse),
  env.DB.prepare('UPDATE users SET last_login_at=?1,email_verified_at=coalesce(email_verified_at,?1) WHERE id=?2 AND EXISTS(SELECT 1 FROM email_codes WHERE email=?3 AND consumed_by=?4)').bind(now,ownerId,email,proofUse),
  session.statement,
  authAudit(env,ownerId,'auth.login.email',{sessionHash:await tokenHash(session.token)}),
 ]);
 if (!result[0].results.length) {
  throw challengeError();
 }
 if (result[3].meta.changes !== 1) throw new HttpError(409,'账户状态已改变，请重试。');
 user = await env.DB.prepare(`SELECT ${USER_FIELDS},(password_hash IS NOT NULL) AS has_password FROM users WHERE id=?1`).bind(ownerId).first<User>();
 if (!user) throw new HttpError(409,'账户状态已改变，请重试。');
 return authenticatedResponse(env,user,session.token);
}
