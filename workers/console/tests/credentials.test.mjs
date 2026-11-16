import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { fixture } from './fixture.mjs';

const password = 'A long library passphrase 2026!';
const secondPassword = 'Another library passphrase 2026!';
async function challenge(f, email, purpose = 'register') {
 const response = await f.request('/api/auth/code','POST',{email,purpose});
 assert.equal(response.status,200,await response.clone().text());
 return (await f.db.prepare('SELECT code FROM test_outbox WHERE email=?1 ORDER BY rowid DESC LIMIT 1').bind(email.toLowerCase()).first()).code;
}
async function register(f,email,username) {
 const code = await challenge(f,email);
 const response = await f.request('/api/auth/register','POST',{email,username,password,code});
 assert.equal(response.status,200,await response.clone().text());
 return {body:await response.json(),cookie:response.headers.get('Set-Cookie').split(';')[0],code};
}
async function resend(f,email,purpose) {
 await f.db.prepare('UPDATE email_codes SET sent_at=0 WHERE email=?1').bind(email).run();
 return challenge(f,email,purpose);
}
test('注册需要邮箱证明、用户名和强密码，角色由服务端决定，凭据不会进入公开响应',async t=>{
 const f=await fixture(t),email='new-reader@example.com';
 assert.equal((await f.request('/api/auth/register','POST',{email,username:'reader',password,code:'123456'})).status,401);
 assert.equal((await f.db.prepare('SELECT count(*) AS count FROM users').first()).count,0);
 const code=await challenge(f,email);
 assert.equal((await f.request('/api/auth/verify','POST',{email,code})).status,401);
 assert.equal((await f.request('/api/auth/register','POST',{email,username:'reader',password,code,role:'admin'})).status,400);
 assert.equal((await f.request('/api/auth/register','POST',{email,username:'reader',password:'short',code})).status,400);
 const response=await f.request('/api/auth/register','POST',{email,username:'Reader_Name',password,code});
 assert.equal(response.status,200,await response.clone().text());
 const view=await response.json();assert.equal(view.user.username,'reader_name');assert.equal(view.user.displayName,'reader_name');assert.equal(view.user.emailVerified,true);assert.equal(view.user.needsSetup,false);assert.equal(view.user.role,'viewer');assert.equal(view.restricted,false);
 assert.ok(!JSON.stringify(view).includes('scrypt')&&!JSON.stringify(view).includes(password));
 const row=await f.db.prepare('SELECT password_hash,email_verified_at FROM users WHERE email=?1').bind(email).first();
 assert.match(row.password_hash,/^scrypt-v1\$32768\$8\$3\$/);assert.ok(row.email_verified_at>0&&!row.password_hash.includes(password));
 assert.equal((await f.request('/api/auth/register','POST',{email,username:'other_reader',password,code})).status,401);
});
test('用户名校验、数据库大小写唯一及并发注册冲突不会消耗失败者的验证码',async t=>{
 const f=await fixture(t),a='a@example.com',b='b@example.com';
 for(const username of ['admin','weiser',"x'); DROP TABLE users;--",'<script>'])
  assert.equal((await f.request('/api/auth/register','POST',{email:a,username,password,code:'123456'})).status>=400,true);
 const ca=await challenge(f,a),cb=await challenge(f,b);
 const results=await Promise.all([
  f.request('/api/auth/register','POST',{email:a,username:'Same_Name',password,code:ca}),
  f.request('/api/auth/register','POST',{email:b,username:'same_name',password,code:cb}),
 ]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const loser=results[0].status===409?a:b,code=loser===a?ca:cb;
 assert.equal((await f.db.prepare('SELECT used_at FROM email_codes WHERE email=?1').bind(loser).first()).used_at,null);
 const corrected=await f.request('/api/auth/register','POST',{email:loser,username:'corrected_name',password,code});
 assert.equal(corrected.status,200,await corrected.clone().text());
 assert.equal((await f.db.prepare('SELECT count(*) AS count FROM users').first()).count,2);
 assert.equal((await (await f.request('/api/auth/username?value=SAME_NAME')).json()).available,false);
 const hashes=await f.db.prepare('SELECT password_hash FROM users').all();assert.notEqual(hashes.results[0].password_hash,hashes.results[1].password_hash);
});
test('密码支持用户名或邮箱登录，错误和未知账户响应一致，邮箱验证码不能绕过已设置密码',async t=>{
 const f=await fixture(t),created=await register(f,'signed@example.com','signed_reader');
 for(const identifier of ['SIGNED_READER','SIGNED@EXAMPLE.COM']){
  const response=await f.request('/api/auth/login','POST',{identifier,password});assert.equal(response.status,200,await response.clone().text());
  assert.equal((await response.json()).user.id,created.body.user.id);assert.ok(response.headers.get('Set-Cookie').includes('HttpOnly'));
 }
 const wrong=await f.request('/api/auth/login','POST',{identifier:'signed_reader',password:secondPassword});
 const unknown=await f.request('/api/auth/login','POST',{identifier:'unknown_reader',password:secondPassword});
 assert.equal(wrong.status,401);assert.equal(unknown.status,401);assert.deepEqual(await wrong.json(),await unknown.json());
 const code=await resend(f,'signed@example.com','login');
 assert.equal((await f.request('/api/auth/verify','POST',{email:'signed@example.com',code})).status,409);
});
test('密码重置用途隔离、一次性生效，并使所有旧登录立即失效',async t=>{
 const f=await fixture(t),email='reset@example.com',created=await register(f,email,'reset_reader');
 const login=await f.request('/api/auth/login','POST',{identifier:email,password});const otherCookie=login.headers.get('Set-Cookie').split(';')[0];
 const code=await resend(f,email,'reset');
 assert.equal((await f.request('/api/auth/register','POST',{email,username:'another_reader',password,code})).status,401);
 const reset=await f.request('/api/auth/reset','POST',{email,code,password:secondPassword});assert.equal(reset.status,200,await reset.clone().text());
 assert.ok(reset.headers.get('Set-Cookie').includes('Max-Age=0'));
 for(const cookie of [created.cookie,otherCookie])assert.equal((await(await f.request('/api/auth/session','GET',undefined,cookie)).json()).user,null);
 assert.equal((await f.request('/api/auth/login','POST',{identifier:email,password})).status,401);
 assert.equal((await f.request('/api/auth/login','POST',{identifier:email,password:secondPassword})).status,200);
 assert.equal((await f.request('/api/auth/reset','POST',{email,code,password})).status,401);
});
test('旧普通账户和固定站主验证后可设置凭据，保留身份且轮换登录',async t=>{
 const f=await fixture(t);
 for(const email of ['legacy@example.com','weiser@telysta.com']){
  const old=await f.login(email);assert.equal(old.body.user.needsSetup,true);
  if(email!=='weiser@telysta.com')await f.db.prepare("UPDATE users SET role='member',restricted_access=1 WHERE email=?1").bind(email).run();
  const username=email==='weiser@telysta.com'?'weiser':'legacy_reader';
  const setup=await f.request('/api/auth/setup','POST',{username,password},old.cookie);assert.equal(setup.status,200,await setup.clone().text());
  const view=await setup.json();assert.equal(view.user.username,username);assert.equal(view.user.needsSetup,false);assert.equal(view.restricted,true);assert.equal(view.user.role,email==='weiser@telysta.com'?'admin':'member');
  assert.equal((await(await f.request('/api/auth/session','GET',undefined,old.cookie)).json()).user,null);
 }
});
test('改密需要当前密码，成功后撤销其他设备，不能用陈旧邮箱登录状态设置密码',async t=>{
 const f=await fixture(t),email='change@example.com',created=await register(f,email,'change_reader');
 assert.equal((await f.request('/api/auth/password','POST',{currentPassword:secondPassword,password:secondPassword},created.cookie)).status,401);
 assert.ok((await(await f.request('/api/auth/session','GET',undefined,created.cookie)).json()).user);
 const response=await f.request('/api/auth/password','POST',{currentPassword:password,password:secondPassword},created.cookie);assert.equal(response.status,200,await response.clone().text());
 assert.notEqual(response.headers.get('Set-Cookie').split(';')[0],created.cookie);
 assert.equal((await(await f.request('/api/auth/session','GET',undefined,created.cookie)).json()).user,null);
 const legacy=await f.login('old-proof@example.com');
 await f.db.prepare('UPDATE sessions SET verified_at=0 WHERE user_id=?1').bind(legacy.body.user.id).run();
 assert.equal((await f.request('/api/auth/setup','POST',{username:'old_proof_reader',password},legacy.cookie)).status,401);
});
test('部署前发送的验证码可在五分钟窗口迁移，并发重放只创建一个登录',async t=>{
 const f=await fixture(t),email='old-code@example.com',code='219348',challengeId=crypto.randomUUID(),now=Math.floor(Date.now()/1000);
 await f.seedLegacy(email);
 const digest=createHmac('sha256','test-auth-pepper-with-more-than-32-bytes').update(`${email}:${challengeId}:${code}`).digest('hex');
 await f.db.prepare('INSERT INTO email_codes(email,challenge_id,digest,sent_at,expires_at) VALUES(?1,?2,?3,?4,?5)').bind(email,challengeId,digest,now,now+300).run();
 const responses=await Promise.all([f.request('/api/auth/verify','POST',{email,code}),f.request('/api/auth/verify','POST',{email,code})]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,401]);
 assert.equal((await f.db.prepare('SELECT count(*) AS count FROM sessions').first()).count,1);
});
test('登录限频在账户维度生效，注入不会修改数据库，用户响应和备份不返回密码摘要',async t=>{
 const f=await fixture(t),created=await register(f,'limits@example.com','limits_reader');
 const malicious=await f.request('/api/auth/login','POST',{identifier:"x' OR 1=1 --",password});assert.equal(malicious.status,401);
 for(let i=0;i<10;i++)assert.equal((await f.request('/api/auth/login','POST',{identifier:'limits_reader',password:secondPassword})).status,401);
 assert.equal((await f.request('/api/auth/login','POST',{identifier:'limits_reader',password:secondPassword})).status,429);
 const owner=await f.login('weiser@telysta.com');
 const backup=await(await f.request('/api/export?type=users','GET',undefined,owner.cookie)).json();
 assert.ok(backup.users.some(u=>u.id===created.body.user.id));assert.ok(!JSON.stringify(backup).includes('password_hash'));assert.ok(!JSON.stringify(backup).includes('scrypt-v1'));
});
test('审计写入失败时注册事务回退，邮箱证明可重试且没有半成品账户',async t=>{
 const f=await fixture(t),email='retry@example.com',code=await challenge(f,email);
 await f.db.exec("CREATE TRIGGER fail_auth_audit BEFORE INSERT ON audit_events WHEN NEW.action='auth.register' BEGIN SELECT RAISE(ABORT,'fixture audit failure'); END;");
 const attempt=()=>f.request('/api/auth/register','POST',{email,code,username:'retry_reader',password});
 assert.equal((await attempt()).status,503);
 assert.equal(await f.db.prepare('SELECT id FROM users WHERE email=?1').bind(email).first(),null);
 assert.equal((await f.db.prepare('SELECT used_at FROM email_codes WHERE email=?1').bind(email).first()).used_at,null);
 await f.db.exec('DROP TRIGGER fail_auth_audit');assert.equal((await attempt()).status,200);
});
test('验证码尝试原子计数，并发猜测最多占用五次，第五次正确仍可使用',async t=>{
 const f=await fixture(t),email='guess@example.com',code=await challenge(f,email);
 const wrong=code==='000000'?'999999':'000000';
 const guesses=await Promise.all(Array.from({length:12},()=>f.request('/api/auth/register','POST',{email,code:wrong,username:'guess_reader',password})));
 assert.ok(guesses.every(response=>response.status===401));
 assert.equal((await f.db.prepare('SELECT attempts FROM email_codes WHERE email=?1').bind(email).first()).attempts,5);
 assert.equal((await f.request('/api/auth/register','POST',{email,code,username:'guess_reader',password})).status,401);
 const fifthEmail='fifth@example.com',fifthCode=await challenge(f,fifthEmail);
 await f.db.prepare('UPDATE email_codes SET attempts=4 WHERE email=?1').bind(fifthEmail).run();
 assert.equal((await f.request('/api/auth/register','POST',{email:fifthEmail,code:fifthCode,username:'fifth_reader',password})).status,200);
});
test('只有站主能分配角色与限制访问，提升角色不隐式开锁，授权变化退出旧设备',async t=>{
 const f=await fixture(t),reader=await register(f,'grants@example.com','grants_reader'),owner=await f.login('weiser@telysta.com');
 const path='/api/users/'+reader.body.user.id;
 assert.equal((await f.request(path,'PATCH',{role:'member'},reader.cookie)).status,403);
 assert.equal((await f.request('/api/profile','PATCH',{displayName:'Safe name',role:'admin'},reader.cookie)).status,400);
 assert.equal((await f.request(path,'PATCH',{role:'admin'},owner.cookie)).status,400);
 assert.equal((await f.request(path,'PATCH',{role:'member'},owner.cookie)).status,200);
 assert.equal((await(await f.request('/api/auth/session','GET',undefined,reader.cookie)).json()).user,null);
 const signin=await f.request('/api/auth/login','POST',{identifier:'grants_reader',password});
 const cookie=signin.headers.get('Set-Cookie').split(';')[0],view=await signin.json();assert.equal(view.user.role,'member');assert.equal(view.restricted,false);
 assert.equal((await f.request(path,'PATCH',{restrictedAccess:true},owner.cookie)).status,200);
 assert.equal((await(await f.request('/api/auth/session','GET',undefined,cookie)).json()).user,null);
 const allowed=await(await f.request('/api/auth/login','POST',{identifier:'grants_reader',password})).json();assert.equal(allowed.restricted,true);
 assert.equal((await f.request(path,'PATCH',{restrictedAccess:false},owner.cookie)).status,200);
 assert.equal((await(await f.request('/api/auth/login','POST',{identifier:'grants_reader',password})).json()).restricted,false);
});
