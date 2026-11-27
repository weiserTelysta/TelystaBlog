import { test, expect } from '@playwright/test';

test('首页在旧的背景会话中也只渲染星空', async ({ page }) => {
	await page.addInitScript(() => sessionStorage.setItem('telysta.home.atmosphere', 'julia:0.5'));
	for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
		await page.setViewportSize(viewport);
		await page.emulateMedia({ reducedMotion: viewport.width === 390 ? 'reduce' : 'no-preference' });
		await page.goto('/');
		const background = page.locator('.starfield');
		const canvas = background.locator('canvas');
		await expect(background).toHaveAttribute('aria-hidden', 'true');
		await expect(canvas).toHaveCount(1);
		await expect(canvas).toBeVisible();
		await expect.poll(() => canvas.evaluate(node => (node as HTMLCanvasElement).width)).toBeGreaterThan(300);
		if (viewport.width === 390) await expect(background).toHaveCSS('animation-name', 'none');
	}
});

test('首页侧影落款与单行站龄叠放，并在北京时间零点更新', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 320, height: 800 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.clock.install({ time: new Date('2026-11-23T15:59:45Z') });
	await page.goto('/');
	const colophon = page.locator('footer[aria-label="建站时间"]');
	await colophon.scrollIntoViewIfNeeded();
	await expect(colophon.locator('img')).toHaveAttribute('alt', '');
	await expect.poll(() => colophon.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
	await expect(colophon.locator('time')).toHaveAttribute('datetime', 'P182D');
	await expect(colophon).toHaveText('第一颗星，已亮了 182 夜');
	await page.evaluate(() => document.fonts.ready);
	const { artwork, copy } = await colophon.evaluate(footer => ({
		artwork: footer.querySelector('img')!.getBoundingClientRect().toJSON(),
		copy: footer.querySelector('p')!.getBoundingClientRect().toJSON(),
	}));
	expect(copy.left).toBeGreaterThan(artwork.left + artwork.width * 0.19);
	expect(copy.left).toBeLessThan(artwork.left + artwork.width * 0.25);
	expect(copy.right).toBeLessThan(artwork.right);
	expect(copy.top).toBeGreaterThan(artwork.top);
	expect(copy.bottom).toBeLessThan(artwork.bottom);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
	await colophon.screenshot({ path: testInfo.outputPath('first-star-mobile.png') });
	await page.setViewportSize({ width: 1440, height: 1000 });
	const desktop = await colophon.evaluate(footer => {
		const art = footer.querySelector('img')!.getBoundingClientRect();
		const caption = footer.querySelector('p')!;
		const range = document.createRange();
		range.selectNodeContents(caption);
		const text = range.getBoundingClientRect();
		return { height: text.height, lineHeight: parseFloat(getComputedStyle(caption).lineHeight), overflow: text.right - art.right };
	});
	expect(desktop.height).toBeLessThan(desktop.lineHeight + 2);
	expect(desktop.overflow).toBeLessThan(2);
	await colophon.screenshot({ path: testInfo.outputPath('first-star-desktop.png') });
	await page.clock.fastForward(16_000);
	await expect(colophon).toHaveText('第一颗星，已亮了 183 夜');
});

