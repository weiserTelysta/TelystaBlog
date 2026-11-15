import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { createPlatformFixture } from '../helpers/platform-fixture.mjs';
const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const host = 'https://telysta.com';
test('账户权限接通书架和受保护EPUB，沙箱清除脚本，退出会停止阅览', async ({ page }, testInfo) => {
 test.setTimeout(60_000);
 const fixture = await createPlatformFixture();
 try {
  await fixture.attach(page.context());
  await fixture.db.prepare("INSERT INTO users(id,email,role,status,created_at,updated_at) VALUES(?1,'member@example.com','member','active',0,0)").bind(crypto.randomUUID()).run();
		const zip = new JSZip();
		zip.file('mimetype', 'application/epub+zip');
		zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
		zip.file('book.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">fixture</dc:identifier><dc:title>Fixture</dc:title><dc:language>en</dc:language></metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="ncx"><itemref idref="one"/><itemref idref="two"/></spine></package>');
		zip.file('toc.ncx', '<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head/><docTitle><text>Fixture</text></docTitle><navMap><navPoint id="one" playOrder="1"><navLabel><text>First chapter</text></navLabel><content src="one.xhtml"/></navPoint><navPoint id="two" playOrder="2"><navLabel><text>Second chapter</text></navLabel><content src="two.xhtml"/></navPoint></navMap></ncx>');
		for (const [file, text] of [['one', 'First chapter content'], ['two', 'Second chapter content']]) zip.file(file + '.xhtml', `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${file}</title></head><body><h1>${text}</h1><p>Readable fixture text.</p><script>parent.readerScriptExecuted=true</script></body></html>`);

  const bucket = await fixture.mf.getR2Bucket('LIBRARY_BUCKET','library-fixture');
  await bucket.put('books/fixture/protected.epub', await zip.generateAsync({ type: 'uint8array' }), { httpMetadata: { contentType: 'application/epub+zip' } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(host + '/ebooks/WEISER94f87086f630/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toHaveText('受保护书籍');
  await expect(page.getByRole('button', { name: '登录账户', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: '返回首页', exact: true }).click();
  await page.getByRole('link', { name: '打开个人空间', exact: true }).click();
  await expect(page).toHaveURL(/\/console\//);
  await fixture.login(page,'member@example.com');
  await expect(page.locator('#identity')).toContainText('正式用户');
  await page.getByRole('link',{name:'打开书室',exact:true}).click();
  await expect(page.locator('.ebook-card h2')).toHaveCount(2);
  await expect(page.locator('.ebook-card h2').filter({hasText:'Protected fixture book'})).toHaveCount(1);
  await page.goto(host + '/ebooks/WEISER94f87086f630/');
  await expect(page.locator('[data-book-content] h1')).toHaveText('Protected fixture book');
  await page.getByRole('link',{name:'在线阅读 EPUB'}).click();
  const first=page.frameLocator('[data-reader-surface] iframe').first();
  await expect(first.locator('body')).toContainText('First chapter content');
  await expect(page.locator('[data-reader-surface] iframe').first()).toHaveAttribute('sandbox','allow-same-origin');
  await expect(first.locator('script')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as Record<string,unknown>).readerScriptExecuted)).toBeUndefined();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   await expect.poll(async()=>page.locator('[data-reader-surface]').evaluate(node=>{const r=node.getBoundingClientRect();return Math.abs(r.bottom-innerHeight)<3&&r.width>=innerWidth-1&&r.height>innerHeight*.8})).toBe(true);
   expect(await page.locator('.site-header').count()).toBe(0);
   await expect.poll(async()=>page.locator('[data-reader-surface]').evaluate(node=>{const frame=node.querySelector('iframe');return !!frame&&Math.abs(frame.getBoundingClientRect().height-node.getBoundingClientRect().height)<3})).toBe(true);
   await page.screenshot({path:testInfo.outputPath('reader-'+width+'.png')});
  }
  await page.getByRole('button',{name:'Contents · 书籍目录',exact:true}).click();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Contents · 书籍目录',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Contents · 书籍目录',exact:true}).click();
  await page.getByRole('button',{name:'Second chapter',exact:true}).click();
  await expect(page.frameLocator('[data-reader-surface] iframe').last().locator('body')).toContainText('Second chapter content');
  await page.getByRole('button',{name:'A+ · 放大阅读字号'}).click();
  const account=await page.context().newPage();await account.goto(host+'/console/');await account.getByRole('button',{name:'退出登录'}).click();
  await expect(page.locator('[data-reader-surface] iframe')).toHaveCount(0);
  await expect(page.locator('[data-reader-title]')).not.toHaveAttribute('title',/Protected fixture/);
  await expect(page.getByRole('link',{name:'Back to site',exact:true})).toBeVisible();
 } finally { await fixture.mf.dispose(); }
});
