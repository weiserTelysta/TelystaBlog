import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixture.mjs';
async function documents(db){
 for(const [id,kind,access] of [['post_public','post','public'],['ebook_public','ebook','public'],['ebook_protected','ebook','protected']])await db.prepare("INSERT INTO documents(id,kind,title,source,access,state,updated_at,imported_at) VALUES(?1,?2,'Fixture discussion','{}',?3,'published',0,0)").bind(id,kind,access).run();
}
const endpoint='/api/comments?kind=ebook&id=public';
test('公开讨论匿名可读，已验证普通账户直接发表；作者使用用户名，不泄露邮箱',async t=>{
 const{db,request,login}=await fixture(t);await documents(db);
 assert.equal((await request(endpoint)).status,200);assert.equal((await request(endpoint,'POST',{body:'hello'})).status,401);
 const reader=await login('comments@example.com');const attack="<img src=x onerror=alert(1)> '; DROP TABLE users; --";
 const posted=await request(endpoint,'POST',{body:attack},reader.cookie);assert.equal(posted.status,201);const{id}=await posted.json();
 const data=await(await request(endpoint)).json();assert.equal(data.records.length,1);assert.equal(data.records[0].body,attack);assert.equal(data.records[0].authorName,reader.body.user.username);assert(!JSON.stringify(data).includes('comments@example.com'));assert.equal(data.viewer,null);
 assert.equal((await db.prepare('SELECT count(*) AS n FROM users WHERE email=?1').bind('comments@example.com').first()).n,1);
 const reply=await request(endpoint,'POST',{body:'Reply',parentId:id},reader.cookie);assert.equal(reply.status,201);
 const after=await(await request(endpoint)).json();assert.equal(after.records.find(c=>c.parentId===id).parentAuthorName,reader.body.user.username);
 const replyId=(await reply.json()).id;assert.equal((await request(endpoint,'POST',{body:'Nested',parentId:replyId},reader.cookie)).status,400);
 await db.prepare('UPDATE users SET email_verified_at=NULL WHERE id=?1').bind(reader.body.user.id).run();
 assert.equal((await request(endpoint,'POST',{body:'Unverified'},reader.cookie)).status,401);
});
test('滚动一分钟原子限制十条，账户独立，过期窗口恢复',async t=>{
 const{db,request,login}=await fixture(t);await documents(db);const a=await login('a@example.com'),b=await login('b@example.com');
 const responses=await Promise.all(Array.from({length:14},(_,i)=>request(endpoint,'POST',{body:'Comment '+i},a.cookie)));
 assert.equal(responses.filter(r=>r.status===201).length,10);assert.equal(responses.filter(r=>r.status===429).length,4);
 assert.equal((await request(endpoint,'POST',{body:'Separate account'},b.cookie)).status,201);
 await db.prepare('UPDATE comment_limits SET timestamps=?1 WHERE user_id=?2').bind(JSON.stringify(Array(10).fill(Math.floor(Date.now()/1000)-61)),a.body.user.id).run();
 assert.equal((await request(endpoint,'POST',{body:'Window expired'},a.cookie)).status,201);
});
test('权限按主题检查，普通角色无私有权限，站主和明确授权者可访问',async t=>{
 const{db,request,login}=await fixture(t);await documents(db);const reader=await login('access@example.com'),owner=await login('weiser@telysta.com'),privateEndpoint='/api/comments?kind=ebook&id=protected';
 assert.equal((await request(privateEndpoint)).status,404);
 await db.prepare("UPDATE users SET role='superuser',restricted_access=0 WHERE id=?1").bind(reader.body.user.id).run();
 assert.equal((await request(privateEndpoint,'POST',{body:'No grant'},reader.cookie)).status,404);
 assert.equal((await request(privateEndpoint,'POST',{body:'Owner'},owner.cookie)).status,201);
 await db.prepare('UPDATE users SET restricted_access=1 WHERE id=?1').bind(reader.body.user.id).run();
 assert.equal((await request(privateEndpoint,'GET',undefined,reader.cookie)).status,200);
 await db.prepare('UPDATE users SET restricted_access=0 WHERE id=?1').bind(reader.body.user.id).run();
 assert.equal((await request(privateEndpoint,'GET',undefined,reader.cookie)).status,404);
 assert.equal((await(await request('/api/comments/manage','GET',undefined,reader.cookie)).json()).total,0);
});
test('自己的编辑删除、管理员隐藏恢复删除，以及审核审计失败回滚',async t=>{
 const{db,request,login}=await fixture(t);await documents(db);const a=await login('author@example.com'),other=await login('other@example.com'),owner=await login('weiser@telysta.com');
 const{id}=await(await request(endpoint,'POST',{body:'Original'},a.cookie)).json();const path='/api/comments/'+id;
 assert.equal((await request(path,'PATCH',{body:'Attack'},other.cookie)).status,403);assert.equal((await request(path,'DELETE',undefined,other.cookie)).status,403);
 assert.equal((await request(path,'PATCH',{body:'Edited'},a.cookie)).status,200);
 assert.equal((await request(path,'PATCH',{state:'hidden'},owner.cookie)).status,200);assert.equal((await(await request(endpoint)).json()).records.length,0);
 assert.equal((await request(path,'PATCH',{state:'visible'},owner.cookie)).status,200);
 await db.exec("CREATE TRIGGER fail_comment_audit BEFORE INSERT ON audit_events WHEN NEW.action='comments.delete' BEGIN SELECT RAISE(ABORT,'Audit unavailable'); END;");
 assert.equal((await request(path,'DELETE',undefined,owner.cookie)).status,503);
 assert.equal((await db.prepare('SELECT state FROM comments WHERE id=?1').bind(id).first()).state,'visible');
 await db.exec('DROP TRIGGER fail_comment_audit');assert.equal((await request(path,'DELETE',undefined,owner.cookie)).status,200);
 assert.equal((await(await request(endpoint)).json()).records.length,0);
 assert.equal((await db.prepare('SELECT body FROM comments WHERE id=?1').bind(id).first()).body,'');
});
test('评论分页在同秒时间戳下保持稳定，不重复，不泄露草稿与跨主题回复',async t=>{
 const{db,request,login}=await fixture(t);await documents(db);const a=await login('cursor@example.com');
 for(let i=0;i<23;i++)await db.prepare("INSERT INTO comments(id,document_id,author_id,body,state,created_at,updated_at) VALUES(?1,'ebook_public',?2,?3,'visible',100,100)").bind(crypto.randomUUID(),a.body.user.id,'Row '+i).run();
 const first=await(await request(endpoint)).json();assert.equal(first.records.length,20);
 const next=await(await request(endpoint+'&before='+first.nextCursor)).json();assert.equal(next.records.length,3);assert.equal(new Set([...first.records,...next.records].map(x=>x.id)).size,23);
 assert.equal((await request('/api/comments?kind=post&id=public','POST',{body:'Wrong thread',parentId:first.records[0].id},a.cookie)).status,400);
 await db.exec("INSERT INTO documents(id,kind,title,source,state,updated_at,imported_at) VALUES('post_draft','post','Private draft','secret','draft',0,0)");
 assert.equal((await request('/api/comments?kind=post&id=draft')).status,404);
 assert.equal((await request('/api/comments?kind=post&id=%27%20OR%201=1')).status,400);
 assert.equal((await request(endpoint,'POST',{body:'Origin attack'},a.cookie,{Origin:'https://evil.example'})).status,403);
});

test('评论纳入站主备份，按内容类型隔离，未授权账户不能导出',async t=>{
 const{db,request,login}=await fixture(t);await documents(db);const a=await login('backup@example.com'),owner=await login('weiser@telysta.com');
 await request(endpoint,'POST',{body:'Ebook discussion'},a.cookie);await request('/api/comments?kind=post&id=public','POST',{body:'Article discussion'},a.cookie);
 assert.equal((await request('/api/export?type=comments','GET',undefined,a.cookie)).status,403);
 for(const[type,count]of[['all',2],['comments',2],['ebook',1],['post',1]]){const r=await request('/api/export?type='+type,'GET',undefined,owner.cookie);assert.equal(r.status,200);const d=await r.json();assert.equal(d.comments.length,count);assert.equal(d.completed,true);assert.equal(d.sessions,undefined);}
});
