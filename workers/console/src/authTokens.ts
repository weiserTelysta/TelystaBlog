import { ADMIN_EMAIL, can, publicDisplayName, type User } from './permissions';
import { json } from './http';

export const SESSION_COOKIE = '__Secure-telysta-session';
export const SESSION_SECONDS = 8 * 60 * 60;
export const nowSeconds = () => Math.floor(Date.now() / 1000);
export const hex = (data: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(data), byte => byte.toString(16).padStart(2, '0')).join('');
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export async function tokenHash(token: string) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))); }
export function cookie(env: ConsoleEnv, token: string, age = SESSION_SECONDS) {
 return `${SESSION_COOKIE}=${token}; Path=/; Domain=${env.COOKIE_DOMAIN}; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
}
export function sessionToken(headers: string | null) {
 const token = headers?.split(';').map(value => value.trim()).find(value => value.startsWith(SESSION_COOKIE + '='))?.slice(SESSION_COOKIE.length + 1);
 return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export const USER_FIELDS = 'id,email,role,status,restricted_access,display_name,username,email_verified_at,credential_version';
export async function sessionUser(env: ConsoleEnv, cookies: string | null): Promise<User | null> {
 const token = sessionToken(cookies); if (!token) return null;
 const fields = USER_FIELDS.split(',').map(field => 'u.' + field).join(',');
 const user = await env.DB.prepare(`SELECT ${fields},(u.password_hash IS NOT NULL) AS has_password FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?1 AND s.expires_at>?2 AND s.credential_version=u.credential_version`).bind(await tokenHash(token), nowSeconds()).first<User>();
 if (!user || user.status !== 'active' || user.email_verified_at == null) return null;
 if (user.email === ADMIN_EMAIL) return { ...user, role: 'admin' };
 return ['viewer','member','superuser'].includes(user.role) ? user : null;
}
export function sessionView(user: User | null) {
 return { user: user ? {
  id: user.id, email: user.email, role: user.role, username: user.username || null,
  displayName: publicDisplayName(user), emailVerified: user.email_verified_at != null,
  needsSetup: !user.username || !user.has_password,
  restrictedAccess: can(user, 'restricted:read'),
 } : null, restricted: can(user, 'restricted:read') };
}
function ipHint(value: string) { return !value ? '' : value.includes(':') ? value.split(':').slice(0,3).join(':')+'::' : value.split('.').slice(0,3).join('.')+'.x'; }
/** Build a guarded session insert for the SAME D1 transaction as a credential write. */
export async function sessionInsert(env: ConsoleEnv, request: Request, userId: string, version: number, verifiedAt: number | null, guardHash?: string, proofUse?: string) {
 const token = randomToken(), now = nowSeconds();
 const statement = env.DB.prepare(`INSERT INTO sessions(token_hash,user_id,created_at,expires_at,id,user_agent,ip_hint,credential_version,verified_at)
 SELECT ?1,id,?3,?4,?5,?6,?7,credential_version,?9 FROM users
 WHERE id=?2 AND credential_version=?8 AND status='active' AND email_verified_at IS NOT NULL AND (?10 IS NULL OR password_hash=?10)
 AND (?11 IS NULL OR EXISTS(SELECT 1 FROM email_codes WHERE consumed_by=?11 AND email=users.email))`)
  .bind(await tokenHash(token), userId, now, now+SESSION_SECONDS, crypto.randomUUID(), (request.headers.get('User-Agent') || '').slice(0,240), ipHint(request.headers.get('CF-Connecting-IP') || '').slice(0,64), version, verifiedAt, guardHash ?? null, proofUse ?? null);
 return { token, statement };
}
export function authenticatedResponse(env: ConsoleEnv, user: User, token: string) {
 const response = json(sessionView(user)); response.headers.set('Set-Cookie', cookie(env, token)); return response;
}
export async function audit(env: ConsoleEnv, actor: string | null, action: string, target: string | null = null) {
 await env.DB.prepare('INSERT INTO audit_events(id,actor_id,action,target_id,created_at) VALUES(?1,?2,?3,?4,?5)').bind(crypto.randomUUID(), actor, action, target, nowSeconds()).run();
}
/** Conditional audit in the same transaction; failure rolls back credentials/proof too. */
export function authAudit(env: ConsoleEnv, actor: string, action: string, guard: {sessionHash?: string; passwordHash?: string}) {
 return env.DB.prepare(`INSERT INTO audit_events(id,actor_id,action,created_at)
  SELECT ?1,id,?3,?4 FROM users WHERE id=?2
  AND (?5 IS NULL OR password_hash=?5)
  AND (?6 IS NULL OR EXISTS(SELECT 1 FROM sessions WHERE user_id=?2 AND token_hash=?6))`)
  .bind(crypto.randomUUID(),actor,action,nowSeconds(),guard.passwordHash??null,guard.sessionHash??null);
}