test('Blog、Gallery 与 Ebooks 直接访问目录地址，无脚本也能跳转', async ({ browser, baseURL }) => {
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
	const page = await context.newPage();
	try {
		for (const [name, path] of [['Blog', '/blog/'], ['画廊', '/gallery/'], ['书室', '/ebooks/']]) {
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

for (const width of [320, 390, 720, 721, 1440]) {
	test(`Home navigation wraps after two items at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const navigation = page.locator('.home-section--resources');
		await navigation.scrollIntoViewIfNeeded();
		await expect(navigation.locator('.home-section__eyebrow')).toHaveText('Navigation');
		const links = navigation.locator('.home-section__link-item');
		await expect(links).toHaveCount(4);
		const flowers = navigation.locator('.home-section__flower');
		await expect(flowers).toHaveCount(4);
		const trails = navigation.locator('.home-section__petal-trail');
		await expect(trails).toHaveCount(4);
		const silhouettes = await trails.evaluateAll(elements => elements.map(el => el.querySelector('defs path')?.getAttribute('d')));
		expect(new Set(silhouettes).size).toBe(4);
		await expect(trails.locator('path[stroke]:not(defs *)')).toHaveCount(0);
		for (const flower of await flowers.all()) {
			await expect(flower).toHaveAttribute('aria-hidden', 'true');
			await expect(flower).toHaveCSS('pointer-events', 'none');
			await expect(flower.locator('svg')).toBeVisible();
			expect(await flower.evaluate(el => Math.abs(el.parentElement!.getBoundingClientRect().right
				- el.getBoundingClientRect().right - 7))).toBeLessThan(1);
			expect(await flower.locator('use').evaluateAll(petals => petals.every(petal => {
				const target = petal.getAttribute('href');
				return target && petal.closest('svg')!.querySelector(target);
			}))).toBe(true);
		}
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
		const label = firstLink.locator('.home-section__link-label');
		const trail = firstLink.locator('.home-section__petal-trail');
		const fragment = trail.locator('.home-section__petal-sweep [data-fragment]').last();
		const petal = firstLink.locator('.home-section__flower [data-petal]').first();
		const bloom = firstLink.locator('.home-section__flower [data-bloom]');
		await expect(label).toHaveCSS('text-decoration-line', 'none');
		await expect(trail).toHaveAttribute('aria-hidden', 'true');
		await expect(trail).toHaveCSS('pointer-events', 'none');
		const overlap = await trail.evaluate(el => {
			const description = el.parentElement!.querySelector('.home-section__link-description')!;
			const text = document.createRange();
			text.selectNodeContents(description);
			const bounds = text.getBoundingClientRect();
			return [...el.querySelectorAll('.home-section__petal-tail use')].some(petal => {
				const fragment = petal.getBoundingClientRect();
				return fragment.left < bounds.right && fragment.right > bounds.left
					&& fragment.top < bounds.bottom && fragment.bottom > bounds.top;
			});
		});
		expect(overlap).toBe(true);
		await firstLink.focus();
		await expect(firstLink).toBeFocused();
		await expect(firstLink).toHaveCSS('outline-style', 'solid');
		await expect(label).toHaveCSS('text-decoration-line', 'none');
		for (const decoration of [bloom, petal, fragment]) {
			await expect(decoration).toHaveCSS('transform', 'none');
			await expect(decoration).toHaveCSS('transition-duration', '0s');
		}
		await navigation.screenshot({ path: testInfo.outputPath('home-navigation.png') });
	});
}

test('首页路标悬停与键盘聚焦时花瓣依次舒展，入口位置保持稳定', async ({ page }) => {
	await page.goto('/');
	const navigation = page.locator('.home-section--resources');
	const links = navigation.locator('.home-section__links');
	const link = links.getByRole('link', { name: /^书室/ });
	const label = link.locator('.home-section__link-label');
	const mainPetal = link.locator('.home-section__flower [data-petal]').first();
	const bloom = link.locator('.home-section__flower [data-bloom]');
	const fragments = link.locator('.home-section__petal-sweep [data-fragment]');
	const near = fragments.last();
	const far = fragments.first();
	await link.scrollIntoViewIfNeeded();
	await page.evaluate(() => document.fonts.ready);
	await expect(navigation).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
	await expect(links).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
	const initialColor = await label.evaluate(el => getComputedStyle(el).color);
	const position = await link.boundingBox();
	const fragmentCenters = () => fragments.evaluateAll(elements => elements.map(el => {
		const { x, y, width, height } = el.getBoundingClientRect();
		return { x: x + width / 2, y: y + height / 2 };
	}));
	const restingCenters = await fragmentCenters();
	await link.hover();
	await expect(label).not.toHaveCSS('color', initialColor);
	await expect(link).toHaveCSS('transition-property', 'color');
	await expect(bloom).not.toHaveCSS('transform', 'none');
	await expect(mainPetal).not.toHaveCSS('transform', 'none');
	await expect(near).not.toHaveCSS('transform', 'none');
	await expect(near).toHaveCSS('transition-delay', '0.12s');
	await expect(far).toHaveCSS('transition-delay', '0.23s');
	for (const [index, center] of (await fragmentCenters()).entries()) {
		const from = restingCenters[index];
		expect(Math.hypot(center.x - from.x, center.y - from.y)).toBeLessThan(4);
	}
	await expect(label).toHaveCSS('text-decoration-line', 'none');
	expect(await link.boundingBox()).toEqual(position);
	await page.mouse.move(0, 0);
	await expect(label).toHaveCSS('color', initialColor);
	await expect(bloom).toHaveCSS('transform', 'none');
	await expect(mainPetal).toHaveCSS('transform', 'none');
	await expect(near).toHaveCSS('transform', 'none');
	await link.focus();
	await expect(link).toHaveCSS('outline-style', 'solid');
	await expect(bloom).not.toHaveCSS('transform', 'none');
	await expect(mainPetal).not.toHaveCSS('transform', 'none');
	expect(await link.boundingBox()).toEqual(position);
});
