import bundledCatalog from './catalog.generated.json';
type Book = {
  id: string; title: string; authors: string[]; access: 'public' | 'protected';
  href: string; cover?: string; files: { href: string; format: string; bytes?: number }[];
  [key: string]: unknown;
};
let catalogCache: { key: string; books: Book[]; assets: Map<string, boolean> } | undefined;
async function authenticated(request: Request, env: LibraryGatewayEnv) {
  if (!request.headers.get('Cookie')?.includes('__Secure-telysta-session=')) return false;
  try { return (await env.AUTH_SERVICE.session(request.headers.get('Cookie') || '')).restricted === true; }
  catch { return false; }
}
function assetKey(href: string) {
  const url = new URL(href);
  if (url.origin !== 'https://library-files.telysta.com') throw new Error('Unexpected asset origin');
  const key = decodeURIComponent(url.pathname.slice(1));
  if (!/^(books|covers)\//.test(key) || key.includes('\\') || key.split('/').includes('..')) throw new Error('Unexpected asset key');
  return key;
}
async function catalog(env: LibraryGatewayEnv) {
  if (catalogCache?.key === env.CATALOG_KEY) return catalogCache;
  const books = bundledCatalog as Book[];
  if (!Array.isArray(books) || books.length > 10000) throw new Error('Invalid catalog');
  const assets = new Map<string, boolean>();
  for (const book of books) {
    if (!['public', 'protected'].includes(book.access) || !Array.isArray(book.files)) throw new Error('Invalid access policy');
    for (const file of book.files) {
      const key = assetKey(file.href), restricted = book.access === 'protected';
      // A shared object must remain protected if any record requires protection.
      assets.set(key, (assets.get(key) ?? false) || restricted);
    }
    if (book.cover) {
      const key = assetKey(book.cover);
      // A cover already used by a public book is a public image.
      assets.set(key, (assets.get(key) ?? true) && book.access === 'protected');
    }
  }
  catalogCache = { key: env.CATALOG_KEY, books, assets };
  return catalogCache;
}
function byteRange(value: string, size: number): { offset: number; length: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  if (!match[1]) { const length = Math.min(size, Number(match[2])); return length > 0 ? { offset: size - length, length } : null; }
  const offset = Number(match[1]), end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  return Number.isSafeInteger(offset) && offset >= 0 && offset <= end ? { offset, length: end - offset + 1 } : null;
}

export default {
  async fetch(request, env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const allowed = env.ALLOWED_ORIGINS.split(',').map(value => value.trim());
    const headers = new Headers({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Vary': 'Origin, Cookie' });
    if (origin && !allowed.includes(origin)) return new Response('Forbidden', { status: 403, headers });
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin); headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, ETag');
    }
    const json = (body: unknown, status = 200) => { headers.delete('Content-Length'); headers.delete('Content-Range'); headers.set('Cache-Control', 'no-store'); headers.set('Content-Type', 'application/json; charset=utf-8'); return new Response(JSON.stringify(body), { status, headers }); };
    try {
      if (request.method === 'OPTIONS') {
        if (!origin) return new Response(null, { status: 403, headers });
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS'); headers.set('Access-Control-Allow-Headers', 'Content-Type, Range, If-Range, If-None-Match');
        return new Response(null, { status: 204, headers });
      }
      const url = new URL(request.url), unlocked = await authenticated(request, env);
      if (url.pathname === '/api/session' && request.method === 'GET') return json({ authenticated: unlocked });
      if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers });
      const manifest = await catalog(env);
      if (url.pathname === '/api/catalog') return json(manifest.books.filter(book => unlocked || book.access === 'public'));
      let key; try { key = decodeURIComponent(url.pathname.slice(1)); } catch { return new Response(null, { status: 400, headers }); }
      const restricted = manifest.assets.get(key);
      if (restricted === undefined) return new Response('Not found', { status: 404, headers });
      if (restricted && !unlocked) return new Response('请先解锁书室。', { status: 401, headers });
      const head = await env.LIBRARY_BUCKET.head(key);
      if (!head) return new Response('Not found', { status: 404, headers });
      head.writeHttpMetadata(headers); headers.set('ETag', head.httpEtag); headers.set('Accept-Ranges', 'bytes');
      headers.set('Cache-Control', restricted ? 'private, no-store' : key.startsWith('covers/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
      headers.set('Content-Security-Policy', `frame-ancestors ${allowed.filter(value => value.startsWith('https://')).join(' ') || "'none'"}`);
      if (request.headers.get('If-None-Match')?.split(',').map(value => value.trim()).includes(head.httpEtag)) return new Response(null, { status: 304, headers });
      let range;
      const rangeHeader = request.headers.get('Range'), ifRange = request.headers.get('If-Range');
      if (rangeHeader && (!ifRange || ifRange === head.httpEtag)) {
        range = byteRange(rangeHeader, head.size);
        if (!range) { headers.set('Content-Range', `bytes */${head.size}`); return new Response(null, { status: 416, headers }); }
        headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`);
      }
      headers.set('Content-Length', String(range ? range.length : head.size));
      if (url.searchParams.get('download') === '1') headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(key.split('/').at(-1)!)}`);
      if (request.method === 'HEAD') return new Response(null, { status: range ? 206 : 200, headers });
      const object = await env.LIBRARY_BUCKET.get(key, range ? { range } : undefined);
      if (!object) return new Response(null, { status: 404, headers });
      return new Response(object.body, { status: range ? 206 : 200, headers });
    } catch {
      console.error(JSON.stringify({ event: 'library_gateway_error' }));
      return json({ error: '书室服务暂时不可用。' }, 503);
    }
  },
} satisfies ExportedHandler<LibraryGatewayEnv>;
