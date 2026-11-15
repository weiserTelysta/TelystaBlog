import { test, expect } from '@playwright/test';
import { createPlatformFixture } from '../helpers/platform-fixture.mjs';
for(const width of [390,1440])test(`邮箱登录、角色界面隔离和管理员草稿保存：${width}px`,async({page},testInfo)=>{
 test.setTimeout(60_000);const fixture=await createPlatformFixture();
 try{
  await fixture.attach(page.context());await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('https://telysta.com/console/');await fixture.login(page,'reader@example.com');await expect(page.locator('#identity')).toContainText('普通用户');await expect(page.getByRole('button',{name:'Users',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Settings',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'退出登录'}).click();await expect(page.locator('#login')).toBeVisible();
  await fixture.db.prepare("INSERT INTO documents(id,kind,title,source_path,source,updated_at,imported_at) VALUES('post_WEISER012345abcdef','post','Fixture article','src/content/weiser-posts/notes/fixture.md',?1,0,0)").bind('---\nuuid: 012345abcdef\n---\nOriginal text').run();
  await fixture.login(page,'weiser@telysta.com');await expect(page).toHaveURL('https://telysta.com/telysta-console/');await expect(page.locator('#identity')).toContainText('管理员');
  await page.getByRole('button',{name:'Articles',exact:true}).click();await page.getByRole('button',{name:'编辑',exact:true}).click();await page.getByLabel('内容原文').fill('---\nuuid: 012345abcdef\n---\nEdited cloud draft');await page.getByRole('button',{name:'保存云端草稿'}).click();await expect(page.locator('#notice')).toContainText('已保存云端草稿，网站尚未发布');
  expect((await fixture.db.prepare("SELECT source FROM documents WHERE id='post_WEISER012345abcdef'").first()).source).toContain('Edited cloud draft');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath(`console-${width}.png`)});
 }finally{await fixture.mf.dispose();}
});
test('管理员强制退出其他用户Session，目标页面自动回到登录',async({page,browser})=>{
 test.setTimeout(60_000);const fixture=await createPlatformFixture();const context=await browser.newContext();
 try{
  await fixture.attach(page.context());await fixture.attach(context);const reader=await context.newPage();await reader.clock.install();await reader.goto('https://telysta.com/console/');await fixture.login(reader,'reader@example.com');await expect(reader.locator('#identity')).toContainText('普通用户');
  await page.goto('https://telysta.com/console/');await fixture.login(page,'weiser@telysta.com');await page.getByRole('button',{name:'Users',exact:true}).click();
  await page.locator('.records>li').filter({hasText:'reader@example.com'}).getByRole('button',{name:'会话',exact:true}).click();
  await expect(page.locator('#workspace')).toContainText('reader@example.com 的登录会话');
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'退出该用户全部会话'}).click();await expect(page.locator('#notice')).toHaveText('全部会话已退出。');
  await reader.clock.fastForward(31_000);await expect(reader.locator('#login')).toBeVisible();await expect(reader.locator('#login-status')).toHaveText('会话已结束，请重新登录。');
 }finally{await context.close();await fixture.mf.dispose();}
});

for(const width of [320,768,1440])test('专属管理入口预填邮箱、保持原位验证且表单可用：'+width+'px',async({page},testInfo)=>{
 test.setTimeout(60_000);const fixture=await createPlatformFixture();
 try{
  await fixture.attach(page.context());await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('https://telysta.com/telysta-console/');
  await expect(page).toHaveURL('https://telysta.com/telysta-console/');
  await expect(page.locator('#login-title')).toHaveText('管理员验证');await expect(page.locator('#email')).toHaveValue('weiser@telysta.com');await expect(page.locator('#email')).toHaveAttribute('readonly','');
  await expect(page.locator('#login .eyebrow')).toHaveCount(0);
  await expect(page.locator('#login-description')).toHaveCount(0);
  expect(await page.locator('#login-title').evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeLessThanOrEqual(24);
  await expect(page.locator('#account-starfield')).toHaveAttribute('aria-hidden','true');
  expect(await page.locator('#account-starfield canvas').evaluate((canvas:HTMLCanvasElement)=>{
   const context=canvas.getContext('2d')!;
   return canvas.width>0 && context.getImageData(0,0,canvas.width,canvas.height).data.some((byte,index)=>index%4===3&&byte>0);
  })).toBe(true);
  await expect(page.getByRole('link',{name:/Back to site/})).toHaveAttribute('href','/');
  await expect(page.getByText('返回书室',{exact:true})).toHaveCount(0);
  const geometry=await page.evaluate(async()=>{await document.fonts.ready;const email=document.querySelector('#email')!.getBoundingClientRect(),send=document.querySelector('#send-code')!.getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,sameRow:Math.abs(email.top-send.top)<3,sendHeight:send.height,fontLoaded:document.fonts.check('14px Cinzel')}});
  expect(geometry.overflow).toBe(false);expect(geometry.sameRow).toBe(true);expect(geometry.sendHeight).toBeGreaterThanOrEqual(44);expect(geometry.fontLoaded).toBe(true);
  await page.screenshot({path:testInfo.outputPath('admin-login-'+width+'.png')});
  await page.getByRole('button',{name:'获取验证码',exact:true}).click();await expect(page.locator('#login-status')).toContainText('验证码已发送');
  const{code}=await fixture.db.prepare("SELECT code FROM test_outbox WHERE email='weiser@telysta.com' ORDER BY rowid DESC LIMIT 1").first();
  await page.getByLabel('六位验证码').fill(code);await page.getByRole('button',{name:'登录',exact:true}).click();
  await expect(page.locator('#identity')).toContainText('超级管理员');
 }finally{await fixture.mf.dispose();}
});

test('历史版本可载入编辑并保存为新草稿，原文不会作为HTML执行',async({page})=>{
 test.setTimeout(60_000);const fixture=await createPlatformFixture();
 try{
  await fixture.attach(page.context());await page.goto('https://telysta.com/console/');await fixture.login(page,'weiser@telysta.com');
  await fixture.db.prepare("INSERT INTO documents(id,kind,title,source,updated_at,imported_at) VALUES('post_WEISER012345abcdef','post','History fixture',?1,0,0)").bind('---\nuuid: 012345abcdef\n---\n<script>window.historyAttack=true</script>\nOriginal text').run();
  await page.getByRole('button',{name:'Articles',exact:true}).click();await page.getByRole('button',{name:'编辑',exact:true}).click();
  await page.getByLabel('内容原文').fill('---\nuuid: 012345abcdef\n---\nSecond text');await page.getByRole('button',{name:'保存云端草稿'}).click();await expect(page.locator('#notice')).toContainText('已保存');
  await page.getByRole('button',{name:'版本记录',exact:true}).click();await page.getByRole('button',{name:'查看',exact:true}).click();await page.getByRole('button',{name:'载入此版本',exact:true}).click();
  await expect(page.getByLabel('内容原文')).toHaveValue(/Original text/);await expect(page.locator('#notice')).toContainText('尚未保存');
  expect(await page.evaluate(()=>(window as unknown as Record<string,unknown>).historyAttack)).toBeUndefined();
  await page.getByRole('button',{name:'保存云端草稿'}).click();await expect(page.locator('#notice')).toContainText('已保存云端草稿');
  const current=await fixture.db.prepare("SELECT revision,source FROM documents WHERE id='post_WEISER012345abcdef'").first();expect(current.revision).toBe(3);expect(current.source).toContain('Original text');
 }finally{await fixture.mf.dispose();}
});
