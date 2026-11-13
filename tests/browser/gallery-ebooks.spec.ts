import { test, expect } from '@playwright/test';
test('旧资源地址保留筛选参数与片段，正式画廊静态可访问', async ({ page, request }) => {
	await page.goto('/resources/?type=image#works');
	await expect(page).toHaveURL(/\/gallery\/\?type=image#works$/);
	await expect(page.locator('.resource-card')).toHaveCount(2);
	const xml = await (await request.get('/sitemap-0.xml')).text();
	expect(xml).toContain('https://telysta.com/gallery/'); expect(xml).toContain('https://telysta.com/ebooks/'); expect(xml).not.toContain('https://telysta.com/resources/');
});
test('无脚本访问画廊和电子书空书架，书目模板不公开', async ({ browser, baseURL }) => {
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
	try {
		const page = await context.newPage(); await page.goto('/gallery/');
		await expect(page.locator('h1')).toHaveText("Weiser's Gallery");
		await expect(page.locator('.resource-card')).toHaveCount(28);
		await page.goto('/ebooks/'); await expect(page.locator('h1')).toHaveText("Weiser's Ebooks");
		await expect(page.locator('.ebook-empty')).toBeVisible(); await expect(page.locator('.ebook-card')).toHaveCount(0);
		expect((await page.request.get('/ebooks/ebook-template/')).status()).toBe(404);
	} finally { await context.close(); }
});
