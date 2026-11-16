/// <reference path="../worker-configuration.d.ts" />
import { WorkerEntrypoint } from 'cloudflare:workers';
import { handleAuth, sessionUser, sessionView, cleanupAuth } from './auth';
import { handleManagement } from './content';
import { HttpError, json } from './http';
import { handleUploads } from './uploads';
import { handleSessions } from './sessions';
import { handleHistory } from './history';
import { handleUsers } from './userAccess';
export class AuthService extends WorkerEntrypoint<ConsoleEnv> {
 async session(cookies: string) { return sessionView(await sessionUser(this.env, cookies)); }
}
export default {
 async fetch(request, env, ctx): Promise<Response> {
  const url = new URL(request.url), origin = request.headers.get('Origin');
  const base = url.pathname === env.ADMIN_PATH || url.pathname.startsWith(env.ADMIN_PATH + '/') ? env.ADMIN_PATH : env.BASE_PATH;
  if (url.pathname === base) { url.pathname += '/'; return Response.redirect(url.href, 308); }
  if (!url.pathname.startsWith(base + '/')) return new Response('Not found', { status: 404 });
  url.pathname = url.pathname.slice(base.length);
  const allowed: string[] = [env.CONSOLE_ORIGIN, env.SITE_ORIGIN];
  let response: Response;
  try {
   if (origin && !allowed.includes(origin)) throw new HttpError(403, '请求来源无效。');
   if (request.method === 'OPTIONS') response = new Response(null, { status: origin ? 204 : 403 });
   else if (url.pathname.startsWith('/api/')) {
    if (!['GET','HEAD'].includes(request.method) && !origin) throw new HttpError(403, '请求缺少来源。');
    if (url.pathname.startsWith('/api/auth/')) {
     response = await handleAuth(request, env, url.pathname, base === env.ADMIN_PATH);
     if (url.pathname === '/api/auth/code' && response.ok) ctx.waitUntil(cleanupAuth(env));
    }
    else {
     const user = await sessionUser(env, request.headers.get('Cookie'));
     if (!user) throw new HttpError(401, '请先登录。');
     response = url.pathname.startsWith('/api/sessions') || /^\/api\/users\/[a-f0-9-]+\/sessions$/.test(url.pathname) ? await handleSessions(request, env, user, url) : url.pathname === '/api/profile' || url.pathname.startsWith('/api/users') ? await handleUsers(request, env, user, url) : url.pathname.startsWith('/api/uploads') ? await handleUploads(request, env, user, url) : /^\/api\/documents\/[^/]+\/revisions(?:\/|$)/.test(url.pathname) ? await handleHistory(request, env, user, url) : await handleManagement(request, env, user, url);
    }
   } else if (['GET','HEAD'].includes(request.method)) {
    if (base === env.ADMIN_PATH && url.pathname === '/') {
     const user = await sessionUser(env, request.headers.get('Cookie'));
     if (user && user.role !== 'admin') return Response.redirect(env.CONSOLE_ORIGIN + env.BASE_PATH + '/', 302);
    }
    response = await env.ASSETS.fetch(new Request(url, request));
   }
   else throw new HttpError(405, '方法不支持。');
  } catch (error) {
   if (error instanceof HttpError) response = json({ error: error.message, code: error.code || `HTTP_${error.status}`, ...(error.field ? {field:error.field} : {}) }, error.status);
   else { console.error(JSON.stringify({ event: 'console_request_failed' })); response = json({ error: '服务暂时不可用。' }, 503); }
  }
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff'); headers.set('Referrer-Policy','no-referrer');
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://assets.telysta.com https://library-files.telysta.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  headers.set('X-Frame-Options','DENY'); headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  if (url.pathname.startsWith('/api/')) headers.set('Cache-Control','no-store');
  if (origin && allowed.includes(origin)) {
   headers.set('Access-Control-Allow-Origin',origin); headers.set('Access-Control-Allow-Credentials','true'); headers.set('Vary','Origin, Cookie');
   headers.set('Access-Control-Allow-Methods','GET, POST, PUT, PATCH, DELETE, OPTIONS'); headers.set('Access-Control-Allow-Headers','Content-Type');
  }
  return new Response(response.body, { status: response.status, headers });
 },
} satisfies ExportedHandler<ConsoleEnv>;
