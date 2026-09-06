import { test, expect } from '@playwright/test';

test('无 JavaScript 也能获取首页与文章的静态分享信息', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	try {
		await page.goto('http://127.0.0.1:4322/?from=share');
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://assets.telysta.com/avatars/Profile_Weiser.avatar.webp');
		await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://telysta.com/');
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://telysta.com/');
		await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
		await expect(page.locator('meta[name="twitter:image"]')).toHaveCount(1);
		await expect(page.locator('meta[property="article:published_time"]')).toHaveCount(0);
		await page.goto('http://127.0.0.1:4322/blog/');
		const href = await page.locator('a[href^="/blog/manuscript/"]').first().getAttribute('href');
		expect(href).toBeTruthy();
		await page.goto(new URL(href!, 'http://127.0.0.1:4322').href);
		await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
		await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', await page.title());
		await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute('content', /T00:00:00\.000Z$/);
		await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
	} finally { await context.close(); }
});
