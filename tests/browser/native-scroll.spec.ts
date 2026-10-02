import { test, expect } from '@playwright/test';

test('星空恢复首帧延续暂停位置，不追赶暂停期间的时间', async ({ page }) => {
	await page.addInitScript(() => {
		const frames: number[][] = [];
		Object.assign(window, { starFrames: frames });
		const clear = CanvasRenderingContext2D.prototype.clearRect;
		const arc = CanvasRenderingContext2D.prototype.arc;
		let first = false;
		CanvasRenderingContext2D.prototype.clearRect = function(...args) {
			if (this.canvas.classList.contains('starfield__canvas')) first = true;
			return clear.apply(this, args);
		};
		CanvasRenderingContext2D.prototype.arc = function(...args) {
			if (first && this.canvas.classList.contains('starfield__canvas')) { frames.push([args[0], args[1]]); first = false; }
			return arc.apply(this, args);
		};
	});
	await page.goto('/blog/');
	await expect.poll(() => page.evaluate(() => (window as any).starFrames.length)).toBeGreaterThan(3);
	const frozen = await page.evaluate(async () => {
		for (let i = 0; i < 20; i++) {
			dispatchEvent(new Event('scroll'));
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		const frames = (window as any).starFrames as number[][];
		return { count: frames.length, point: frames.at(-1)! };
	});
	await expect.poll(() => page.evaluate(() => (window as any).starFrames.length)).toBeGreaterThan(frozen.count);
	const resumed = await page.evaluate(i => (window as any).starFrames[i] as number[], frozen.count);
	expect(resumed[0]).toBeCloseTo(frozen.point[0], 5);
	expect(resumed[1]).toBeCloseTo(frozen.point[1], 5);
	const beforeResize = await page.evaluate(async () => {
		document.documentElement.classList.add('has-modal-open');
		await Promise.resolve();
		const frames = (window as any).starFrames as number[][];
		return { count: frames.length, point: frames.at(-1)! };
	});
	await page.setViewportSize({ width: 1440, height: 1100 });
	await expect.poll(() => page.evaluate(() => (window as any).starFrames.length)).toBeGreaterThan(beforeResize.count);
	const resized = await page.evaluate(i => (window as any).starFrames[i] as number[], beforeResize.count);
	expect(resized[0]).toBeCloseTo(beforeResize.point[0], 5);
	expect(resized[1]).toBeCloseTo(beforeResize.point[1], 5);
	await page.evaluate(() => document.documentElement.classList.remove('has-modal-open'));
});

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
