import { test, expect } from '@playwright/test';

for (const route of ['/blog/', '/resources/']) {
	test(`滚轮由浏览器处理，不取消输入或增加距离：${route}`, async ({ page }) => {
		await page.goto(route);
		await page.evaluate(() => {
			Object.assign(window, { wheelBlocked: false });
			addEventListener('wheel', event => queueMicrotask(() => {
				if (event.defaultPrevented) Object.assign(window, { wheelBlocked: true });
			}), { passive: true });
		});
		await page.mouse.move(200, 450);
		await page.mouse.wheel(0, 600);
		await expect.poll(() => page.evaluate(() => scrollY)).toBe(600);
		expect(await page.evaluate(() => (window as any).wheelBlocked)).toBe(false);
	});
}

test('背景滚动期间暂停、停止后恢复，减少动态可即时切换', async ({ page }) => {
	await page.addInitScript(() => {
		Object.assign(window, { canvasPaints: 0 });
		const clear = CanvasRenderingContext2D.prototype.clearRect;
		CanvasRenderingContext2D.prototype.clearRect = function(...args) {
			if (this.canvas.classList.contains('starfield__canvas')) (window as any).canvasPaints++;
			return clear.apply(this, args);
		};
	});
	await page.goto('/blog/');
	await expect.poll(() => page.evaluate(() => (window as any).canvasPaints)).toBeGreaterThan(1);
	const paints = await page.evaluate(async () => {
		(window as any).canvasPaints = 0;
		for (let i = 0; i < 15; i++) {
			scrollBy({ top: 20, behavior: 'instant' });
			await new Promise(resolve => setTimeout(resolve, 40));
		}
		return (window as any).canvasPaints;
	});
	expect(paints).toBeLessThanOrEqual(2);
	await expect.poll(() => page.evaluate(() => (window as any).canvasPaints)).toBeGreaterThan(paints + 3);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.waitForTimeout(100);
	const frozen = await page.evaluate(() => (window as any).canvasPaints);
	await page.waitForTimeout(250);
	expect(await page.evaluate(() => (window as any).canvasPaints)).toBe(frozen);
});

test('手机原生触摸滚动', async ({ browser }) => {
	const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
	try {
		const page = await context.newPage();
		await page.goto('/blog/');
		const session = await context.newCDPSession(page);
		await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 700 }] });
		for (const y of [650, 550, 450, 300]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y }] });
		await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
	} finally { await context.close(); }
});

test('桌面进度条拖动直接跟随指针，键盘可定位首尾', async ({ page }) => {
	await page.goto('/blog/');
	const slider = page.getByRole('slider', { name: 'Page scroll position' });
	await slider.focus();
	const box = await slider.boundingBox();
	expect(box).not.toBeNull();
	const x = box!.x + box!.width / 2;
	await page.mouse.move(x, box!.y + box!.height * 0.25);
	await page.mouse.down();
	await expect(slider).toHaveClass(/is-dragging/);
	await page.mouse.move(x, box!.y + box!.height * 0.75);
	await expect.poll(() => page.evaluate(() => scrollY / (document.documentElement.scrollHeight - innerHeight))).toBeCloseTo(0.75, 2);
	await page.mouse.up();
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await slider.press('End');
	await expect.poll(() => page.evaluate(() => Math.abs(scrollY - (document.documentElement.scrollHeight - innerHeight)))).toBeLessThan(2);
	await slider.press('Home');
	await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});
