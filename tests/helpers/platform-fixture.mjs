import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import { browserTestOrigin } from '../../scripts/browser-test-address.mjs';
const require=createRequire(path.resolve('workers/console/package.json'));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
export async function createPlatformFixture(){
 const assetFiles={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/app.css':'app.css','/style.css':'style.css','/tokens.css':'tokens.css','/cinzel.woff2':'cinzel.woff2'};
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[
  {name:'library-fixture',routes:['library-files.telysta.com/*'],modules:true,scriptPath:path.resolve('workers/library-gateway/.tmp/test-build/index.js'),compatibilityDate:'2026-11-14',r2Buckets:['LIBRARY_BUCKET'],durableObjects:{ANONYMOUS_DOWNLOADS:{className:'AnonymousDownloads',useSQLite:true}},bindings:{ANONYMOUS_QUOTA_SECRET:'browser-test-only-key',CATALOG_KEY:'fixture-browser',ALLOWED_ORIGINS:'https://telysta.com'},serviceBindings:{AUTH_SERVICE:{name:'console-fixture',entrypoint:'AuthService'}}},
  {name:'console-fixture',routes:['telysta.com/console*','telysta.com/telysta-console*'],modules:true,scriptPath:path.resolve('workers/console/.tmp/test-build/index.js'),compatibilityDate:'2026-11-14',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['LIBRARY_BUCKET','MEDIA_BUCKET'],bindings:{CONSOLE_ORIGIN:'https://telysta.com',SITE_ORIGIN:'https://telysta.com',BASE_PATH:'/console',ADMIN_PATH:'/telysta-console',COOKIE_DOMAIN:'telysta.com',SMTP_HOST:'smtp.fixture',SMTP_USER:'weiser@telysta.com',SMTP_PASSWORD:'fixture-only',AUTH_PEPPER:'browser-fixture-auth-pepper-more-than-32-bytes'},ratelimits:{AUTH_LIMITER:{namespace_id:'831415120',simple:{limit:100,period:60}}},serviceBindings:{ASSETS:async request=>{const file=assetFiles[new URL(request.url).pathname];return file?new Response(await fs.readFile(path.resolve('workers/console/.assets',file)),{headers:{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':'text/html'}}):new Response('Not found',{status:404});}}}
 ]}));
 const db=await mf.getD1Database('DB','console-fixture');
 for(const name of (await fs.readdir('workers/console/migrations')).filter(name=>name.endsWith('.sql')).sort())await db.exec((await fs.readFile(path.resolve('workers/console/migrations',name),'utf8')).replace(/^\s*--.*$/gm,'').replace(/\n/g,' '));
 await db.exec('CREATE TABLE test_outbox(email TEXT,code TEXT)');
 return{mf,db,async attach(context){
  const handle=async route=>{const req=route.request();const response=await mf.dispatchFetch(req.url(),{method:req.method(),headers:await req.allHeaders(),body:req.postDataBuffer()||undefined});await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});};
  await context.route('https://telysta.com/**',async route=>{const url=new URL(route.request().url());if(/^\/(?:telysta-)?console(?:\/|$)/.test(url.pathname)){await handle(route);return;}const response=await route.fetch({url:browserTestOrigin+url.pathname+url.search});await route.fulfill({response});});
  await context.route('https://library-files.telysta.com/**',handle);
 },async ownerLink(){
  const token=randomBytes(32).toString('hex');await db.prepare("INSERT INTO owner_initialization(id,token_hash,expires_at) VALUES('owner',?1,?2) ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,used_at=NULL").bind(createHash('sha256').update(token).digest('hex'),Math.floor(Date.now()/1000)+300).run();return 'https://telysta.com/telysta-console/#setup='+token;
 },async login(page,email){
  const password='Browser fixture library passphrase 2026!';
  const existing=await db.prepare('SELECT password_hash FROM users WHERE email=?1').bind(email).first();
  const owner=email==='weiser@telysta.com';
  if(owner&&!existing?.password_hash){
   const token=randomBytes(32).toString('hex');await db.prepare("INSERT INTO owner_initialization(id,token_hash,expires_at) VALUES('owner',?1,?2) ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,used_at=NULL").bind(createHash('sha256').update(token).digest('hex'),Math.floor(Date.now()/1000)+300).run();
   await page.goto('https://telysta.com/telysta-console/#setup='+token);await page.getByLabel('用户名',{exact:true}).fill('telysta');await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'保存并进入控制台'}).click();return;
  }
  if(existing?.password_hash){await page.getByLabel('用户名或邮箱').fill(email);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录',exact:true}).click();return;}
  await page.goto('https://telysta.com/console/?view='+(existing?'reset':'register'));
  if(!existing)await page.getByLabel('用户名',{exact:true}).fill('reader_'+randomBytes(6).toString('hex'));
  await page.getByLabel('邮箱',{exact:true}).fill(email);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'获取验证码',exact:true}).click();
  await page.locator('#login-status').getByText('验证码已发送，五分钟内有效。').waitFor();
  const{code}=await db.prepare('SELECT code FROM test_outbox WHERE email=?1 ORDER BY rowid DESC LIMIT 1').bind(email).first();await page.getByLabel('六位验证码').fill(code);await page.locator('#sign-in').click();
  if(existing){await page.getByLabel('用户名',{exact:true}).fill('reader_'+randomBytes(6).toString('hex'));await page.locator('#sign-in').click();await page.locator('#identifier').waitFor();await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录',exact:true}).click();}
 }};
}
