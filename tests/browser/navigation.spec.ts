import { test, expect } from '@playwright/test';

for (const width of [320, 390, 768, 1440]) {
	test(`Category / Series 对齐且无横向溢出：${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		for (const route of ['/blog/', '/blog/category/manuscript/']) {
			await page.goto(route);
			await page.evaluate(() => document.fonts.ready);
			const category = page.locator('.category-accordion__entry-label');
			const series = page.locator('.blog-series-link span').first();
			const left = (await category.boundingBox())!;
			const right = (await series.boundingBox())!;
			expect(Math.abs(left.y - right.y), '两个入口的标签应处于同一高度').toBeLessThan(1);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		}
	});
}

test('资源看图器接收真实键盘切换与 Escape', async ({ page }, testInfo) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.goto('/resources/');
	await page.getByRole('link', { name: '查看资源：Telysta · 克里诺林裙', exact: true }).click();
	await expect(page.locator('.pswp')).toBeVisible();
	await page.keyboard.press('ArrowRight');
	await expect(page.locator('#resource-lightbox-title')).toContainText('2 / 2');
	const activeImage = page.locator('.pswp img[src$="telysta_crinoline_design.webp"]');
	await expect(activeImage).toBeInViewport();
	await expect.poll(() => activeImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0), { timeout: 20_000 }).toBe(true);
	await page.screenshot({ path: testInfo.outputPath('lightbox.png') });
	await page.keyboard.press('Escape');
	await expect(page.locator('.pswp')).toHaveCount(0);
	expect(errors).toEqual([]);
});
