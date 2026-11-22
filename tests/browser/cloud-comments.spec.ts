import { test, expect } from '@playwright/test';
import { createPlatformFixture } from '../helpers/platform-fixture.mjs';
const book='WEISER82d055db40bc';
for(const width of [390,1440])test('云端讨论匿名登录入口、键盘焦点、文本安全及双语管理：'+width,async({page,context},info)=>{
 test.setTimeout(60000);const fixture=await createPlatformFixture();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await fixture.attach(context);await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await fixture.db.prepare("INSERT INTO documents(id,kind,title,source,state,access,updated_at,imported_at) VALUES(?1,'ebook','Fixture book','{}','published','public',0,0)").bind('ebook_'+book).run();
  await page.goto('https://telysta.com/ebooks/'+book+'/');const discussion=page.locator('[data-cloud-comments]');
  await expect(discussion.getByRole('link',{name:'登录后参与讨论'})).toBeVisible();await expect(discussion.locator('form')).toBeHidden();
  const loginHref=await discussion.getByRole('link',{name:'登录后参与讨论'}).getAttribute('href');expect(loginHref).toContain('returnTo=');
  await fixture.login(page,'discussion@example.com');await expect(page.locator('#account')).toBeVisible();
  await page.goto('https://telysta.com/ebooks/'+book+'/#discussion');await expect(discussion.locator('form')).toBeVisible();await expect(discussion.getByRole('link',{name:'登录后参与讨论'})).toBeHidden();
  const text=discussion.getByRole('textbox',{name:'评论内容',exact:true});await text.fill('<img src=x onerror=alert(1)> 阅读中的一个问题');await discussion.getByRole('button',{name:'发表评论',exact:true}).click();await expect(discussion.locator('article')).toHaveCount(1);
  expect(await discussion.locator('article img').count()).toBe(0);
  await discussion.getByRole('button',{name:'回复',exact:true}).click();await discussion.getByRole('button',{name:'取消回复',exact:true}).click();await expect(discussion.getByRole('button',{name:'回复',exact:true})).toBeFocused();
  await discussion.getByRole('button',{name:'编辑',exact:true}).click();await discussion.getByRole('button',{name:'取消',exact:true}).click();await expect(discussion.getByRole('button',{name:'编辑',exact:true})).toBeFocused();
  await discussion.getByRole('button',{name:'删除',exact:true}).click();await discussion.getByRole('button',{name:'取消',exact:true}).click();await expect(discussion.getByRole('button',{name:'删除',exact:true})).toBeFocused();
  await page.screenshot({path:info.outputPath('discussion-'+width+'.png')});
  await context.clearCookies();
  await page.reload();
  await discussion.getByRole('link',{name:'登录后参与讨论'}).click();
  await expect(page).toHaveURL('https://telysta.com'+loginHref);
  await fixture.login(page,'discussion@example.com');
  await expect(page).toHaveURL('https://telysta.com/ebooks/'+book+'/#discussion');
  await expect(discussion.locator('form')).toBeVisible();
  await context.clearCookies();await fixture.login(page,'weiser@telysta.com');await expect(page.locator('#account')).toBeVisible();
  if(width<860)await page.getByRole('button',{name:'打开导航',exact:true}).click();
  await page.getByRole('link',{name:'评论管理',exact:true}).click();await expect(page.locator('#workspace')).toContainText('阅读中的一个问题');
  if(width<860)await page.getByRole('button',{name:'打开导航',exact:true}).click();
  await expect(page.getByRole('link',{name:'评论管理',exact:true})).toBeVisible();
  if(width<860)await page.getByRole('button',{name:'关闭导航',exact:true}).click();
  await page.locator('#console-language').click();await expect(page.getByRole('button',{name:'Hide',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('moderation-'+width+'.png')});
  await page.getByRole('button',{name:'Hide',exact:true}).click();await expect(page.getByRole('button',{name:'Restore',exact:true})).toBeVisible();expect(errors).toEqual([]);
 }finally{await fixture.mf.dispose();}
});
