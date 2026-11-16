import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';

const host = 'https://telysta.com', library = 'https://library-files.telysta.com';
async function attach(page: Page, bytes: Buffer, format = 'EPUB') {
 await page.route(host + '/**', async route => {
  if (route.request().url().includes('/ebooks/search-index.json')) {
   await route.fulfill({ json: [{ id: 'reader-fixture', title: 'Reader fixture', files: [{ format, href: library + '/books/reader-fixture.' + format.toLowerCase() }] }] }); return;
  }
  const url = new URL(route.request().url());
  const response = await route.fetch({ url: 'http://127.0.0.1:4322' + url.pathname + url.search }); await route.fulfill({ response });
 });
 await page.route(library + '/**', async route => {
  if (route.request().url().endsWith('/api/session')) { await route.fulfill({ json: { authenticated: false } }); return; }
  await route.fulfill({ body: format === 'PDF' ? '<title>Native PDF target</title>' : bytes, contentType: format === 'PDF' ? 'text/html' : 'application/epub+zip', headers: { 'access-control-allow-origin': host, 'access-control-allow-credentials': 'true' } });
 });
 await page.goto(host + '/ebooks/read/?book=reader-fixture&format=' + format);
}
export async function epubFixture() {
 const zip = new JSZip(); zip.file('mimetype', 'application/epub+zip');
 zip.file('META-INF/container.xml', '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
 zip.file('book.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">fixture</dc:identifier><dc:title>Fixture</dc:title><dc:language>en</dc:language></metadata><manifest><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/><item id="image" href="cover.png" media-type="image/png"/><item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/></manifest><spine toc="toc"><itemref idref="cover"/><itemref idref="one"/><itemref idref="two"/></spine></package>');
 const points = Array.from({ length: 40 }, (_, i) => `<navPoint id="ch${i}" playOrder="${i + 1}"><navLabel><text>Chapter ${i + 1}</text></navLabel><content src="${i % 2 ? 'two' : 'one'}.xhtml#p${i}"/></navPoint>`).join('');
 zip.file('toc.ncx', '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head/><docTitle><text>Fixture</text></docTitle><navMap>' + points + '</navMap></ncx>');
 zip.file('cover.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6N8AAAAASUVORK5CYII=', 'base64'));
 zip.file('cover.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><head/><body><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="0 0 1134 1642" preserveAspectRatio="none"><image width="1134" height="1642" xlink:href="cover.png"/></svg></body></html>');
 for (const name of ['one', 'two']) zip.file(name + '.xhtml', `<html xmlns="http://www.w3.org/1999/xhtml"><head/><body><h1>Chapter ${name}</h1><a href="${name}.xhtml">Safe link</a>${Array.from({ length: 100 }, (_, i) => `<p id="p${i}">Paragraph ${i}. Selectable reading text with enough words to paginate across two columns. 阅读测试正文，不应拉伸书页或遮住操作。</p>`).join('')}<script>parent.unsafe=true</script></body></html>`);
 return zip.generateAsync({ type: 'nodebuffer' });
}
const pages = (page: Page) => page.locator('[data-reader-surface] iframe').first().contentFrame();
async function openChapter(page: Page) {
 await expect(page.locator('[data-reader-tools]')).toBeVisible();
 await page.getByRole('button', { name: 'Contents · 书籍目录' }).click();
 await page.locator('[data-reader-chapters]').getByRole('button', { name: 'Chapter 1', exact: true }).click();
 if (await page.locator('[data-reader-dialog]').isVisible()) await page.getByRole('button', { name: 'Close contents' }).click();
 await expect(pages(page).locator('body')).toContainText('Chapter one');
 await expect(page.locator('[data-reader-progress]')).toContainText('2 / 3');
}
for (const width of [390, 1440]) test('EPUB side contents keeps its close control visible: ' + width, async ({ page }, testInfo) => {
 await page.setViewportSize({ width, height: 900 }); await attach(page, await epubFixture());
 await expect(page.locator('[data-reader-tools]')).toBeVisible();
 await page.getByRole('button', { name: 'Contents · 书籍目录' }).click();
 const dialog = page.locator('[data-reader-dialog]'), close = page.getByRole('button', { name: 'Close contents' });
 await expect(dialog).toBeVisible();
 const before = await close.boundingBox();
 await page.locator('[data-reader-chapters]').evaluate(node => { node.scrollTop = node.scrollHeight; });
 expect((await close.boundingBox())!.y).toEqual(before!.y);
 if (width > 860) {
  const side = await dialog.boundingBox(), body = await page.locator('[data-reader-surface]').boundingBox();
  expect(body!.x).toBeGreaterThanOrEqual(side!.x + side!.width);
  await expect(dialog).toHaveAttribute('aria-modal', 'false');
 } else {
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await page.mouse.click(width - 8, 400); await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Contents · 书籍目录' })).toBeFocused();
  await page.getByRole('button', { name: 'Contents · 书籍目录' }).click();
 }
 await page.getByRole('searchbox', { name: 'Search contents' }).fill('Chapter 40');
 await expect(page.locator('[data-reader-chapters] li:visible')).toHaveCount(1);
 await page.getByRole('searchbox', { name: 'Search contents' }).fill('');
 await page.screenshot({ path: testInfo.outputPath('contents-' + width + '.png') });
 await close.click(); await expect(dialog).not.toBeVisible();
 await expect(page.getByRole('button', { name: 'Contents · 书籍目录' })).toBeFocused();
});
for (const width of [390, 1440]) test('EPUB pages respond to text taps, wheel and keyboard: ' + width, async ({ page }, testInfo) => {
 await page.setViewportSize({ width, height: 900 }); await attach(page, await epubFixture()); await openChapter(page);
 const progress = page.locator('[data-reader-progress]');
 await expect(progress).toContainText('· 1 /');
 const body = pages(page).locator('body');
 const layout = await body.evaluate(node => { const style = getComputedStyle(node); return { column: parseFloat(style.columnWidth), width: 0 }; });
 layout.width = (await page.locator('[data-reader-surface]').boundingBox())!.width;
 expect(layout.column).toBeGreaterThan(100);
 if (width > 960) expect(layout.column).toBeLessThan(layout.width * .6); else expect(layout.column).toBeGreaterThan(layout.width * .6);
 const box = await page.locator('[data-reader-surface]').boundingBox();
 await page.mouse.click(box!.x + box!.width * .7, box!.y + 200); await expect(progress).not.toContainText('· 1 /');
 await page.mouse.click(box!.x + box!.width * .3, box!.y + 200); await expect(progress).toContainText('· 1 /');
 await body.press('ArrowRight'); await expect(progress).not.toContainText('· 1 /');
 await body.press('ArrowLeft'); await expect(progress).toContainText('· 1 /');
 await body.evaluate(node => { const doc = node.ownerDocument, range = doc.createRange(); range.selectNodeContents(node.querySelector('p')!); doc.getSelection()!.removeAllRanges(); doc.getSelection()!.addRange(range); });
 const selected = await progress.textContent();
 await body.press('ArrowRight'); expect(await progress.textContent()).toBe(selected);
 await body.evaluate(node => node.ownerDocument.getSelection()!.removeAllRanges());
 await page.mouse.move(box!.x + box!.width * .7, box!.y + 200); await page.mouse.wheel(0, 100);
 await expect(progress).not.toContainText('· 1 /'); const afterWheel = await progress.textContent();
 await body.dispatchEvent('wheel', { deltaY: 100, ctrlKey: true }); expect(await progress.textContent()).toBe(afterWheel);
 await page.screenshot({ path: testInfo.outputPath('pages-' + width + '.png') });
 expect(await page.evaluate(() => (window as unknown as { unsafe?: boolean }).unsafe)).toBeUndefined();
});
test('EPUB Calibre cover preserves aspect ratio', async ({ page }) => {
 await attach(page, await epubFixture()); await expect(page.locator('[data-reader-tools]')).toBeVisible();
 const svg = pages(page).locator('svg'); await expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
 const size = await svg.boundingBox(); expect(size!.width / size!.height).toBeCloseTo(1134 / 1642, 1);
});
test('legacy PDF reader opens the file directly without an embedded duplicate toolbar', async ({ page }) => {
 await attach(page, Buffer.alloc(0), 'PDF'); await expect(page).toHaveURL(library + '/books/reader-fixture.pdf');
 await expect(page.locator('[data-library-reader]')).toHaveCount(0);
});
for(const format of ['MOBI','AZW3'])test('original Kindle sample uses paginated sandbox: '+format,async({page})=>{
 test.skip(!process.env.TELYSTA_KINDLE_FIXTURES,'Original samples are kept outside the public repository.');
 test.setTimeout(60_000);
 const fs=await import('node:fs/promises'),path=await import('node:path');const sample=await fs.readFile(path.join(process.env.TELYSTA_KINDLE_FIXTURES!,'sample.'+format.toLowerCase()));
 await attach(page,sample,format);await expect(page.locator('[data-reader-tools]')).toBeVisible({timeout:45_000});
 const body=pages(page).locator('body');expect(await body.evaluate(node=>node.children.length)).toBeGreaterThan(0);await expect(page.locator('[data-reader-surface] iframe')).toHaveAttribute('sandbox','allow-same-origin');
 const progress=page.locator('[data-reader-progress]'),before=await progress.textContent(),box=await page.locator('[data-reader-surface]').boundingBox();
 await page.mouse.click(box!.x+box!.width*.7,box!.y+200);await expect(progress).not.toHaveText(before!);
 const after=await progress.textContent();await body.press('ArrowLeft');await expect(progress).not.toHaveText(after!);
 await page.getByRole('button',{name:'Contents · 书籍目录'}).click();await expect(page.locator('[data-reader-chapters] button').first()).toBeVisible();
 expect(await page.locator('[data-reader-surface] iframe').getAttribute('srcdoc')).not.toMatch(/<script[\s>]/i);
});
