import { test, expect, type Page } from '@playwright/test';
import { createPlatformFixture } from '../helpers/platform-fixture.mjs';

const password='A browser library passphrase 2026!';
async function enterCode(page: Page,fixture: Awaited<ReturnType<typeof createPlatformFixture>>,email: string){
 await page.getByRole('button',{name:'获取验证码',exact:true}).click();
 await expect(page.locator('#login-status')).toContainText('验证码已发送');
 const{code}=await fixture.db.prepare('SELECT code FROM test_outbox WHERE email=?1 ORDER BY rowid DESC LIMIT 1').bind(email).first();
 await page.getByLabel('六位验证码').fill(code);
}
for(const width of [390,1440])test(`注册、密码登录、重置与账户设置的完整流程：${width}px`,async({page},testInfo)=>{
 test.setTimeout(90_000);const fixture=await createPlatformFixture();
 try{
  await fixture.attach(page.context());await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('https://telysta.com/console/');
  await page.getByRole('link',{name:'创建账户',exact:true}).click();
  await expect(page).toHaveURL(/view=register/);await expect(page.locator('#login-title')).toHaveText('创建账户');
  await page.getByLabel('用户名',{exact:true}).fill('test_reader');await page.getByLabel('邮箱',{exact:true}).fill('reader@example.com');await page.getByLabel('密码',{exact:true}).fill(password);
  await expect(page.getByLabel('密码',{exact:true})).toHaveAttribute('autocomplete','new-password');
  await expect(page.locator('#username-status')).toContainText('用户名可用');
  await page.getByRole('button',{name:'显示密码',exact:true}).click();await expect(page.getByLabel('密码',{exact:true})).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'隐藏密码',exact:true}).click();
  await enterCode(page,fixture,'reader@example.com');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`registration-${width}.png`)});
  await page.getByRole('button',{name:'验证邮箱并创建账户'}).click();await expect(page.locator('#identity')).toContainText('test_reader');
  await page.getByRole('button',{name:'Account',exact:true}).click();
  await page.getByLabel('昵称',{exact:true}).fill('我的读书笔记');await page.getByRole('button',{name:'保存昵称'}).click();await expect(page.locator('#identity')).toContainText('我的读书笔记');
  await page.getByRole('button',{name:'退出登录'}).click();await expect(page.locator('#login')).toBeVisible();
  await page.getByLabel('用户名或邮箱').fill('test_reader');await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录',exact:true}).click();await expect(page.locator('#identity')).toContainText('我的读书笔记');
  await page.getByRole('button',{name:'退出登录'}).click();await page.getByRole('link',{name:'找回密码',exact:true}).click();
  await page.getByLabel('邮箱',{exact:true}).fill('reader@example.com');await page.getByLabel('密码',{exact:true}).fill(password+' New');
  await fixture.db.prepare('UPDATE email_codes SET sent_at=0 WHERE email=?1').bind('reader@example.com').run();
  await enterCode(page,fixture,'reader@example.com');await page.getByRole('button',{name:'重置密码',exact:true}).click();await expect(page.locator('#login-status')).toContainText('密码已重置');
  await page.getByLabel('密码',{exact:true}).fill(password+' New');await page.getByRole('button',{name:'登录',exact:true}).click();await expect(page.locator('#identity')).toContainText('我的读书笔记');
 }finally{await fixture.mf.dispose();}
});
test('认证语言切换保留输入、浏览器返回恢复流程，用户名错误可在同一验证码下修正',async({page})=>{
 test.setTimeout(60_000);const fixture=await createPlatformFixture();
 try{
  await fixture.attach(page.context());await page.goto('https://telysta.com/console/?view=register');
  await expect(page.locator('#login-title')).toHaveText('创建账户');
  await page.getByLabel('用户名',{exact:true}).fill('free_reader');await page.getByLabel('邮箱',{exact:true}).fill('valid@example.com');await page.getByLabel('密码',{exact:true}).fill(password);
  await page.getByRole('button',{name:'English',exact:true}).click();await expect(page.getByRole('heading',{name:'Create account',exact:true})).toBeVisible();
  await expect(page.getByLabel('Email',{exact:true})).toHaveValue('valid@example.com');await expect(page.getByLabel('Password',{exact:true})).toHaveValue(password);
  await page.getByRole('button',{name:'中文',exact:true}).click();
  await page.getByRole('link',{name:'返回登录',exact:true}).click();await expect(page.locator('#identifier')).toBeVisible();
  await page.goBack();await expect(page.locator('#username')).toBeVisible();await expect(page.locator('#password')).toHaveValue('');
  await page.getByLabel('用户名',{exact:true}).fill('admin');await page.getByLabel('密码',{exact:true}).fill(password);await enterCode(page,fixture,'valid@example.com');
  await page.getByRole('button',{name:'验证邮箱并创建账户'}).click();await expect(page.locator('#username')).toHaveAttribute('aria-invalid','true');await expect(page.locator('#username')).toBeFocused();
  await page.getByLabel('用户名',{exact:true}).fill('fixed_reader');await page.getByRole('button',{name:'验证邮箱并创建账户'}).click();await expect(page.locator('#identity')).toContainText('fixed_reader');
 }finally{await fixture.mf.dispose();}
});
test('旧账户验证后完成凭据设置，错误当前密码保留登录，正确改密后可重新登录',async({page})=>{
 test.setTimeout(60_000);const fixture=await createPlatformFixture(),email='legacy-browser@example.com';
 try{
  const id=crypto.randomUUID(),now=Math.floor(Date.now()/1000);
  await fixture.db.prepare("INSERT INTO users(id,email,role,status,created_at,updated_at,email_verified_at) VALUES(?1,?2,'viewer','active',?3,?3,?3)").bind(id,email,now).run();
  await fixture.attach(page.context());await page.goto('https://telysta.com/console/?view=email');
  await page.getByLabel('邮箱',{exact:true}).fill(email);await enterCode(page,fixture,email);
  await page.getByRole('button',{name:'登录',exact:true}).click();
  await expect(page.getByRole('heading',{name:'设置用户名和密码'})).toBeVisible();
  await page.getByLabel('用户名',{exact:true}).fill('legacy_browser');await page.getByLabel('密码',{exact:true}).fill(password);
  await page.getByRole('button',{name:'保存并继续'}).click();await expect(page.locator('#identity')).toContainText('legacy_browser');
  await page.getByRole('button',{name:'Account',exact:true}).click();
  await page.getByLabel('当前密码',{exact:true}).fill('This is an incorrect old password');
  await page.getByLabel('新密码',{exact:true}).fill(password+' New');await page.getByRole('button',{name:'修改密码',exact:true}).click();
  await expect(page.locator('#workspace')).toContainText('当前密码不正确');await expect(page.locator('#account')).toBeVisible();
  await page.getByLabel('当前密码',{exact:true}).fill(password);await page.getByRole('button',{name:'修改密码',exact:true}).click();
  await expect(page.locator('#workspace')).toContainText('密码已修改');
  await page.getByRole('button',{name:'退出登录'}).click();await page.getByLabel('用户名或邮箱').fill('legacy_browser');
  await page.getByLabel('密码',{exact:true}).fill(password+' New');await page.getByRole('button',{name:'登录',exact:true}).click();
  await expect(page.locator('#identity')).toContainText('legacy_browser');
 }finally{await fixture.mf.dispose();}
});
test('旧账户找回密码可补用户名，保留同一验证码完成恢复',async({page})=>{
 test.setTimeout(60_000);const fixture=await createPlatformFixture(),email='legacy-reset@example.com';
 try{
  const now=Math.floor(Date.now()/1000);
  await fixture.db.prepare("INSERT INTO users(id,email,role,status,created_at,updated_at,email_verified_at) VALUES(?1,?2,'viewer','active',?3,?3,?3)").bind(crypto.randomUUID(),email,now).run();
  await fixture.attach(page.context());await page.goto('https://telysta.com/console/?view=reset');
  await page.getByLabel('邮箱',{exact:true}).fill(email);await page.getByLabel('密码',{exact:true}).fill(password);await enterCode(page,fixture,email);
  await page.getByRole('button',{name:'重置密码',exact:true}).click();await expect(page.getByLabel('用户名',{exact:true})).toBeFocused();
  await page.getByLabel('用户名',{exact:true}).fill('legacy_reset');await page.getByRole('button',{name:'重置密码',exact:true}).click();
  await expect(page.locator('#login-status')).toContainText('密码已重置');await page.getByLabel('密码',{exact:true}).fill(password);
  await page.getByRole('button',{name:'登录',exact:true}).click();await expect(page.locator('#identity')).toContainText('legacy_reset');
 }finally{await fixture.mf.dispose();}
});
