import { test, expect } from '@playwright/test';

test('首页共用社交图标，源码图片地址正确解析，二维码关闭后恢复焦点', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('[data-home-social] svg path').first()).toHaveAttribute('d', /^M/);
	const trigger = page.locator('[data-home-contact-trigger="qq"]');
	await expect(trigger).toHaveAttribute('href', /\/_astro\/qq\./);
	await trigger.click();
	const dialog = page.locator('#home-contact-dialog');
	await expect(dialog).toBeVisible();
	const image = dialog.locator('[data-home-contact-panel="qq"] img');
	await expect.poll(()=>image.evaluate((img: HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	await expect(trigger).toBeFocused();
});
