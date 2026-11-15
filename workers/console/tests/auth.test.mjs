import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
const base='https://telysta.com/console',origin='https://telysta.com';
async function fixture(t){
 const mf=new Miniflare(convertV4MiniflareOptions({name:'telysta-console-test',modules:true,scriptPath:fileURLToPath(new URL('../.tmp/test-build/index.js',import.meta.url)),compatibilityDate:'2026-11-14',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['LIBRARY_BUCKET','MEDIA_BUCKET'],serviceBindings:{ASSETS:()=>new Response('fixture')},bindings:{CONSOLE_ORIGIN:origin,SITE_ORIGIN:origin,BASE_PATH:'/console',ADMIN_PATH:'/telysta-console',COOKIE_DOMAIN:'telysta.com',SMTP_HOST:'smtp.fixture',SMTP_USER:'weiser@telysta.com',SMTP_PASSWORD:'fixture-only',AUTH_PEPPER:'test-auth-pepper-with-more-than-32-bytes'},ratelimits:{AUTH_LIMITER:{namespace_id:'831415120',simple:{limit:100,period:60}}}}));
 t.after(()=>mf.dispose());const db=await mf.getD1Database('DB');
 const schema=await readFile(new URL('../migrations/0001_auth_content.sql',import.meta.url),'utf8');
 await db.exec(schema.replace(/\n/g,' '));await db.exec(await readFile(new URL('../migrations/0002_source_baseline.sql',import.meta.url),'utf8'));await db.exec((await readFile(new URL('../migrations/0003_session_management.sql',import.meta.url),'utf8')).replace(/\n/g,' '));await db.exec('CREATE TABLE test_outbox(email TEXT,code TEXT)');
 async function request(path,method='GET',value,cookie,headers={}){return mf.dispatchFetch(base+path,{method,headers:{Origin:origin,...(value!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:value===undefined?undefined:JSON.stringify(value)});}
 async function login(email){assert.equal((await request('/api/auth/code','POST',{email})).status,200);const {code}=await db.prepare('SELECT code FROM test_outbox WHERE email=?1 ORDER BY rowid DESC LIMIT 1').bind(email.toLowerCase()).first();const response=await request('/api/auth/verify','POST',{email,code});assert.equal(response.status,200);return {cookie:response.headers.get('Set-Cookie').split(';')[0],body:await response.json(),code};}
 return{mf,db,request,login};
}
test('邮箱验证码注册默认普通用户，管理员邮箱固定，Cookie安全且数据库不保存验证码或明文会话',async t=>{
 const{db,request,login}=await fixture(t);const viewer=await login('reader@example.com');assert.equal(viewer.body.user.role,'viewer');assert.equal(viewer.body.restricted,false);
 const stored=await db.prepare('SELECT digest FROM email_codes WHERE email=?1').bind('reader@example.com').first();assert.notEqual(stored.digest,viewer.code);assert.equal(stored.digest.length,64);
 const sessions=await db.prepare('SELECT token_hash FROM sessions').all();assert.ok(sessions.results.every(row=>!viewer.cookie.includes(row.token_hash)));
 const admin=await login('WEISER@TELYSTA.COM');assert.equal(admin.body.user.role,'admin');assert.equal(admin.body.restricted,true);
 assert.equal((await request('/api/users','GET',undefined,viewer.cookie)).status,403);assert.equal((await request('/api/users','GET',undefined,admin.cookie)).status,200);
});
test('验证码不可重复使用、最多五次错误、过期无效、每邮箱重发冷却',async t=>{
 const{db,request,login}=await fixture(t);const session=await login('one@example.com');assert.equal((await request('/api/auth/verify','POST',{email:'one@example.com',code:session.code})).status,401);
 assert.equal((await request('/api/auth/code','POST',{email:'one@example.com'})).status,429);
 await request('/api/auth/code','POST',{email:'two@example.com'});const{code}=await db.prepare('SELECT code FROM test_outbox WHERE email=?1').bind('two@example.com').first();
 const wrong=code==='000000'?'111111':'000000';for(let i=0;i<5;i++)assert.equal((await request('/api/auth/verify','POST',{email:'two@example.com',code:wrong})).status,401);
 assert.equal((await request('/api/auth/verify','POST',{email:'two@example.com',code})).status,401);
 await request('/api/auth/code','POST',{email:'expired@example.com'});await db.exec('UPDATE email_codes SET expires_at=0');assert.equal((await request('/api/auth/verify','POST',{email:'expired@example.com',code:'123456'})).status,401);
});
test('角色只能由管理员修改，提升／停用撤销旧会话，超级用户无用户授权权',async t=>{
 const{db,request,login}=await fixture(t);const admin=await login('weiser@telysta.com'),viewer=await login('member@example.com');
 assert.equal((await request('/api/users/'+viewer.body.user.id,'PATCH',{role:'admin',status:'active'},admin.cookie)).status,400);
 assert.equal((await request('/api/users/'+admin.body.user.id,'PATCH',{role:'viewer',status:'suspended'},admin.cookie)).status,403);
 assert.equal((await request('/api/users/'+viewer.body.user.id,'PATCH',{role:'member',status:'active'},admin.cookie)).status,200);
 assert.equal((await (await request('/api/auth/session','GET',undefined,viewer.cookie)).json()).user,null);
 await db.prepare('UPDATE email_codes SET sent_at=0 WHERE email=?1').bind('member@example.com').run();const member=await login('member@example.com');assert.equal(member.body.restricted,true);
 await db.prepare('UPDATE users SET role=\'superuser\' WHERE email=?1').bind('member@example.com').run();assert.equal((await request('/api/users','GET',undefined,member.cookie)).status,403);
 await request('/api/users/'+member.body.user.id,'PATCH',{role:'member',status:'suspended'},admin.cookie);assert.equal((await request('/api/dashboard','GET',undefined,member.cookie)).status,401);
});
test('异源和无Origin写入被拒绝，验证并发仅一次成功，退出后会话失效',async t=>{
 const{db,mf,request}=await fixture(t);
 assert.equal((await request('/api/auth/code','POST',{email:'a@example.com'},undefined,{Origin:'https://evil.example'})).status,403);
 assert.equal((await mf.dispatchFetch(base+'/api/auth/code',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await request('/api/auth/code','POST',{email:'x\r\nBcc: attacker@example.com'})).status,400);
 await request('/api/auth/code','POST',{email:'race@example.com'});const{code}=await db.prepare('SELECT code FROM test_outbox WHERE email=?1').bind('race@example.com').first();
 const results=await Promise.all([request('/api/auth/verify','POST',{email:'race@example.com',code}),request('/api/auth/verify','POST',{email:'race@example.com',code})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,401]);
 const cookie=results.find(r=>r.status===200).headers.get('Set-Cookie');assert.ok(cookie.includes('HttpOnly')&&cookie.includes('Secure')&&cookie.includes('SameSite=Strict'));
 await request('/api/auth/logout','POST',{},cookie.split(';')[0]);assert.equal((await(await request('/api/auth/session','GET',undefined,cookie.split(';')[0])).json()).user,null);
});
test('云端保存检查版本冲突，保留旧版，普通用户不能写入内容',async t=>{
 const{db,request,login}=await fixture(t),admin=await login('weiser@telysta.com'),viewer=await login('writer@example.com');
 await db.prepare("INSERT INTO documents(id,kind,title,source,updated_at,imported_at) VALUES('post_WEISER012345abcdef','post','Title',?1,0,0)").bind('---\nuuid: 012345abcdef\n---\nOriginal').run();
 const change={title:'Updated',source:'---\nuuid: 012345abcdef\n---\nNew text',access:'public',revision:1};
 assert.equal((await request('/api/documents/post_WEISER012345abcdef','PUT',change,viewer.cookie)).status,403);
 assert.equal((await request('/api/documents/post_WEISER012345abcdef','PUT',change,admin.cookie)).status,200);
 assert.equal((await request('/api/documents/post_WEISER012345abcdef','PUT',change,admin.cookie)).status,409);
 assert.equal((await db.prepare('SELECT source FROM document_revisions WHERE document_id=?1').bind('post_WEISER012345abcdef').first()).source,'---\nuuid: 012345abcdef\n---\nOriginal');
});
test('资源上传保留所有者，普通用户和其他正式用户不能读取或修改，审核不等于公开',async t=>{
 const{db,mf,request,login}=await fixture(t),first=await login('first@example.com'),other=await login('other@example.com'),viewer=await login('viewer@example.com');
 await db.exec("UPDATE users SET role='member' WHERE email IN ('first@example.com','other@example.com')");
 const content=new TextEncoder().encode('%PDF-1.7\n'+'.'.repeat(100));
 const upload=async cookie=>mf.dispatchFetch(base+'/api/uploads?filename=example.pdf',{method:'PUT',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/pdf','Content-Length':String(content.length)},body:content});
 assert.equal((await upload(viewer.cookie)).status,403);
 const created=await upload(first.cookie);assert.equal(created.status,201);const{id}=await created.json();
 assert.equal((await request('/api/uploads/'+id+'/content','GET',undefined,other.cookie)).status,403);
 assert.equal((await request('/api/uploads/'+id+'/content','GET',undefined,first.cookie)).status,200);
 assert.equal((await request('/api/uploads/'+id,'PATCH',{metadata:{title:'My book',authors:['Author'],description:'Description'}},first.cookie)).status,200);
 assert.equal((await request('/api/uploads/'+id,'PATCH',{review:'approved'},first.cookie)).status,403);
 await db.prepare("UPDATE users SET role='superuser' WHERE email=?1").bind('other@example.com').run();
 assert.equal((await request('/api/uploads/'+id,'PATCH',{review:'approved'},other.cookie)).status,200);
 const record=await db.prepare('SELECT object_key,review_state FROM uploads WHERE id=?1').bind(id).first();assert.ok(record.object_key.startsWith('incoming/'));assert.equal(record.review_state,'approved');
});
test('管理员可创建固定编号草稿，普通用户无法创建或借此修改角色',async t=>{
 const{request,login}=await fixture(t),admin=await login('weiser@telysta.com'),viewer=await login('reader@example.com');
 assert.equal((await request('/api/documents','POST',{kind:'post',title:'A draft'},viewer.cookie)).status,403);
 const response=await request('/api/documents','POST',{kind:'post',title:'A draft'},admin.cookie);assert.equal(response.status,201);const{id}=await response.json();assert.match(id,/^post_WEISER[a-f0-9]{12}$/);
 const record=await(await request('/api/documents/'+id,'GET',undefined,admin.cookie)).json();assert.equal(record.state,'draft');assert.ok(record.source.includes('draft: true'));assert.ok(record.source.includes('uuid: '+JSON.stringify(id.slice('post_WEISER'.length))));
});

test('管理员按类型备份完整原文，普通用户不能导出，备份不含验证码或会话',async t=>{
 const{db,request,login}=await fixture(t),admin=await login('weiser@telysta.com'),viewer=await login('reader@example.com');
 await db.exec("INSERT INTO documents(id,kind,title,source,updated_at,imported_at) VALUES('backup_post','post','Title','Full markdown',0,0),('backup_book','ebook','Book','Metadata',0,0)");
 assert.equal((await request('/api/export?type=post','GET',undefined,viewer.cookie)).status,403);
 const result=await(await request('/api/export?type=post','GET',undefined,admin.cookie)).json();assert.equal(result.documents.length,1);assert.equal(result.documents[0].source,'Full markdown');
 const backup=await(await request('/api/export?type=all','GET',undefined,admin.cookie)).json();assert.ok(backup.users.length===2&&backup.documents.length===2);assert.equal(backup.sessions,undefined);assert.equal(backup.email_codes,undefined);
});

test('管理员可撤销他人单个或全部Session，普通用户只能管理自己的会话',async t=>{
 const{db,request,login}=await fixture(t),admin=await login('weiser@telysta.com'),viewer=await login('reader@example.com');
 const own=await(await request('/api/sessions','GET',undefined,viewer.cookie)).json();assert.equal(own.length,1);assert.equal(own[0].current,true);assert.equal(own[0].token_hash,undefined);
 assert.equal((await request('/api/users/'+admin.body.user.id+'/sessions','GET',undefined,viewer.cookie)).status,403);
 const other=await(await request('/api/users/'+viewer.body.user.id+'/sessions','GET',undefined,admin.cookie)).json();assert.equal(other.length,1);
 assert.equal((await request('/api/sessions/'+other[0].id,'DELETE',undefined,admin.cookie)).status,200);assert.equal((await(await request('/api/auth/session','GET',undefined,viewer.cookie)).json()).user,null);
 await db.prepare('UPDATE email_codes SET sent_at=0 WHERE email=?1').bind('reader@example.com').run();const again=await login('reader@example.com');
 const revoked=await(await request('/api/users/'+again.body.user.id+'/sessions','DELETE',undefined,admin.cookie)).json();assert.equal(revoked.revoked,1);assert.equal((await request('/api/dashboard','GET',undefined,again.cookie)).status,401);
});

test('云端编辑不能删除或改写永久编号，书目访问状态与JSON同步',async t=>{
 const{db,request,login}=await fixture(t),admin=await login('weiser@telysta.com');
 await db.exec("INSERT INTO documents(id,kind,title,source,updated_at,imported_at) VALUES('ebook_WEISER012345abcdef','ebook','Book','{}',0,0)");
 assert.equal((await request('/api/documents/ebook_WEISER012345abcdef','PUT',{title:'Book',source:JSON.stringify({id:'changed'}),access:'public',revision:1},admin.cookie)).status,400);
 assert.equal((await request('/api/documents/ebook_WEISER012345abcdef','PUT',{title:'Book',source:JSON.stringify({id:'WEISER012345abcdef',access:'public'}),access:'protected',revision:1},admin.cookie)).status,200);
 const record=await(await request('/api/documents/ebook_WEISER012345abcdef','GET',undefined,admin.cookie)).json();assert.equal(JSON.parse(record.source).access,'protected');
});

test('并发申请验证码只计一封，SMTP失败退回邮箱与全站发送额度',async t=>{
 const{db,request}=await fixture(t);
 const results=await Promise.all(Array.from({length:5},()=>request('/api/auth/code','POST',{email:'race-code@example.com'})));assert.equal(results.filter(r=>r.status===200).length,1);assert.ok(results.every(r=>[200,429].includes(r.status)));
 assert.equal((await db.prepare('SELECT count(*) AS count FROM test_outbox').first()).count,1);
 const limits=await db.prepare('SELECT count FROM auth_limits').all();assert.ok(limits.results.every(row=>row.count===1));
 assert.equal((await request('/api/auth/code','POST',{email:'smtp-fail@example.com'})).status,503);
 assert.equal((await db.prepare('SELECT count(*) AS count FROM email_codes WHERE email=?1').bind('smtp-fail@example.com').first()).count,0);
 const charged=await db.prepare('SELECT count FROM auth_limits WHERE key LIKE ?1').bind('email:smtp-fail@example.com:%').all();assert.ok(charged.results.every(row=>row.count===0));
 const global=await db.prepare("SELECT count FROM auth_limits WHERE key LIKE 'global:%'").first();assert.equal(global.count,1);
});

test('审核不能由超级用户自行通过，管理员自审必须明确确认且单独留痕',async t=>{
 const{db,request,login}=await fixture(t),admin=await login('weiser@telysta.com'),reviewer=await login('reviewer@example.com');
 await db.prepare("UPDATE users SET role='superuser' WHERE id=?1").bind(reviewer.body.user.id).run();
 const id='11111111-1111-4111-8111-111111111111';
 await db.prepare("INSERT INTO uploads(id,owner_id,kind,filename,object_key,content_type,bytes,state,created_at,updated_at) VALUES(?1,?2,'ebook','fixture.pdf','incoming/fixture.pdf','application/pdf',100,'ready',0,0)").bind(id,reviewer.body.user.id).run();
 assert.equal((await request('/api/uploads/'+id,'PATCH',{review:'approved',overrideSelfReview:true},reviewer.cookie)).status,403);
 await db.prepare('UPDATE uploads SET owner_id=?1 WHERE id=?2').bind(admin.body.user.id,id).run();
 assert.equal((await request('/api/uploads/'+id,'PATCH',{review:'approved'},admin.cookie)).status,403);
 assert.equal((await request('/api/uploads/'+id,'PATCH',{review:'approved',overrideSelfReview:true},admin.cookie)).status,200);
 assert.equal((await db.prepare("SELECT count(*) AS count FROM audit_events WHERE action='uploads.review.self-override'").first()).count,1);
});

test('R2写入失败退回额度并保留失败记录，额度满时不建立孤立记录',async t=>{
 const{db,mf,login}=await fixture(t),member=await login('uploader@example.com');
 await db.prepare("UPDATE users SET role='member' WHERE id=?1").bind(member.body.user.id).run();
 const data=new TextEncoder().encode('%PDF-1.7\n'+'.'.repeat(100));
 const failed=await mf.dispatchFetch(base+'/api/uploads?filename=truncated.pdf',{method:'PUT',headers:{Origin:origin,Cookie:member.cookie,'Content-Length':String(data.length),'X-Test-R2-Failure':'1'},body:data});
 assert.equal(failed.status,503);
 const quota=await db.prepare('SELECT bytes,count FROM upload_limits').first();assert.equal(quota.count,0);assert.equal(quota.bytes,0);
 assert.equal((await db.prepare("SELECT count(*) AS count FROM uploads WHERE state='failed'").first()).count,1);
 await db.exec('UPDATE upload_limits SET count=20');
 assert.equal((await mf.dispatchFetch(base+'/api/uploads?filename=full.pdf',{method:'PUT',headers:{Origin:origin,Cookie:member.cookie,'Content-Length':String(data.length)},body:data})).status,429);
 assert.equal((await db.prepare('SELECT count(*) AS count FROM uploads').first()).count,1);
});

test('按类型流式备份跨页完整导出并带完成标记，不混入其他类型',async t=>{
 const{db,request,login}=await fixture(t),admin=await login('weiser@telysta.com');
 await db.batch(Array.from({length:27},(_,i)=>db.prepare("INSERT INTO documents(id,kind,title,source,updated_at,imported_at) VALUES(?1,'post','Title',?2,0,0)").bind('page_'+i,'Source '+i)));
 const response=await request('/api/export?type=post','GET',undefined,admin.cookie),backup=await response.json();
 assert.equal(backup.documents.length,27);assert.equal(new Set(backup.documents.map(row=>row.id)).size,27);assert.equal(backup.completed,true);assert.equal(backup.binaryFilesIncluded,false);assert.ok(backup.documents.every(row=>row._cursor===undefined));
});

test('匿名直接访问专属管理入口可验证邮箱，预填身份不授权其他邮箱',async t=>{
 const{mf,db,login}=await fixture(t),adminBase=origin+'/telysta-console';
 assert.equal((await mf.dispatchFetch(adminBase+'/')).status,200);
 const context=await(await mf.dispatchFetch(adminBase+'/api/auth/session')).json();
 assert.equal(context.user,null);assert.equal(context.entry.email,'weiser@telysta.com');assert.equal(context.entry.admin,true);
 const send=async email=>mf.dispatchFetch(adminBase+'/api/auth/code',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email})});
 assert.equal((await send('other@example.com')).status,403);
 assert.equal((await send('weiser@telysta.com')).status,200);
 const{code}=await db.prepare('SELECT code FROM test_outbox WHERE email=?1').bind('weiser@telysta.com').first();
 const response=await mf.dispatchFetch(adminBase+'/api/auth/verify',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'weiser@telysta.com',code})});
 assert.equal(response.status,200);assert.equal((await response.json()).user.role,'admin');
 const ordinary=await login('reader@example.com');
 assert.equal((await mf.dispatchFetch(adminBase+'/',{headers:{Cookie:ordinary.cookie},redirect:'manual'})).status,302);
});

