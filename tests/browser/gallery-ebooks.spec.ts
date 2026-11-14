import { test, expect } from '@playwright/test';
test('旧资源地址保留筛选参数与片段，正式画廊静态可访问', async ({ page, request }) => {
	await page.goto('/resources/?type=image#works');
	await expect(page).toHaveURL(/\/gallery\/\?type=image#works$/);
	await expect(page.locator('.resource-card')).toHaveCount(2);
	const xml = await (await request.get('/sitemap-0.xml')).text();
	expect(xml).toContain('https://telysta.com/gallery/'); expect(xml).toContain('https://telysta.com/ebooks/'); expect(xml).not.toContain('https://telysta.com/resources/');
});
test('无脚本访问画廊和真实书架，书目模板不公开', async ({ browser, baseURL }) => {
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
	try {
		const page = await context.newPage(); await page.goto('/gallery/', { waitUntil: 'domcontentloaded' });
		await expect(page.locator('h1')).toHaveText("画廊");
		await expect(page.locator('.resource-card')).toHaveCount(28);
		await page.goto('/ebooks/', { waitUntil: 'domcontentloaded' }); await expect(page.locator('h1')).toHaveText("书室");
		await expect(page.locator('.ebook-card')).toHaveCount(24);
		await expect(page.locator('.ebook-pagination')).toContainText('1 / 27');
		expect((await page.request.get('/ebooks/ebook-template/')).status()).toBe(404);
	} finally { await context.close(); }
});
