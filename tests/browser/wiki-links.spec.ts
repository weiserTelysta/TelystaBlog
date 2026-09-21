import { expect, test } from '@playwright/test';

const target = '/blog/portraits/telysta/2026-9-5-telysta的创作理念/';
for (const width of [390, 1440]) {
	test(`WikiLink 自动查找目标，键盘导航与原有评论保持一致：${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.route('https://giscus.app/**', route => route.abort());
		await page.goto('/blog/portraits/rhaelysa/2026-9-20-rhaelysa的创作理念/', { waitUntil: 'domcontentloaded' });
		const link = page.locator('[data-article-content]').getByRole('link', { name: 'Telysta', exact: true });
		await expect(link).toHaveAttribute('href', encodeURI(target));
		await link.focus();
		await page.keyboard.press('Enter');
		await expect(page.locator('h1')).toHaveText('Telysta 的设计信息分享');
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new URL(target, 'https://telysta.com').href);
		await expect(page.locator('script[src="https://giscus.app/client.js"]')).toHaveAttribute('data-mapping', 'pathname');
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		await page.screenshot({ path: testInfo.outputPath('wiki-target.png') });
	});
}

test('WikiLink 在无 JavaScript 时仍是可跳转的原生链接', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	try {
		const page = await context.newPage();
		await page.goto('http://127.0.0.1:4322/blog/portraits/rhaelysa/2026-9-20-rhaelysa的创作理念/', { waitUntil: 'domcontentloaded' });
		await page.locator('[data-article-content]').getByRole('link', { name: 'Telysta', exact: true }).click();
		await expect(page.locator('h1')).toHaveText('Telysta 的设计信息分享');
	} finally { await context.close(); }
});
