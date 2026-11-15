import { HttpError, body, json } from './http';
import { ADMIN_EMAIL, can, normalizeEmail, type User } from './permissions';
import { sendCode } from './smtp';
export const SESSION_COOKIE = '__Secure-telysta-session';
const SESSION_SECONDS = 8 * 60 * 60;
function ipHint(value: string) { return !value ? '' : value.includes(':') ? value.split(':').slice(0,3).join(':')+'::' : value.split('.').slice(0,3).join('.')+'.x'; }
const encoder = new TextEncoder();
export const nowSeconds = () => Math.floor(Date.now() / 1000);
export async function cleanupAuth(env: ConsoleEnv) {
 const now = nowSeconds();
 await env.DB.batch([
  env.DB.prepare('DELETE FROM email_codes WHERE expires_at<?1').bind(now-3600),
  env.DB.prepare('DELETE FROM sessions WHERE expires_at<?1').bind(now),
  env.DB.prepare('DELETE FROM auth_limits WHERE expires_at<?1').bind(now),
  env.DB.prepare('DELETE FROM upload_limits WHERE expires_at<?1').bind(now),
 ]);
}
function hex(data: ArrayBuffer | Uint8Array) { return Array.from(new Uint8Array(data), byte => byte.toString(16).padStart(2, '0')).join(''); }
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export async function tokenHash(token: string) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(token))); }
async function codeKey(env: ConsoleEnv) {
 if (!env.AUTH_PEPPER || env.AUTH_PEPPER.length < 32) throw new HttpError(503, '认证服务暂未就绪。');
 return crypto.subtle.importKey('raw', encoder.encode(env.AUTH_PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign','verify']);
}
function cookie(env: ConsoleEnv, token: string, age = SESSION_SECONDS) {
 return `${SESSION_COOKIE}=${token}; Path=/; Domain=${env.COOKIE_DOMAIN}; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
}
export function sessionToken(headers: string | null) {
 const token = headers?.split(';').map(value => value.trim()).find(value => value.startsWith(SESSION_COOKIE + '='))?.slice(SESSION_COOKIE.length + 1);
 return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export async function sessionUser(env: ConsoleEnv, cookies: string | null): Promise<User | null> {
 const token = sessionToken(cookies); if (!token) return null;
 const user = await env.DB.prepare('SELECT u.id,u.email,u.role,u.status FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?1 AND s.expires_at>?2').bind(await tokenHash(token), nowSeconds()).first<User>();
 if (!user || user.status !== 'active') return null;
 // The sole administrator identity is server-owned, never supplied by registration or a role claim.
 if (user.email === ADMIN_EMAIL) return { ...user, role: 'admin' };
 if (!['viewer','member','superuser'].includes(user.role)) return null;
 return user;
}
export function sessionView(user: User | null) {
 return { user: user ? { id: user.id, email: user.email, role: user.role } : null, restricted: can(user, 'restricted:read') };
}
export async function audit(env: ConsoleEnv, actor: string | null, action: string, target: string | null = null) {
 await env.DB.prepare('INSERT INTO audit_events(id,actor_id,action,target_id,created_at) VALUES(?1,?2,?3,?4,?5)').bind(crypto.randomUUID(), actor, action, target, nowSeconds()).run();
}
function otp() { let number; do { number = crypto.getRandomValues(new Uint32Array(1))[0]; } while (number >= 4_294_000_000); return String(number % 1_000_000).padStart(6, '0'); }
export async function handleAuth(request: Request, env: ConsoleEnv, path: string, adminEntry = false) {
 if (path === '/api/auth/session' && request.method === 'GET') return json({ ...sessionView(await sessionUser(env, request.headers.get('Cookie'))), entry: { admin: adminEntry, email: adminEntry ? ADMIN_EMAIL : null } });
 if (request.method !== 'POST') throw new HttpError(405, '方法不支持。');
 if (path === '/api/auth/logout') {
  const token = sessionToken(request.headers.get('Cookie'));
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?1').bind(await tokenHash(token)).run();
  const response = json({ ok: true }); response.headers.set('Set-Cookie', cookie(env, '', 0)); return response;
 }
 if (!['/api/auth/code','/api/auth/verify'].includes(path)) throw new HttpError(404, '未找到接口。');
 const limited = await env.AUTH_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
 if (!limited.success) throw new HttpError(429, '尝试较多，请稍后重试。');
 const input = await body(request), email = normalizeEmail(input.email);
 if (!email) throw new HttpError(400, '请输入有效邮箱。');
 if (adminEntry && email !== ADMIN_EMAIL) throw new HttpError(403, '此入口仅供超级管理员验证，请从账户入口登录。');
 const now = nowSeconds();
 if (path === '/api/auth/code') {
  if (!env.SMTP_PASSWORD) throw new HttpError(503, '邮件服务暂未就绪。');
  const code = otp(), challenge = crypto.randomUUID(), key = await codeKey(env);
  const digest = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${email}:${challenge}:${code}`)));
  const previous = await env.DB.prepare('SELECT sent_at FROM email_codes WHERE email=?1').bind(email).first<{ sent_at: number }>();
  if (previous && previous.sent_at > now - 60) throw new HttpError(429, '请在一分钟后重新获取。');
  const emailKey=`email:${email}:${Math.floor(now/3600)}`,globalKey=`global:${Math.floor(now/86400)}`;
  // D1 batch is transactional: only the request that reserves this challenge charges either quota.
  const reserved = await env.DB.batch([
   env.DB.prepare('INSERT INTO email_codes(email,challenge_id,digest,sent_at,expires_at) SELECT ?1,?2,?3,?4,?5 WHERE coalesce((SELECT count FROM auth_limits WHERE key=?7),0)<5 AND coalesce((SELECT count FROM auth_limits WHERE key=?8),0)<200 ON CONFLICT(email) DO UPDATE SET challenge_id=excluded.challenge_id,digest=excluded.digest,sent_at=excluded.sent_at,expires_at=excluded.expires_at,attempts=0,used_at=NULL WHERE email_codes.sent_at<=?6 RETURNING challenge_id').bind(email,challenge,digest,now,now+300,now-60,emailKey,globalKey),
   ...[[emailKey,now+3600],[globalKey,now+86400]].map(([key,expires])=>env.DB.prepare('INSERT INTO auth_limits(key,count,expires_at) SELECT ?1,1,?2 WHERE EXISTS(SELECT 1 FROM email_codes WHERE email=?3 AND challenge_id=?4) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(key,expires,email,challenge)),
  ]);
  if (!reserved[0].results.length) throw new HttpError(429, '发送较频繁，请稍后再试。');
  try {
   await sendCode(env, email, code);
  } catch (error) {
   await env.DB.batch([
    env.DB.prepare('DELETE FROM email_codes WHERE email=?1 AND challenge_id=?2').bind(email,challenge),
    ...[emailKey,globalKey].map(key=>env.DB.prepare('UPDATE auth_limits SET count=max(0,count-1) WHERE key=?1').bind(key)),
   ]);
   if(error instanceof HttpError)throw error;
   throw new HttpError(503, '验证码暂时无法发送，请稍后重试。');
  }
  return json({ ok: true, retryAfter: 60, expiresIn: 300 });
 }
 if (typeof input.code !== 'string' || !/^\d{6}$/.test(input.code)) throw new HttpError(400, '请输入六位验证码。');
 const challenge = await env.DB.prepare('SELECT challenge_id,digest FROM email_codes WHERE email=?1 AND expires_at>?2 AND used_at IS NULL AND attempts<5').bind(email, now).first<{ challenge_id: string; digest: string }>();
 if (!challenge) throw new HttpError(401, '验证码错误或已失效。');
 const signature = Uint8Array.from(challenge.digest.match(/../g) || [], value => parseInt(value, 16));
 const correct = await crypto.subtle.verify('HMAC', await codeKey(env), signature, encoder.encode(`${email}:${challenge.challenge_id}:${input.code}`));
 if (!correct) {
  await env.DB.prepare('UPDATE email_codes SET attempts=attempts+1 WHERE email=?1 AND challenge_id=?2 AND used_at IS NULL').bind(email, challenge.challenge_id).run();
  throw new HttpError(401, '验证码错误或已失效。');
 }
 const consumed = await env.DB.prepare('UPDATE email_codes SET used_at=?1 WHERE email=?2 AND challenge_id=?3 AND used_at IS NULL AND attempts<5 AND expires_at>?1 RETURNING challenge_id').bind(now, email, challenge.challenge_id).first();
 if (!consumed) throw new HttpError(401, '验证码错误或已失效。');
 await env.DB.prepare('INSERT INTO users(id,email,role,status,created_at,updated_at,last_login_at) VALUES(?1,?2,?3,\'active\',?4,?4,?4) ON CONFLICT(email) DO UPDATE SET last_login_at=excluded.last_login_at').bind(crypto.randomUUID(), email, email === ADMIN_EMAIL ? 'admin' : 'viewer', now).run();
 const user = await env.DB.prepare('SELECT id,email,role,status FROM users WHERE email=?1').bind(email).first<User>();
 if (!user || user.status !== 'active') throw new HttpError(403, '账号已停用。');
 const token = randomToken();
 await env.DB.batch([
  env.DB.prepare('DELETE FROM sessions WHERE user_id=?1 AND expires_at<=?2').bind(user.id, now),
  env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at,id,user_agent,ip_hint) VALUES(?1,?2,?3,?4,?5,?6,?7)').bind(await tokenHash(token), user.id, now, now+SESSION_SECONDS, crypto.randomUUID(), (request.headers.get('User-Agent') || '').slice(0,240), ipHint(request.headers.get('CF-Connecting-IP') || '').slice(0,64)),
 ]);
 await audit(env, user.id, 'auth.login');
 const response = json(sessionView(user)); response.headers.set('Set-Cookie', cookie(env, token)); return response;
}
