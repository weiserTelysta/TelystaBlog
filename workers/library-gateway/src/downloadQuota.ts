import { DurableObject } from 'cloudflare:workers';

const DAY = 86_400_000, SHANGHAI = 8 * 3_600_000;
export const ANONYMOUS_DOWNLOAD_LIMIT = 10;

export function downloadDay(now = Date.now()) {
 const day = Math.floor((now + SHANGHAI) / DAY);
 return { day, resetAt: (day + 1) * DAY - SHANGHAI };
}

/** One private, globally coordinated object per IP and calendar day; never stores the IP. */
export class AnonymousDownloads extends DurableObject<LibraryGatewayEnv> {
 async acquire(key: string, resetAt: number) {
  if (!key.startsWith('books/') || !Number.isSafeInteger(resetAt) || resetAt <= Date.now() || resetAt > Date.now() + DAY) throw new Error('Invalid quota request');
  const sql = this.ctx.storage.sql;
  sql.exec('CREATE TABLE IF NOT EXISTS downloads (asset TEXT PRIMARY KEY)');
  // Synchronous SQL statements run without yielding, so concurrent requests cannot overbook.
  const seen = sql.exec<{ asset: string }>('SELECT asset FROM downloads WHERE asset=?', key).toArray().length > 0;
  let count = sql.exec<{ count: number }>('SELECT count(*) AS count FROM downloads').one().count;
  const allowed = seen || count < ANONYMOUS_DOWNLOAD_LIMIT;
  if (allowed && !seen) {
   sql.exec('INSERT INTO downloads(asset) VALUES (?)', key);
   count++;
  }
  await this.ctx.storage.setAlarm(resetAt);
  return { allowed, remaining: Math.max(0, ANONYMOUS_DOWNLOAD_LIMIT - count), resetAt };
 }

 async alarm() { await this.ctx.storage.deleteAll(); }
}

export async function anonymousDownload(request: Request, env: LibraryGatewayEnv, key: string) {
 // Trust only Cloudflare's edge-supplied client address, not caller-controlled forwarded headers.
 const ip = request.headers.get('CF-Connecting-IP')?.trim().toLowerCase();
 if (!ip || ip.length > 64 || !env.ANONYMOUS_QUOTA_SECRET) throw new Error('Download quota is unavailable');
 const { day, resetAt } = downloadDay();
 const secret = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.ANONYMOUS_QUOTA_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
 const digest = new Uint8Array(await crypto.subtle.sign('HMAC', secret, new TextEncoder().encode(`${day}:${ip}`)));
 const name = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
 return env.ANONYMOUS_DOWNLOADS.getByName(name).acquire(key, resetAt);
}
