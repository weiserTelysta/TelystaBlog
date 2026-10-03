import { test, expect } from '@playwright/test';

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
