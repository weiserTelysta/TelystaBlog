import { test, expect } from '@playwright/test';

test('Blog、Gallery 与 Ebooks 直接访问目录地址，无脚本也能跳转', async ({ browser, baseURL }) => {
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
	const page = await context.newPage();
	try {
		for (const [name, path] of [['Blog', '/blog/'], ['Gallery', '/gallery/'], ['Ebooks', '/ebooks/']]) {
			await page.goto('/');
			const link = page.getByRole('link', { name: new RegExp(`^${name}(?:\\s|$)`) });
			await expect(link).toHaveAttribute('href', path);
			const responsePromise = page.waitForResponse(response => response.request().isNavigationRequest());
			await link.click();
			const response = await responsePromise;
			expect(response.status()).toBe(200);
			expect(response.request().redirectedFrom()).toBeNull();
			await expect(page).toHaveURL(new URL(path, baseURL!).href);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		}
	} finally { await context.close(); }
});

for (const width of [390, 720, 721, 1440]) {
	test(`Home navigation wraps after two items at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const navigation = page.locator('.home-section--resources');
		await navigation.scrollIntoViewIfNeeded();
		const links = navigation.locator('.home-section__link-item');
		expect(await links.count()).toBeGreaterThanOrEqual(3);
		const boxes = await links.evaluateAll(items => items.map(item => {
			const { x, y, width, height } = item.getBoundingClientRect();
			return { x, y, width, height };
		}));
		const columns = width > 720 ? 2 : 1;
		for (let i = 0; i < boxes.length; i++) {
			const current = boxes[i];
			expect(Math.abs(current.x - boxes[i % columns].x)).toBeLessThan(1);
			if (i % columns !== 0) expect(Math.abs(current.y - boxes[i - 1].y)).toBeLessThan(1);
			if (i >= columns) expect(current.y).toBeGreaterThanOrEqual(boxes[i - columns].y + boxes[i - columns].height);
		}
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		const firstLink = navigation.getByRole('link').first();
		await firstLink.focus();
		await expect(firstLink).toBeFocused();
		await navigation.screenshot({ path: testInfo.outputPath('home-navigation.png') });
	});
}