test('注册参数不能提升权限，只有固定超级管理员能授予正式或审核管理员身份',async t=>{
 const{db,request,login}=await fixture(t),owner=await login('weiser@telysta.com'),reviewer=await login('moderator@example.com'),target=await login('new@example.com');
 await request('/api/auth/code','POST',{email:'forged@example.com',role:'admin'});
 const{code}=await db.prepare('SELECT code FROM test_outbox WHERE email=?1').bind('forged@example.com').first();
 const forged=await(await request('/api/auth/verify','POST',{email:'forged@example.com',code,role:'admin',status:'active'})).json();assert.equal(forged.user.role,'viewer');
 await db.prepare("UPDATE users SET role='superuser' WHERE id=?1").bind(reviewer.body.user.id).run();
 for(const role of ['member','superuser','admin']){
  assert.equal((await request('/api/users/'+target.body.user.id,'PATCH',{role,status:'active'},target.cookie)).status,403);
  assert.equal((await request('/api/users/'+target.body.user.id,'PATCH',{role,status:'active'},reviewer.cookie)).status,403);
 }
 assert.equal((await request('/api/users/'+target.body.user.id,'PATCH',{role:'superuser',status:'active'},owner.cookie)).status,200);
 assert.equal((await db.prepare('SELECT role FROM users WHERE id=?1').bind(target.body.user.id).first()).role,'superuser');
});

