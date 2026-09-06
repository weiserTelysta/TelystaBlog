import { RESOURCE_PAGE_CONFIG } from '../../src/config/pages/resources';
import { test, expect } from '@playwright/test';

test('列表使用独立 cover，高清图仅在看图器打开后请求', async ({ page }, testInfo) => {
	const fullImages: string[] = [];
	page.on('request', request => {
		if (request.resourceType() === 'image' && request.url().includes('/telysta-images/') && !/Minecraft_red|minecraft_yellow/.test(request.url())) fullImages.push(request.url());
	});
	await page.goto('/resources/');
	const cover = page.getByRole('link', { name: '查看资源：Telysta · 克里诺林裙', exact: true }).locator('img');
	await expect(cover).toHaveAttribute('src', /\/covers\/Telysta\/.+\.[a-f0-9]{64}\.webp$/);
	await cover.evaluate((image: HTMLImageElement) => image.decode());
	expect(await cover.evaluate((image: HTMLImageElement) => Math.max(image.naturalWidth, image.naturalHeight))).toBeLessThanOrEqual(960);
	expect(fullImages).toEqual([]);
	await page.screenshot({ path: testInfo.outputPath('cdn-covers-desktop.png') });
	await cover.click();
	const full = page.locator('.pswp img[src$="telysta_crinoline_character_illustration.webp"]');
	await expect(full).toBeInViewport();
	await full.evaluate((image: HTMLImageElement) => image.decode());
	expect(await full.evaluate((image: HTMLImageElement) => Math.max(image.naturalWidth, image.naturalHeight))).toBeGreaterThan(960);
	await page.keyboard.press('Escape');
});

