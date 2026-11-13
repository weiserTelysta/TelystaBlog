import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
	await page.route('https://assets.telysta.com/ebooks/**/cover.webp', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240"><rect width="160" height="240" fill="#26384a"/><text x="80" y="125" text-anchor="middle" fill="#d8dee9">Book</text></svg>' }));
});
for (const [width, columns] of [[1440, 4], [1024, 3], [768, 2], [390, 1], [320, 1]]) {
	test(`无边框书目左右排列且不溢出：${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		const booksRequested: string[] = [];
		page.on('request', request => { if (/\.(pdf|epub)(?:\?|$)/.test(request.url())) booksRequested.push(request.url()); });
		await page.goto('/ebooks/');
		await expect(page.locator('.ebook-card')).toHaveCount(8);
		const layout = await page.locator('.ebook-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
		expect(layout).toBe(columns);
		const card = page.locator('.ebook-card').first();
		await expect(card).toHaveCSS('border-top-width', '0px');
		await expect(card).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
		const cover = (await card.locator('img').boundingBox())!;
		const copy = (await card.locator('.ebook-card__copy').boundingBox())!;
		expect(copy.x).toBeGreaterThanOrEqual(cover.x + cover.width + 12);
		expect(booksRequested).toEqual([]);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		await page.screenshot({ path: testInfo.outputPath('ebooks.png'), fullPage: true });
	});
}
test('详情使用稳定 ID，格式独立链接可聚焦，草稿不生成页面', async ({ page, request }) => {
	await page.goto('/ebooks/');
	const title = page.locator('.ebook-card h2 a[href="/ebooks/test-ebook-1/"]');
	await title.focus(); await expect(title).toHaveCSS('outline-style', 'solid');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/ebooks\/test-ebook-1\/$/);
	await expect(page.locator('h1')).toHaveText('一本拥有很长中文标题的电子书：跨越文明与时间的阅读');
	await expect(page.locator('.ebook-body h2')).toHaveText('书籍介绍');
	await expect(page.getByRole('link', { name: /下载.*（EPUB）/ })).toHaveAttribute('href', 'https://assets.telysta.com/ebooks/test-ebook-1/v1/book.epub');
	expect((await request.get('/ebooks/test-ebook-9/')).status()).toBe(404);
	const sitemap = await (await request.get('/sitemap-0.xml')).text();
	expect(sitemap).toContain('/ebooks/test-ebook-1/'); expect(sitemap).not.toContain('/ebooks/test-ebook-9/');
});
