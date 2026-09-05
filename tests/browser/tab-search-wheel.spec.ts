import { test, expect } from '@playwright/test';
import { HOME_PROFILES } from '../../src/config/pages/homeProfiles';

test('搜索按需加载全文索引、焦点与关闭恢复', async ({ page }, info) => {
	let requests = 0;
	page.on('request', request => { if (request.url().endsWith('/blog/search-index.json')) requests++; });
	await page.goto('/blog/');
	expect(requests).toBe(0);
	const trigger = page.getByRole('button', { name: '搜索文章', exact: true });
	await trigger.click();
	const dialog = page.getByRole('dialog', { name: '搜索文章' });
	const input = dialog.getByRole('searchbox');
	await expect(input).toBeFocused();
	await expect.poll(() => dialog.evaluate(element => element.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
	const originalBox = (await input.boundingBox())!;
	const originalHeight = (await dialog.boundingBox())!.height;
	await expect(dialog.locator('header,h2,.blog-search__label')).toHaveCount(0);
	await input.fill('巨龙');
	await expect(dialog.getByRole('link', { name: /Telysta/ })).toBeVisible();
	await expect(dialog.locator('p mark').first()).toHaveText('巨龙');
	await expect(dialog.locator('.blog-search__results p').first()).toContainText('家族');
	expect(Math.abs((await input.boundingBox())!.y - originalBox.y)).toBeLessThan(1);
	expect((await dialog.boundingBox())!.height).toBeCloseTo(originalHeight, 1);
	await page.screenshot({ path: info.outputPath('search-desktop.png') });
	await input.fill('zzzzz不存在');
	await expect(dialog.getByRole('status')).toContainText('没有找到');
	expect(Math.abs((await input.boundingBox())!.y - originalBox.y)).toBeLessThan(1);
	expect((await dialog.boundingBox())!.height).toBeCloseTo(originalHeight, 1);
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	await expect(trigger).toBeFocused();
	await trigger.click();
	expect(requests).toBe(1);
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('窄屏搜索保持边界与键盘可达，减少动态', async ({ page }, info) => {
	await page.setViewportSize({ width: 320, height: 740 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/blog/');
	await page.getByRole('button', { name: '搜索文章', exact: true }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('searchbox').fill('Telysta');
	await expect(dialog.getByRole('link').first()).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(dialog.getByRole('link').first()).toBeFocused();
	await page.keyboard.press('ArrowDown'); await expect(dialog.getByRole('link').nth(1)).toBeFocused();
	await page.keyboard.press('ArrowUp'); await expect(dialog.getByRole('link').first()).toBeFocused();
	const box = (await dialog.boundingBox())!;
	expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(320);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
	await page.screenshot({ path: info.outputPath('search-mobile.png') });
	await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
});

test('随机 favicon 在同一标签页保持一致，首页角色同步，隐藏祝福与恢复', async ({ page }) => {
	await page.goto('/blog/');
	const favicon = page.locator('link[rel="icon"]');
	await expect(favicon).toHaveCount(1);
	await expect(favicon).toHaveAttribute('href', /\/favicons\/.+-48\.png$/);
	const chosen = await favicon.getAttribute('href');
	await page.reload(); await expect(favicon).toHaveCount(1); await expect(favicon).toHaveAttribute('href', chosen!);
	const title = await page.title();
	// Browser visibility is emulated here, not claimed as a real OS tab switch.
	await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
	await expect.poll(() => page.title()).not.toBe(title);
	const greeting = await page.title();
	await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
	expect(await page.title()).toBe(greeting);
	await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
	await expect(page).toHaveTitle(title);
	await page.goto('/'); await expect(favicon).toHaveCount(1); await expect(favicon).toHaveAttribute('href', chosen!);
	const id = await page.evaluate(() => sessionStorage.getItem('telysta:visit-profile'));
	expect(chosen).toContain(`/${id}-48.png`);
	const profile = HOME_PROFILES.find(profile => profile.id === id)!;
	await expect(page.locator('.home-identity__avatar')).toHaveAttribute('src', profile.avatar.src);
});

test('组图两侧箭头与滚轮切换，连续惯性不跳片，下载弹窗隔离', async ({ page }, info) => {
	await page.goto('/resources/');
	await page.getByRole('link', { name: '查看资源：波斯少女', exact: true }).click();
	const frame = page.locator('.resource-viewer-frame');
	const prev = page.getByRole('button', { name: '上一张图片', exact: true });
	const next = page.getByRole('button', { name: '下一张图片', exact: true });
	await expect(next).toBeVisible();
	await expect.poll(async () => {
		const f = (await frame.boundingBox())!; const p = (await prev.boundingBox())!; const n = (await next.boundingBox())!;
		return Math.abs(p.y + 22 - (f.y + f.height / 2)) < 2 && p.x < f.x + 20 && n.x + 44 > f.x + f.width - 20;
	}).toBe(true);
	const f = (await frame.boundingBox())!; await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2);
	await page.mouse.wheel(0, 100);
	await expect(page.locator('#resource-lightbox-title')).toContainText('2 / 2');
	await page.mouse.wheel(0, -100);
	await expect(page.locator('#resource-lightbox-title')).toContainText('2 / 2');
	await page.screenshot({ path: info.outputPath('side-arrows.png') });
	await page.getByRole('button', { name: '下载图片', exact: true }).click();
	await page.locator('.resource-download-dialog').dispatchEvent('wheel', { deltaY: -500 });
	await expect(page.locator('#resource-lightbox-title')).toContainText('2 / 2');
	await page.keyboard.press('Escape'); await expect(page.locator('.resource-download-dialog')).not.toBeVisible();
	await prev.click(); await expect(page.locator('#resource-lightbox-title')).toContainText('1 / 2');
	const currentImage = page.locator('.pswp img[src$="Persian_Lady_illustration.webp"]');
	await currentImage.click();
	await expect.poll(async () => {
		const image = (await currentImage.boundingBox())!;
		return image.height > 1000;
	}).toBe(true);
	await page.mouse.wheel(0, 150);
	await expect(page.locator('#resource-lightbox-title')).toContainText('1 / 2');
	await page.keyboard.press('Escape'); await expect(page.locator('.pswp')).toHaveCount(0);
});

test('搜索失败可以重试，存储被禁用时图标仍可显示', async ({ page }) => {
	await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('Storage disabled'); }; Storage.prototype.setItem = () => { throw new Error('Storage disabled'); }; });
	let attempt = 0;
	await page.route('**/blog/search-index.json', route => ++attempt === 1 ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue());
	await page.goto('/blog/');
	await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
	await page.getByRole('button', { name: '搜索文章', exact: true }).click();
	await expect(page.getByRole('status')).toContainText('暂时无法加载');
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await page.getByRole('button', { name: '搜索文章', exact: true }).click();
	await page.getByRole('searchbox').fill('Telysta');
	await expect(page.locator('.blog-search__results a').first()).toBeVisible();
});

test('搜索组词暂不刷新结果，快速开关不残留动画或滚动锁', async ({ page }) => {
	await page.goto('/blog/');
	const trigger = page.getByRole('button', { name: '搜索文章', exact: true });
	await trigger.click(); await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await trigger.click();
	const input = page.getByRole('searchbox');
	await input.fill('巨龙');
	await expect(page.locator('.blog-search__results p mark')).toContainText(['巨龙']);
	await input.dispatchEvent('compositionstart');
	await input.fill('Telysta');
	await expect(page.locator('.blog-search__results p mark')).toContainText(['巨龙']);
	await input.dispatchEvent('compositionend');
	await expect.poll(() => page.locator('.blog-search__results a').count()).toBeGreaterThan(1);
	await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
	expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});
