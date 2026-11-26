import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createPlatformFixture } from '../helpers/platform-fixture.mjs';
async function navigation(page: Page){if(await page.locator('#menu-trigger').isVisible()&&!await page.locator('#mobile-menu').evaluate((node:HTMLDialogElement)=>node.open))await page.locator('#menu-trigger').click();}

test('站主新建系列、上传裁好的封面并把文章排入系列', async ({ page }, info) => {
 test.setTimeout(60_000);
 const fixture = await createPlatformFixture();
 try {
  const seriesSource = await readFile(new URL('../../src/config/content/blogSeries.ts', import.meta.url), 'utf8');
  await fixture.db.prepare("INSERT INTO documents(id,kind,title,source_path,source,updated_at,imported_at) VALUES('config_series','config','Series','src/config/content/blogSeries.ts',?1,0,0)").bind(seriesSource).run();
  const post = '---\nuuid: 012345abcdef\ntitle: Fixture article\ntitleEn: Fixture\ndescription: Fixture\ndescriptionEn: Fixture\ncategory: notes\npublishedAt: 2026-11-16\nupdatedAt: 2026-11-16\n---\n\n# Fixture article\n\nOriginal text';
  await fixture.db.prepare("INSERT INTO documents(id,kind,title,source,updated_at,imported_at) VALUES('post_WEISER012345abcdef','post','Fixture article',?1,0,0)").bind(post).run();
  await fixture.attach(page.context());
  await page.goto('https://telysta.com/console/');
  await fixture.login(page,'weiser@telysta.com');
  await page.getByRole('link', { name: '文章系列', exact: true }).click();
  await page.getByRole('button', { name: '新建系列', exact: true }).click();
  await page.getByLabel('所属分类').selectOption('notes');
  await page.getByLabel('固定链接编号').fill('test-bloom');
  await page.getByLabel('系列名称').fill('花开记');
  await page.getByLabel('英文名称').fill('Bloom journal');
  await page.getByLabel('系列简介').fill('一组花卉随笔。');
  await page.getByLabel('英文简介').fill('Notes about flowers.');
  await page.getByLabel('选取封面图片').setInputFiles('src/assets/images/series/ranunculus.webp');
  await expect(page.getByLabel('裁剪后的封面预览')).toBeVisible();
  await page.getByLabel('缩放').press('End');
  await expect(page.getByLabel('缩放')).toHaveValue('250');
  await page.screenshot({ path: info.outputPath('series-cover-editor.png') });
  await page.getByRole('button', { name: '保存系列草稿' }).click();
  await expect(page.locator('#notice')).toContainText('系列草稿已保存');
  let stored = await fixture.db.prepare("SELECT source FROM documents WHERE id='config_series'").first();
  const key = String(stored.source).match(/series-covers\/[a-f0-9]{64}\.webp/)?.[0];
  expect(key).toBeTruthy();
  const bucket = await fixture.mf.getR2Bucket('MEDIA_BUCKET', 'console-fixture');
  expect((await bucket.head(key!))?.httpMetadata?.contentType).toBe('image/webp');
  await page.getByRole('button', { name: '分配文章' }).click();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByRole('tab', { name: '分类与访问' }).click();
  await page.getByLabel('文章系列', { exact: true }).selectOption('test-bloom');
  await page.getByLabel('系列顺序').fill('1');
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.locator('#notice')).toContainText('草稿已保存');
  stored = await fixture.db.prepare("SELECT source FROM documents WHERE id='post_WEISER012345abcdef'").first();
  expect(stored.source).toContain('series: test-bloom');
  expect(stored.source).toContain('seriesOrder: 1');
 } finally {
  await page.context().unrouteAll({ behavior: 'wait' });
  await fixture.mf.dispose();
 }
});
for(const width of [390,1440])test(`站主首次设置和全屏分栏编辑工作流：${width}px`,async({page},testInfo)=>{
 test.setTimeout(60_000);const fixture=await createPlatformFixture();
 try{
  await fixture.db.prepare("INSERT INTO documents(id,kind,title,source_path,source,updated_at,imported_at) VALUES('post_WEISER012345abcdef','post','Fixture article','src/content/weiser-posts/notes/fixture.md',?1,0,0)").bind('---\nuuid: 012345abcdef\ntitle: Meta title\ntitleEn: Fixture\ndescription: Fixture\ndescriptionEn: Fixture\ncategory: notes\npublishedAt: 2026-11-16\nupdatedAt: 2026-11-16\ntags: []\ndraft: false\ncustom: retained\n---\n\n# Fixture article\n\nOriginal text').run();
  await fixture.attach(page.context());await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(await fixture.ownerLink());await expect(page.locator('#login-title')).toHaveText('设置站主账户');await expect(page.locator('#email')).toHaveValue('weiser@telysta.com');await expect(page.locator('#email')).toHaveAttribute('readonly','');
  await expect(page.getByRole('button',{name:'获取验证码',exact:true})).not.toBeVisible();await expect(page.locator('#login-description')).toHaveCount(0);expect(page.url()).not.toContain('setup=');
  await page.getByLabel('用户名',{exact:true}).fill('custom_owner');await page.getByLabel('密码',{exact:true}).fill('An owner browser passphrase 2026!');await page.getByRole('button',{name:'显示密码',exact:true}).click();await expect(page.getByRole('button',{name:'隐藏密码',exact:true}).locator('svg')).toHaveCount(1);await page.getByRole('button',{name:'保存并进入控制台'}).click();
  await expect(page.locator('#workspace h1')).toHaveText('文章');await expect(page.locator('.summary-grid')).toHaveCount(0);
  await page.getByRole('button',{name:'编辑',exact:true}).click();await expect(page.getByLabel('标题',{exact:true})).toHaveValue('Fixture article');await expect(page.getByLabel('内容原文',{exact:true})).not.toBeVisible();
  await page.getByRole('tab',{name:'正文',exact:true}).click();await page.getByLabel('正文（Markdown）',{exact:true}).fill('Edited cloud draft\n\n<script>window.unsafeEditor=true</script>');await page.getByRole('button',{name:'预览正文'}).click();expect(await page.evaluate(()=>(window as unknown as Record<string,unknown>).unsafeEditor)).toBeUndefined();await page.getByRole('button',{name:'保存草稿',exact:true}).click();await expect(page.locator('#notice')).toContainText('草稿已保存');
  const record=await fixture.db.prepare("SELECT source,revision FROM documents WHERE id='post_WEISER012345abcdef'").first();expect(record.source).toContain('custom: retained');expect(record.source).toContain('# Fixture article');expect(record.source).toContain('Edited cloud draft');expect(record.revision).toBe(2);
  await page.getByRole('button',{name:'版本记录',exact:true}).click();await page.getByRole('button',{name:'载入此版本'}).click();await page.getByRole('button',{name:'继续',exact:true}).click();await page.getByRole('button',{name:'保存草稿',exact:true}).click();await expect(page.locator('#notice')).toContainText('草稿已保存');
  const restored=await fixture.db.prepare("SELECT revision,source FROM documents WHERE id='post_WEISER012345abcdef'").first();expect(restored.revision).toBe(3);expect(restored.source).toContain('Original text');
  await page.getByRole('tab',{name:'发布',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'下载发布快照',exact:true}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('post_WEISER012345abcdef-r3.json');
  const snapshot=JSON.parse(await readFile((await download.path())!,'utf8'));
  expect(snapshot.source).toContain('Original text');
  expect(snapshot.author).toEqual({name:'custom_owner',username:'custom_owner'});
  await page.locator('#console-language').click();await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeVisible();await expect(page.getByRole('tab',{name:'Details',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(width>860){const sidebar=await page.locator('#console-sidebar').boundingBox(),main=await page.locator('.console-main').boundingBox();expect(main!.x).toBe(sidebar!.width);expect(main!.width+sidebar!.width).toBe(width);}
  await page.screenshot({path:testInfo.outputPath(`console-editor-${width}.png`)});
 }finally{await page.context().unrouteAll({behavior:'wait'});await fixture.mf.dispose();}
});
test('具名站点设置表单保留未知代码并可切换语言，默认不暴露源码',async({page},testInfo)=>{
 test.setTimeout(60_000);const fixture=await createPlatformFixture();
 try{
  await fixture.db.prepare("INSERT INTO documents(id,kind,title,source_path,source,updated_at,imported_at) VALUES('config_fixture','config','home.ts','src/config/pages/home.ts',?1,0,0)").bind('const untouched = () => 42;\nexport const HOME_SECTIONS = [{id:"about",title:"见我",description:"Intro",href:"/about/"}];\nexport const HOME_ARCHIVE_INTRO = "Intro text";\nexport const HOME_SOCIAL_LINKS = [];\nexport const HOME_QR_CONTACTS = [];').run();
  await fixture.attach(page.context());await page.goto('https://telysta.com/console/');await fixture.login(page,'weiser@telysta.com');
  await page.getByRole('link',{name:'站点设置',exact:true}).click();await expect(page.locator('#workspace')).not.toContainText('src/config/');await page.getByRole('button',{name:'首页内容与导航',exact:true}).click();
  await page.getByLabel('标题',{exact:true}).fill('见我已更新');await page.locator('#console-language').click();await expect(page.getByLabel('Title',{exact:true})).toHaveValue('见我已更新');await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.locator('#notice')).toContainText('Settings draft saved');
  const record=await fixture.db.prepare("SELECT source,revision FROM documents WHERE id='config_fixture'").first();expect(record.source).toContain('untouched = () => 42');expect(record.source).toContain('id:"about"');expect(record.source).toContain('见我已更新');expect(record.revision).toBe(2);
  await page.screenshot({path:testInfo.outputPath('settings-form.png')});
 }finally{await page.context().unrouteAll({behavior:'wait'});await fixture.mf.dispose();}
});
test('手机后台导航点击外部和Escape关闭，焦点回到按钮',async({page})=>{
 const fixture=await createPlatformFixture();try{await fixture.attach(page.context());await page.setViewportSize({width:390,height:900});await page.goto('https://telysta.com/console/');await fixture.login(page,'reader@example.com');await expect(page.locator('#account')).toBeVisible();await navigation(page);await expect(page.locator('#mobile-menu')).toBeVisible();await page.mouse.click(385,400);await expect(page.locator('#mobile-menu')).not.toBeVisible();await expect(page.locator('#menu-trigger')).toBeFocused();await navigation(page);await page.keyboard.press('Escape');await expect(page.locator('#menu-trigger')).toBeFocused();await expect(page.getByRole('link',{name:'站点设置',exact:true})).toHaveCount(0);}finally{await page.context().unrouteAll({behavior:'wait'});await fixture.mf.dispose();}
});
