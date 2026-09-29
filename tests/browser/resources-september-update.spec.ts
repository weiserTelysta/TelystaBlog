import { test, expect } from '@playwright/test';
import { RESOURCE_PAGE_CONFIG } from '../../src/config/pages/resources';

const groups = [
	{ title: 'Serava · 礼魂插画', images: ['serava_officialoutfit_illustration_01'] },
	{ title: 'Telysta · 细剑版服饰', images: ['Telysta_officialoutfit_fullbody_slimsword', 'Telysta_officialoutfit_design_slimsword', 'Telysta_officialoutfit_sword_slimsword'] },
	{ title: 'Telysta · 新服饰设计', images: ['Telysta_freestyle_fullbody_02', 'Telysta_freestyle_fullbody_01', 'Telysta_freestyle_design_01', 'Telysta_freestyle_sketch_01'] },
];

for (const width of [390, 1440]) {
	test(`九月新增三组资源的封面、图库和原图下载：${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/resources/', { waitUntil: 'domcontentloaded' });
		for (const group of groups) {
			const trigger = page.getByRole('link', { name: `查看资源：${group.title}`, exact: true });
			await expect(trigger.locator('img')).toHaveAttribute('src', /\/covers\/.+\.[a-f0-9]{64}\.webp$/);
			await trigger.click();
			for (const [index, name] of group.images.entries()) {
				if (index) await page.keyboard.press('ArrowRight');
				await expect(page.locator(`.pswp img[src$="/${name}.webp"]`).last()).toBeInViewport();
			}
			await page.keyboard.press('Tab');
			await page.getByRole('button', { name: RESOURCE_PAGE_CONFIG.viewer.downloadLabel, exact: true }).click();
			const downloads = page.locator('.resource-download-dialog a');
			await expect(downloads).toHaveCount(group.images.length);
			for (const [index, name] of group.images.entries()) await expect(downloads.nth(index)).toHaveAttribute('href', new RegExp(`/${name}\\.png$`));
			await page.keyboard.press('Escape');
			await expect(page.locator('.resource-download-dialog')).not.toBeVisible();
			await page.keyboard.press('Escape');
			await expect(page.locator('.pswp')).toHaveCount(0);
			await expect(trigger).toBeFocused();
		}
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		await page.screenshot({ path: testInfo.outputPath('new-resources.png') });
	});
}
