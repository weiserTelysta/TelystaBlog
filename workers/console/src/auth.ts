import { HttpError, body, json } from './http';
import { initializeOwner, ownerEntry } from './ownerSetup';
import { cookie, nowSeconds, sessionToken, sessionUser, sessionView, tokenHash } from './authTokens';
import { sendChallenge } from './emailChallenges';
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
 if (path === '/api/auth/session' && request.method === 'GET') return json({ ...sessionView(await sessionUser(env, request.headers.get('Cookie'))), entry: adminEntry ? await ownerEntry(env) : {admin:false} });
 if (path === '/api/auth/username' && request.method === 'GET') return usernameAvailability(request,env,new URL(request.url).searchParams.get('value') || '',adminEntry);
 if (request.method !== 'POST') throw new HttpError(405, '方法不支持。');
 if (path === '/api/auth/logout') {
  const token = sessionToken(request.headers.get('Cookie'));
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?1').bind(await tokenHash(token)).run();
  const response = json({ok:true}); response.headers.set('Set-Cookie',cookie(env,'',0)); return response;
 }
 const limited = await env.AUTH_LIMITER.limit({key:request.headers.get('CF-Connecting-IP') || 'unknown'});
 if (!limited.success) throw new HttpError(429, '尝试较多，请稍后重试。');
 const input = await body(request);
 if (path === '/api/auth/owner-setup') { if(!adminEntry)throw new HttpError(404,'未找到接口。');return initializeOwner(request,env,input); }
 if (path === '/api/auth/code') return sendChallenge(request,env,input,adminEntry);
 if (path !== '/api/auth/verify') return handleCredentials(request,env,path,input,adminEntry);
 throw new HttpError(410,'请使用用户名与密码登录。','PASSWORD_LOGIN_REQUIRED');
}
