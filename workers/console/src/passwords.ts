import { scrypt, timingSafeEqual } from 'node:crypto';
import { HttpError } from './http';

// OWASP's scrypt N=2^15, r=8, p=3 profile. Never lower this for an account plan.
// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
const N = 32768, r = 8, p = 3, size = 32;
const encoder = new TextEncoder();
const common = new Set([
 'passwordpassword', 'password123456789', '123456789012345', '1234567890123456',
 'qwertyuiopasdfgh', 'qwertyuiopasdfghjkl', 'iloveyouiloveyou', 'letmeinletmein123',
 'correcthorsebatterystaple', 'weiserTelysta12345'.toLowerCase(),
]);
export function passwordInput(value: unknown, creating = true): string {
 if (typeof value !== 'string' || [...value].length > 128 || encoder.encode(value).length > 512 || value.includes('\0'))
  throw new HttpError(400, '密码最多128个字符，不能包含空字符。', 'PASSWORD_INVALID', 'password');
 if (creating && ([...value].length < 15 || common.has(value.toLowerCase())))
  throw new HttpError(400, '请使用至少15个字符的密码，并避免常见密码。', 'PASSWORD_WEAK', 'password');
 return value; // Whitespace and Unicode are intentional; never silently trim a password.
}
// Capacity, not request/user data: two 32 MiB derivations fit the 128 MiB isolate.
let activeDerivations = 0;
async function derive(password: string, salt: Uint8Array, pepper: string) {
 if (!pepper || pepper.length < 32) throw new HttpError(503, '认证服务暂未就绪。');
 if (activeDerivations >= 2) throw new HttpError(429, '登录服务繁忙，请稍后重试。', 'HTTP_429');
 activeDerivations++;
 try {
  const key = await crypto.subtle.importKey('raw', encoder.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const material = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode('telysta-password-v1:' + password)));
  return await new Promise<Uint8Array>((resolve, reject) => {
   scrypt(material, salt, size, { N, r, p, maxmem: 40 * 1024 * 1024 }, (error, result) => {
    material.fill(0);
    if (error) reject(error); else resolve(new Uint8Array(result));
   });
  });
 } finally { activeDerivations--; }
}
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const fromHex = (value: string) => Uint8Array.from(value.match(/../g) || [], byte => Number.parseInt(byte, 16));
export async function hashPassword(password: string, pepper: string) {
 const salt = crypto.getRandomValues(new Uint8Array(16));
 return `scrypt-v1$${N}$${r}$${p}$${hex(salt)}$${hex(await derive(password, salt, pepper))}`;
}
export async function verifyPassword(password: string, record: string | null, pepper: string) {
 const fields = /^scrypt-v1\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(record || '');
 // Unknown/legacy users do the same expensive work. Never derive attacker-chosen parameters.
 const salt = fromHex(fields?.[1] || 'f6c26b57730938803a17c74f24b22ad9');
 const expected = fromHex(fields?.[2] || '00'.repeat(32));
 const actual = await derive(password, salt, pepper);
 return timingSafeEqual(actual, expected) && fields !== null;
}
