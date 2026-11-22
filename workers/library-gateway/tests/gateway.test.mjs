import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
const books=JSON.parse(await readFile(new URL('./catalog.fixture.json',import.meta.url),'utf8'));
const publicBook=books.find(book=>book.access==='public'),privateBook=books.find(book=>book.access==='protected');
const origin='https://telysta.com',base='https://library.test';
async function fixture(t){
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'library-test',modules:true,scriptPath:fileURLToPath(new URL('../.tmp/test-build/index.js',import.meta.url)),compatibilityDate:'2026-11-14',r2Buckets:['LIBRARY_BUCKET'],durableObjects:{ANONYMOUS_DOWNLOADS:{className:'AnonymousDownloads',useSQLite:true}},bindings:{CATALOG_KEY:'fixture-v1',ALLOWED_ORIGINS:origin,ANONYMOUS_QUOTA_SECRET:'test-only-secret-not-a-production-key'},serviceBindings:{AUTH_SERVICE:{name:'account-test',entrypoint:'AuthService'}}},{name:'account-test',modules:true,compatibilityDate:'2026-11-14',script:`import {WorkerEntrypoint} from 'cloudflare:workers'; export class AuthService extends WorkerEntrypoint { async session(cookie){ if(cookie.includes('unavailable')) throw new Error('Unavailable'); return {user:/__Secure-telysta-session=(viewer|member)(;|$)/.test(cookie)?{id:'fixture'}:null,restricted:cookie.includes('__Secure-telysta-session=member')}; } } export default {fetch(){return new Response('fixture')}};`}]}));
 t.after(()=>mf.dispose());const bucket=await mf.getR2Bucket('LIBRARY_BUCKET','library-test'),content=new TextEncoder().encode('0123456789abcdefghijklmnopqrstuvwxyz');
 for(const book of books){for(const file of book.files)await bucket.put(decodeURIComponent(new URL(file.href).pathname.slice(1)),content,{httpMetadata:{contentType:'application/pdf'}});if(book.cover)await bucket.put(decodeURIComponent(new URL(book.cover).pathname.slice(1)),content,{httpMetadata:{contentType:'image/webp'}});}
 return{mf,content};
}
test('匿名和普通用户目录不包含受保护资料，未知对象不透传',async t=>{
 const{mf}=await fixture(t);
 for(const cookie of ['', '__Secure-telysta-session=viewer']){
  const data=await(await mf.dispatchFetch(base+'/api/catalog',{headers:{Cookie:cookie}})).json();assert.equal(data.length,1);assert.equal(data[0].id,publicBook.id);
  for(const method of ['GET','HEAD'])assert.equal((await mf.dispatchFetch(base+new URL(privateBook.files[0].href).pathname,{method,headers:{Cookie:cookie,Range:'bytes=0-4'}})).status,401);
 }
 assert.equal((await mf.dispatchFetch(base+'/gateway/catalog-v1.json')).status,404);
 assert.equal((await mf.dispatchFetch(base+'/books/not-listed.pdf')).status,404);
});
test('正式用户权限来自内部认证服务，受保护Range保持字节且不缓存',async t=>{
 const{mf,content}=await fixture(t),headers={Cookie:'__Secure-telysta-session=member',Origin:origin,Range:'bytes=2-8'};
 const data=await(await mf.dispatchFetch(base+'/api/catalog',{headers})).json();assert.equal(data.length,2);
 const response=await mf.dispatchFetch(base+new URL(privateBook.files[0].href).pathname,{headers});assert.equal(response.status,206);assert.equal(await response.text(),'2345678');assert.equal(response.headers.get('Content-Range'),`bytes 2-8/${content.length}`);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('Access-Control-Allow-Credentials'),'true');
});
test('认证服务失败时保持受保护状态，旧公共密码接口不再授予权限',async t=>{
 const{mf}=await fixture(t);const response=await mf.dispatchFetch(base+'/api/catalog',{headers:{Cookie:'__Secure-telysta-session=unavailable'}});assert.equal((await response.json()).length,1);
 assert.equal((await mf.dispatchFetch(base+'/api/unlock',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:'legacy-password'})})).status,405);
});
test('异源请求被拒绝，公开文件支持Range与416',async t=>{
 const{mf}=await fixture(t),path=new URL(publicBook.files[0].href).pathname;
 assert.equal((await mf.dispatchFetch(base+path,{headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await mf.dispatchFetch(base+path,{headers:{Range:'bytes=5000-'}})).status,416);
 const suffix=await mf.dispatchFetch(base+path,{headers:{Range:'bytes=-3','CF-Connecting-IP':'192.0.2.1'}});assert.equal(suffix.status,206);assert.equal(await suffix.text(),'xyz');
});

test('匿名每天十个不同文件，续传/重复下载不扣次，换IP独立计数',async t=>{
 const{mf}=await fixture(t),paths=publicBook.files.map(file=>new URL(file.href).pathname),ip='192.0.2.10';
 const get=(path,extra={})=>mf.dispatchFetch(base+path,{headers:{'CF-Connecting-IP':ip,...extra}});
 const batch=await Promise.all(paths.slice(0,12).map(path=>get(path)));
 assert.equal(batch.filter(r=>r.status===200).length,10);assert.equal(batch.filter(r=>r.status===429).length,2);
 for(const r of batch)await r.arrayBuffer();
 const used=paths[batch.findIndex(r=>r.status===200)],blocked=paths[batch.findIndex(r=>r.status===429)];
 const retry=await get(used,{Range:'bytes=0-4'});assert.equal(retry.status,206);assert.equal(await retry.text(),'01234');assert.equal(retry.headers.get('X-Download-Remaining'),'0');
 assert.equal(retry.headers.get('Cache-Control'),'private, no-store');
 const limited=await get(blocked);assert.equal(limited.status,429);assert.equal(limited.headers.get('Content-Length'),null);assert.equal(limited.headers.get('Content-Range'),null);assert(Number(limited.headers.get('Retry-After'))>0);assert.equal((await limited.json()).code,'anonymous_download_limit');
 const reset=new Date(Number(limited.headers.get('X-Download-Reset'))*1000+8*3600000);assert.equal(reset.getUTCHours(),0);assert.equal(reset.getUTCMinutes(),0);
 assert.equal((await get(blocked,{'CF-Connecting-IP':'192.0.2.11'})).status,200);
 // Arbitrary forwarding headers and an invalid session do not bypass the real edge IP quota.
 assert.equal((await get(blocked,{'X-Forwarded-For':'192.0.2.99',Cookie:'__Secure-telysta-session=forged'})).status,429);
 // A valid ordinary account is distinct from permission to read protected material.
 assert.equal((await get(blocked,{Cookie:'__Secure-telysta-session=viewer'})).status,200);
 assert.equal((await mf.dispatchFetch(base+new URL(privateBook.files[0].href).pathname,{headers:{'CF-Connecting-IP':ip,Cookie:'__Secure-telysta-session=viewer'}})).status,401);
});
test('HEAD、304、416、封面和不存在对象不消耗下载额度',async t=>{
 const{mf}=await fixture(t),paths=publicBook.files.map(file=>new URL(file.href).pathname),headers={'CF-Connecting-IP':'2001:db8::10'};
 const head=await mf.dispatchFetch(base+paths[0],{method:'HEAD',headers});assert.equal(head.status,200);
 for(const path of paths){
  assert.equal((await mf.dispatchFetch(base+path,{method:'HEAD',headers})).status,200);
  assert.equal((await mf.dispatchFetch(base+path,{headers:{...headers,'If-None-Match':head.headers.get('ETag')}})).status,304);
  assert.equal((await mf.dispatchFetch(base+path,{headers:{...headers,Range:'bytes=5000-'}})).status,416);
 }
 for(let i=0;i<12;i++){assert.equal((await mf.dispatchFetch(base+new URL(publicBook.cover).pathname,{headers})).status,200);assert.equal((await mf.dispatchFetch(base+'/books/missing.epub',{headers})).status,404);}
 const response=await mf.dispatchFetch(base+paths[0],{headers});assert.equal(response.status,200);assert.equal(response.headers.get('X-Download-Remaining'),'9');
 assert.equal((await mf.dispatchFetch(base+paths[1],{headers:{'CF-Connecting-IP':'x'.repeat(65)}})).status,503);
});
test('每日额度由同一个Durable Object持久计数，另一天独立',async t=>{
 const{mf}=await fixture(t),ns=await mf.getDurableObjectNamespace('ANONYMOUS_DOWNLOADS','library-test'),until=Date.now()+60000;
 const stub=ns.getByName('isolated-quota');
 for(let i=0;i<10;i++)assert.equal((await stub.acquire('books/test/'+i,until)).allowed,true);
 assert.equal((await ns.getByName('isolated-quota').acquire('books/test/eleven',until)).allowed,false);
 assert.equal((await ns.getByName('next-day-quota').acquire('books/test/eleven',until)).remaining,9);
});
