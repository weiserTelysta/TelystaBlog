import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const base='https://telysta.com/console',origin='https://telysta.com';
export async function fixture(t){
 const mf=new Miniflare(convertV4MiniflareOptions({name:'telysta-console-test',modules:true,scriptPath:fileURLToPath(new URL('../.tmp/test-build/index.js',import.meta.url)),compatibilityDate:'2026-11-14',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['LIBRARY_BUCKET','MEDIA_BUCKET'],serviceBindings:{ASSETS:()=>new Response('fixture')},bindings:{CONSOLE_ORIGIN:origin,SITE_ORIGIN:origin,BASE_PATH:'/console',ADMIN_PATH:'/telysta-console',COOKIE_DOMAIN:'telysta.com',SMTP_HOST:'smtp.fixture',SMTP_USER:'weiser@telysta.com',SMTP_PASSWORD:'fixture-only',AUTH_PEPPER:'test-auth-pepper-with-more-than-32-bytes'},ratelimits:{AUTH_LIMITER:{namespace_id:'831415120',simple:{limit:100,period:60}}}}));
 t.after(()=>mf.dispose());const db=await mf.getD1Database('DB');
 for (const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort()) await db.exec((await readFile(new URL('../migrations/'+name,import.meta.url),'utf8')).replace(/^\s*--.*$/gm,'').replace(/\n/g,' '));
 await db.exec('CREATE TABLE test_outbox(email TEXT,code TEXT)');
 async function request(path,method='GET',value,cookie,headers={}){return mf.dispatchFetch(base+path,{method,headers:{Origin:origin,...(value!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:value===undefined?undefined:JSON.stringify(value)});}
 async function seedLegacy(email){
  email=email.toLowerCase();if(email==='weiser@telysta.com')return;
  await db.prepare("INSERT OR IGNORE INTO users(id,email,role,status,created_at,updated_at,email_verified_at) VALUES(?1,?2,'viewer','active',?3,?3,?3)").bind(crypto.randomUUID(),email,Math.floor(Date.now()/1000)).run();
 }
 async function login(email){await seedLegacy(email);assert.equal((await request('/api/auth/code','POST',{email})).status,200);const {code}=await db.prepare('SELECT code FROM test_outbox WHERE email=?1 ORDER BY rowid DESC LIMIT 1').bind(email.toLowerCase()).first();const response=await request('/api/auth/verify','POST',{email,code});assert.equal(response.status,200);return {cookie:response.headers.get('Set-Cookie').split(';')[0],body:await response.json(),code};}
 return{mf,db,request,login,seedLegacy};
}
