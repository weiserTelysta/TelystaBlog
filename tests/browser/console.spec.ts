import { test, expect } from '@playwright/test';
import { createPlatformFixture } from '../helpers/platform-fixture.mjs';
for(const width of [390,1440])test(`邮箱登录、角色界面隔离和管理员草稿保存：${width}px`,async({page},testInfo)=>{
 test.setTimeout(60_000);const fixture=await createPlatformFixture();
 try{
  await fixture.attach(page.context());await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('https://telysta.com/console/');await fixture.login(page,'reader@example.com');await expect(page.locator('#identity')).toContainText('普通用户');await expect(page.getByRole('button',{name:'用户',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'站点配置',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'退出登录'}).click();await expect(page.locator('#login')).toBeVisible();
  await fixture.db.prepare("INSERT INTO documents(id,kind,title,source_path,source,updated_at,imported_at) VALUES('post_WEISER012345abcdef','post','Fixture article','src/content/weiser-posts/notes/fixture.md',?1,0,0)").bind('---\nuuid: 012345abcdef\n---\nOriginal text').run();
  await fixture.login(page,'weiser@telysta.com');await expect(page).toHaveURL('https://telysta.com/telysta-console/');await expect(page.locator('#identity')).toContainText('管理员');
  await page.getByRole('button',{name:'文章',exact:true}).click();await page.getByRole('button',{name:'编辑',exact:true}).click();await page.getByLabel('内容原文').fill('---\nuuid: 012345abcdef\n---\nEdited cloud draft');await page.getByRole('button',{name:'保存云端草稿'}).click();await expect(page.locator('#notice')).toContainText('已保存云端草稿，网站尚未发布');
  expect((await fixture.db.prepare("SELECT source FROM documents WHERE id='post_WEISER012345abcdef'").first()).source).toContain('Edited cloud draft');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath(`console-${width}.png`)});
 }finally{await fixture.mf.dispose();}
});
test('管理员强制退出其他用户Session，目标页面自动回到登录',async({page,browser})=>{
 test.setTimeout(60_000);const fixture=await createPlatformFixture();const context=await browser.newContext();
 try{
  await fixture.attach(page.context());await fixture.attach(context);const reader=await context.newPage();await reader.clock.install();await reader.goto('https://telysta.com/console/');await fixture.login(reader,'reader@example.com');await expect(reader.locator('#identity')).toContainText('普通用户');
  await page.goto('https://telysta.com/console/');await fixture.login(page,'weiser@telysta.com');await page.getByRole('button',{name:'用户',exact:true}).click();
  await page.locator('.records>li').filter({hasText:'reader@example.com'}).getByRole('button',{name:'会话',exact:true}).click();
  await expect(page.locator('#workspace')).toContainText('reader@example.com 的登录会话');
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'退出该用户全部会话'}).click();await expect(page.locator('#notice')).toHaveText('全部会话已退出。');
  await reader.clock.fastForward(31_000);await expect(reader.locator('#login')).toBeVisible();await expect(reader.locator('#login-status')).toHaveText('会话已结束，请重新登录。');
 }finally{await context.close();await fixture.mf.dispose();}
});
