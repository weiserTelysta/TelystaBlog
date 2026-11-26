import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const base='https://telysta.com/console',origin='https://telysta.com';
export async function fixture(t,{outboundService}={}){
 const mf=new Miniflare(convertV4MiniflareOptions({name:'telysta-console-test',modules:true,scriptPath:fileURLToPath(new URL('../.tmp/test-build/index.js',import.meta.url)),compatibilityDate:'2026-11-14',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['LIBRARY_BUCKET','MEDIA_BUCKET'],serviceBindings:{ASSETS:()=>new Response('fixture')},...(outboundService?{outboundService}:{}),bindings:{CONSOLE_ORIGIN:origin,SITE_ORIGIN:origin,BASE_PATH:'/console',ADMIN_PATH:'/telysta-console',COOKIE_DOMAIN:'telysta.com',SMTP_HOST:'smtp.fixture',SMTP_USER:'weiser@telysta.com',SMTP_PASSWORD:'fixture-only',AUTH_PEPPER:'test-auth-pepper-with-more-than-32-bytes'},ratelimits:{AUTH_LIMITER:{namespace_id:'831415120',simple:{limit:100,period:60}}}}));
 t.after(()=>mf.dispose());const db=await mf.getD1Database('DB');
 for (const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort()) await db.exec((await readFile(new URL('../migrations/'+name,import.meta.url),'utf8')).replace(/^\s*--.*$/gm,'').replace(/\n/g,' '));
 await db.exec('CREATE TABLE test_outbox(email TEXT,code TEXT)');
 async function request(path,method='GET',value,cookie,headers={}){return mf.dispatchFetch(base+path,{method,headers:{Origin:origin,...(value!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:value===undefined?undefined:JSON.stringify(value)});}
 async function seedLegacy(email){
  email=email.toLowerCase();if(email==='weiser@telysta.com')return;
  await db.prepare("INSERT OR IGNORE INTO users(id,email,role,status,created_at,updated_at,email_verified_at) VALUES(?1,?2,'viewer','active',?3,?3,?3)").bind(crypto.randomUUID(),email,Math.floor(Date.now()/1000)).run();
 }
 async function ownerSetup(value,cookie){return mf.dispatchFetch(origin+'/telysta-console/api/auth/owner-setup',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(value)});}
 async function ownerProof(){const token=randomBytes(32).toString('hex');await db.prepare("INSERT INTO owner_initialization(id,token_hash,expires_at) VALUES('owner',?1,?2) ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,used_at=NULL").bind(createHash('sha256').update(token).digest('hex'),Math.floor(Date.now()/1000)+300).run();return token;}
 async function login(email){
  email=email.toLowerCase();const password='Fixture library passphrase 2026!';let response,code;
  const row=await db.prepare('SELECT password_hash FROM users WHERE email=?1').bind(email).first();
  if(email==='weiser@telysta.com'&&!row?.password_hash)response=await ownerSetup({username:'telysta',password,token:await ownerProof()});
  else if(!row){assert.equal((await request('/api/auth/code','POST',{email,purpose:'register'})).status,200);({code}=await db.prepare('SELECT code FROM test_outbox WHERE email=?1 ORDER BY rowid DESC LIMIT 1').bind(email).first());response=await request('/api/auth/register','POST',{email,username:'reader_'+randomBytes(6).toString('hex'),password,code});}
  else response=await request('/api/auth/login','POST',{identifier:email,password});
  assert.equal(response.status,200,await response.clone().text());return{cookie:response.headers.get('Set-Cookie').split(';')[0],body:await response.json(),code};
 }
 return{mf,db,request,login,seedLegacy,ownerProof,ownerSetup};
}
