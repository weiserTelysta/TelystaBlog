import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
const books=JSON.parse(await readFile(new URL('./catalog.fixture.json',import.meta.url),'utf8'));
const publicBook=books.find(book=>book.access==='public'),privateBook=books.find(book=>book.access==='protected');
const origin='https://telysta.com',base='https://library.test';
async function fixture(t){
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'library-test',modules:true,scriptPath:fileURLToPath(new URL('../.tmp/test-build/index.js',import.meta.url)),compatibilityDate:'2026-11-14',r2Buckets:['LIBRARY_BUCKET'],bindings:{CATALOG_KEY:'fixture-v1',ALLOWED_ORIGINS:origin},serviceBindings:{AUTH_SERVICE:{name:'account-test',entrypoint:'AuthService'}}},{name:'account-test',modules:true,compatibilityDate:'2026-11-14',script:`import {WorkerEntrypoint} from 'cloudflare:workers'; export class AuthService extends WorkerEntrypoint { async session(cookie){ if(cookie.includes('unavailable')) throw new Error('Unavailable'); return {restricted:cookie.includes('__Secure-telysta-session=member')}; } } export default {fetch(){return new Response('fixture')}};`}]}));
 t.after(()=>mf.dispose());const bucket=await mf.getR2Bucket('LIBRARY_BUCKET','library-test'),content=new TextEncoder().encode('0123456789abcdefghijklmnopqrstuvwxyz');
 for(const book of books)await bucket.put(decodeURIComponent(new URL(book.files[0].href).pathname.slice(1)),content,{httpMetadata:{contentType:'application/pdf'}});
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
 const suffix=await mf.dispatchFetch(base+path,{headers:{Range:'bytes=-3'}});assert.equal(suffix.status,206);assert.equal(await suffix.text(),'xyz');
});
