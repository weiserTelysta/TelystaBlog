import { HttpError, json } from './http';
import { ADMIN_EMAIL, normalizeEmail } from './permissions';
import { hex, nowSeconds } from './authTokens';
import { sendCode } from './smtp';

export type Purpose = 'login' | 'register' | 'reset';
export type Challenge = { email: string; challenge_id: string; digest: string; purpose: Purpose; digest_version: number };
const encoder = new TextEncoder();
async function codeKey(env: ConsoleEnv) {
 if (!env.AUTH_PEPPER || env.AUTH_PEPPER.length < 32) throw new HttpError(503, '认证服务暂未就绪。');
 return crypto.subtle.importKey('raw', encoder.encode(env.AUTH_PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign','verify']);
}
function otp() {
 let value; do { value = crypto.getRandomValues(new Uint32Array(1))[0]; } while (value >= 4_294_000_000);
 return String(value % 1_000_000).padStart(6, '0');
}
export const challengeError = () => new HttpError(401, '验证码错误或已失效，请重新验证。', 'CODE_INVALID', 'code');
export async function checkChallenge(env: ConsoleEnv, email: string, code: unknown, purpose: Purpose): Promise<Challenge> {
 if (typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new HttpError(400, '请输入六位验证码。', 'CODE_INVALID', 'code');
 // Reserve one of five attempts before checking HMAC. Concurrent guesses cannot
 // all pass a SELECT attempts<5 check and perform uncounted verifications.
 const challenge = await env.DB.prepare('UPDATE email_codes SET attempts=attempts+1 WHERE email=?1 AND purpose=?2 AND expires_at>?3 AND used_at IS NULL AND attempts<5 RETURNING email,challenge_id,digest,purpose,digest_version').bind(email, purpose, nowSeconds()).first<Challenge>();
 if (!challenge) throw challengeError();
 const signature = Uint8Array.from(challenge.digest.match(/../g) || [], value => Number.parseInt(value, 16));
 const material = challenge.digest_version === 0 && purpose === 'login'
  ? `${email}:${challenge.challenge_id}:${code}` // Five-minute overlap for codes sent before deployment.
  : `${purpose}:${email}:${challenge.challenge_id}:${code}`;
 const correct = await crypto.subtle.verify('HMAC', await codeKey(env), signature, encoder.encode(material));
 if (!correct) throw challengeError();
 return challenge;
}
// Credential writes select this same live challenge INSIDE their transaction.
// A successful check alone does not consume proof or authorize a later unguarded write.
export const liveChallenge = "EXISTS(SELECT 1 FROM email_codes WHERE email=?1 AND challenge_id=?2 AND purpose=?3 AND used_at IS NULL AND attempts<=5 AND expires_at>?4)";
export async function sendChallenge(request: Request, env: ConsoleEnv, input: Record<string, unknown>, adminEntry: boolean) {
 const email = normalizeEmail(input.email), purpose = input.purpose ?? 'login';
 if (!email) throw new HttpError(400, '请输入有效邮箱。', 'EMAIL_INVALID', 'email');
 if (!['login','register','reset'].includes(String(purpose))) throw new HttpError(400, '验证用途无效。');
 if (adminEntry && email !== ADMIN_EMAIL) throw new HttpError(403, '请使用站主邮箱验证。');
 if (!env.SMTP_PASSWORD) throw new HttpError(503, '邮件服务暂未就绪。');
 const now = nowSeconds(), code = otp(), challenge = crypto.randomUUID();
 const digest = hex(await crypto.subtle.sign('HMAC', await codeKey(env), encoder.encode(`${purpose}:${email}:${challenge}:${code}`)));
 const emailKey=`email:${email}:${Math.floor(now/3600)}`, globalKey=`global:${Math.floor(now/86400)}`;
 const reserved = await env.DB.batch([
  env.DB.prepare('INSERT INTO email_codes(email,challenge_id,digest,sent_at,expires_at,purpose,digest_version) SELECT ?1,?2,?3,?4,?5,?9,1 WHERE coalesce((SELECT count FROM auth_limits WHERE key=?7),0)<5 AND coalesce((SELECT count FROM auth_limits WHERE key=?8),0)<200 ON CONFLICT(email) DO UPDATE SET challenge_id=excluded.challenge_id,digest=excluded.digest,sent_at=excluded.sent_at,expires_at=excluded.expires_at,purpose=excluded.purpose,digest_version=1,attempts=0,used_at=NULL,consumed_by=NULL WHERE email_codes.sent_at<=?6 RETURNING challenge_id')
   .bind(email, challenge, digest, now, now+300, now-60, emailKey, globalKey, purpose),
  ...[[emailKey,now+3600],[globalKey,now+86400]].map(([key,expires]) => env.DB.prepare('INSERT INTO auth_limits(key,count,expires_at) SELECT ?1,1,?2 WHERE EXISTS(SELECT 1 FROM email_codes WHERE email=?3 AND challenge_id=?4) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(key,expires,email,challenge)),
 ]);
 if (!reserved[0].results.length) throw new HttpError(429, '发送较频繁，请稍后再试。');
 try { await sendCode(env, email, code, purpose as Purpose); }
 catch {
  await env.DB.batch([
   env.DB.prepare('DELETE FROM email_codes WHERE email=?1 AND challenge_id=?2').bind(email,challenge),
   ...[emailKey,globalKey].map(key => env.DB.prepare('UPDATE auth_limits SET count=max(0,count-1) WHERE key=?1').bind(key)),
  ]);
  throw new HttpError(503, '验证码暂时无法发送，请稍后重试。');
 }
 // The same response and email delivery for new and existing addresses avoids account enumeration.
 return json({ ok: true, retryAfter: 60, expiresIn: 300 });
}