test('图片内聚操作、移出/闲置隐藏、下载分层关闭与焦点恢复', async ({ page }, testInfo) => {
	await page.goto('/resources/');
	const trigger = page.getByRole('link', { name: '查看资源：波斯少女', exact: true });
	await trigger.click();
	const image = page.locator('.pswp img[src$="Persian_Lady_illustration.webp"]');
	await expect(image).toBeInViewport();
	await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 20_000 }).toBe(true);
	const frame = page.locator('.resource-viewer-frame');
	const toolbar = page.locator('.resource-viewer-toolbar');
	await expect.poll(async () => {
		const picture = (await image.boundingBox())!;
		const controls = (await page.locator('.resource-viewer-actions').boundingBox())!;
		return controls.x >= picture.x && controls.x + controls.width <= picture.x + picture.width + 1
			&& controls.y >= picture.y && controls.y + controls.height <= picture.y + picture.height + 1;
	}).toBe(true);
	await page.mouse.move(5, 5);
	await expect(toolbar).toHaveCSS('opacity', '0');
	const box = (await frame.boundingBox())!;
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await expect(toolbar).toHaveCSS('opacity', '1');
	await expect(toolbar).toHaveCSS('opacity', '0', { timeout: 4000 });
	await page.keyboard.press('Tab');
	await expect(toolbar).toHaveCSS('opacity', '1');
	await page.getByRole('button', { name: RESOURCE_PAGE_CONFIG.viewer.downloadLabel, exact: true }).click();
	const picker = page.locator('.resource-download-dialog');
	await expect(picker).toBeVisible();
	await expect(picker.locator('a')).toHaveCount(2);
	await expect(picker.locator('a[href*=".psd"]')).toHaveCount(0);
	await page.keyboard.press('Escape');
	await expect(picker).not.toBeVisible();
	await expect(page.locator('.pswp')).toBeVisible();
	await expect(page.getByRole('button', { name: RESOURCE_PAGE_CONFIG.viewer.downloadLabel, exact: true })).toBeFocused();
	await page.mouse.move(5, 5);
	await expect(toolbar).toHaveCSS('opacity', '0');
	await page.keyboard.press('ArrowRight');
	await expect(page.locator('.pswp img[src$="Persian_Lady_flag.webp"]')).toBeInViewport();
	await page.screenshot({ path: testInfo.outputPath('landscape-overlay.png') });
	await page.keyboard.press('Escape');
	await expect(page.locator('.pswp')).toHaveCount(0);
	await expect(trigger).toBeFocused();
	expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('触屏窄屏与减少动态：按钮不溢出，像素皮肤保留 PNG', async ({ browser }, testInfo) => {
	const context = await browser.newContext({ viewport: { width: 320, height: 740 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
	const page = await context.newPage();
	try {
		await page.goto('http://127.0.0.1:4322/resources/');
		await page.getByRole('link', { name: '查看资源：Minecraft · 红色皮肤', exact: true }).tap();
		await expect(page.locator('.pswp')).toBeVisible();
		await expect(page.locator('.resource-viewer-toolbar')).toHaveCSS('transition-duration', '0s');
		for (const button of await page.locator('.resource-viewer-button').all()) await expect(button).toBeInViewport();
		const image = page.locator('.pswp img[src$="Minecraft_red.webp"]');
		await expect(image).toBeInViewport();
		await expect(image).toHaveCSS('image-rendering', 'pixelated');
		await page.getByRole('button', { name: RESOURCE_PAGE_CONFIG.viewer.downloadLabel, exact: true }).tap();
		await expect(page.locator('.resource-download-dialog a')).toHaveAttribute('href', /Minecraft_red\.png$/);
		await page.screenshot({ path: testInfo.outputPath('mobile-download.png') });
		await page.keyboard.press('Escape');
		await page.getByRole('button', { name: RESOURCE_PAGE_CONFIG.viewer.closeLabel, exact: true }).tap();
		await expect(page.locator('.pswp')).toHaveCount(0);
	} finally { await context.close(); }
});

test('列表轻微放大不触发布局位移，遮罩暂停星空，关闭后恢复', async ({ page }) => {
	await page.addInitScript(() => {
		const original = CanvasRenderingContext2D.prototype.clearRect;
		Object.assign(window, { starfieldFrames: 0 });
		CanvasRenderingContext2D.prototype.clearRect = function (...args) {
			if (this.canvas.classList.contains('starfield__canvas')) (window as unknown as { starfieldFrames: number }).starfieldFrames++;
			return original.apply(this, args);
		};
	});
	await page.goto('/resources/');
	const frames = () => page.evaluate(() => (window as unknown as { starfieldFrames: number }).starfieldFrames);
	await expect.poll(frames).toBeGreaterThan(2);
	const trigger = page.getByRole('link', { name: '查看资源：花毛茛', exact: true });
	await trigger.scrollIntoViewIfNeeded();
	const before = (await trigger.boundingBox())!;
	await trigger.hover();
	await expect(trigger.locator('img')).toHaveCSS('transform', 'matrix(1.025, 0, 0, 1.025, 0, 0)');
	expect((await trigger.boundingBox())!.width).toBeCloseTo(before.width, 1);
	await trigger.click();
	await expect(page.locator('.pswp')).toBeVisible();
	const paused = await frames();
	await page.keyboard.press('Tab');
	await expect(page.locator('.resource-viewer-toolbar')).toHaveCSS('opacity', '1');
	expect(await frames()).toBeLessThanOrEqual(paused + 1);
	await page.keyboard.press('Escape');
	await expect(page.locator('.pswp')).toHaveCount(0);
	await expect.poll(frames).toBeGreaterThan(paused + 1);
});

test('生产 HTML 包含指定资源，没有 Character / 头像 / 文章配图或 PSD', async ({ request }) => {
	const response = await request.get('/resources/');
	expect(response.ok()).toBe(true);
	const html = await response.text();
	for (const title of ['Telysta · 克里诺林裙', 'Weiser · 新艺术风格', '波斯少女', '摩尼教 · 人物与旗帜', '花毛茛', 'Minecraft · 红色皮肤', 'Minecraft · 黄色皮肤']) {
		expect(html).toContain(`查看资源：${title}`);
	}
	expect(html).not.toMatch(/https[^\s"<>]*\.psd(?:[?"<\s]|$)/i);
	// The head may declare a site-level avatar for link sharing; it is not a gallery item.
	const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
	expect(body).toBeTruthy();
	expect(body).not.toMatch(/assets\.telysta\.com\/(characters|avatars|blog_imgs)\//i);
});
