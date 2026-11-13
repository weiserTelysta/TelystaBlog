import { expect, test } from '@playwright/test';

test('首页只下载构建生成的 WOFF2 子集，保留原有文楷字体', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => document.fonts.ready);
	const fonts = await page.evaluate(() => performance.getEntriesByType('resource')
		.filter(entry => /\.(woff2|ttf)(\?|$)/.test(entry.name))
		.map(entry => ({ url: entry.name, bytes: (entry as PerformanceResourceTiming).decodedBodySize })));
	expect(fonts.some(font => font.url.endsWith('.ttf'))).toBe(false);
	const slices = fonts.filter(font => font.url.includes('/wenkai.') && font.url.endsWith('.woff2'));
	expect(slices).toHaveLength(1);
	expect(slices[0].bytes).toBeGreaterThan(0);
	expect(slices[0].bytes).toBeLessThan(100 * 1024);
	await expect(page.locator('.home-section__description').first()).toHaveCSS('font-family', /LXGW WenKai Lite/);
});
