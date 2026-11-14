import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
	test(`真实书室按中图法分页，原生链接与详情可用：${width}px`, async ({ browser, baseURL }, testInfo) => {
		const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
		const page = await context.newPage();
		const requestedBooks: string[] = [];
		page.on('request', request => { if (request.url().startsWith('https://library-files.telysta.com/books/')) requestedBooks.push(request.url()); });
		try {
			await page.goto('/ebooks/', { waitUntil: 'domcontentloaded' });
			await expect(page.locator('h1')).toHaveText('书室');
			await expect(page.locator('.ebook-card')).toHaveCount(24);
			expect(requestedBooks).toEqual([]);
			await expect(page.locator('.ebook-grid')).toHaveCSS('grid-template-columns', width === 1440 ? /\S+ \S+ \S+ \S+/ : /^\S+$/);
			const firstPage = await page.locator('.ebook-card h2 a').evaluateAll(links => links.map(link => link.getAttribute('href')));
			await page.getByRole('link', { name: '下一页 →' }).click();
			await expect(page).toHaveURL(/\/ebooks\/page\/2\/$/);
			const secondPage = await page.locator('.ebook-card h2 a').evaluateAll(links => links.map(link => link.getAttribute('href')));
			expect(firstPage.some(href => secondPage.includes(href))).toBe(false);
			await page.locator('.ebook-classification summary').click();
			await page.getByRole('link', { name: /^B · 哲学、宗教/ }).click();
			await expect(page).toHaveURL(/\/ebooks\/clc\/B\/$/);
			await expect(page.locator('.ebook-classification summary')).toContainText('哲学、宗教');
			await expect(page.locator('.ebook-pagination')).toContainText('137');
			await page.goto('/ebooks/WEISER8cf630042445/', { waitUntil: 'domcontentloaded' });
			await expect(page.locator('h1')).toHaveText('伯里曼人体结构绘画教学（最新版）');
			await expect(page.locator('dl')).toContainText('乔治·伯里曼');
			await expect(page.getByRole('link', { name: /下载.*（PDF）/ })).toHaveAttribute('href', /^https:\/\/library-files\.telysta\.com\/books\/.+\.pdf$/);
			await page.goto('/ebooks/WEISERd073e41fae03/', { waitUntil: 'domcontentloaded' });
			await expect(page.locator('.ebook-detail__cover.ebook-cover-placeholder')).toBeVisible();
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
			expect(requestedBooks).toEqual([]);
			await page.screenshot({ path: testInfo.outputPath(`library-${width}.png`) });
		} finally { await context.close(); }
	});
}