test('版本记录只向超级管理员开放，读取旧文不会覆盖当前草稿',async t=>{
 const{db,request,login}=await fixture(t),admin=await login('weiser@telysta.com'),viewer=await login('reader@example.com'),id='post_WEISER012345abcdef';
 const source='---\nuuid: 012345abcdef\n---\nOriginal';
 await db.prepare("INSERT INTO documents(id,kind,title,source,updated_at,imported_at) VALUES(?1,'post','Title',?2,0,0)").bind(id,source).run();
 await request('/api/documents/'+id,'PUT',{title:'Edited',source:source+'\nNew',access:'public',revision:1},admin.cookie);
 const endpoint='/api/documents/'+id+'/revisions';
 assert.equal((await request(endpoint,'GET',undefined,viewer.cookie)).status,403);
 const list=await(await request(endpoint,'GET',undefined,admin.cookie)).json();assert.equal(list.currentRevision,2);assert.equal(list.records.length,1);assert.equal(list.records[0].source,undefined);
 const old=await(await request(endpoint+'/1','GET',undefined,admin.cookie)).json();assert.equal(old.source,source);
 assert.equal((await request(endpoint+'/99','GET',undefined,admin.cookie)).status,404);
 assert.equal((await request(endpoint+'?before=not-a-number','GET',undefined,admin.cookie)).status,400);
 assert.equal((await db.prepare('SELECT revision FROM documents WHERE id=?1').bind(id).first()).revision,2);
});
