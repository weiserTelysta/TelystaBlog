import { test, expect } from '@playwright/test';

const article = '/blog/portraits/telysta/2026-9-5-telysta的创作理念/';

test('筛选少量资源不会拉高页首或改变标题、筛选入口的位置', async ({ page }, testInfo) => {
	await page.goto('/resources/');
	await page.evaluate(() => document.fonts.ready);
	const selectors = ['.resource-hero__eyebrow', '.resource-hero h1', '.resource-filters'];
	const before = await Promise.all(selectors.map(s => page.locator(s).boundingBox()));
	await page.getByRole('button', { name: 'Image', exact: true }).click();
	await expect(page.locator('.resource-card')).toHaveCount(2);
	const after = await Promise.all(selectors.map(s => page.locator(s).boundingBox()));
	selectors.forEach((s, index) => expect(Math.abs(after[index]!.y - before[index]!.y), s).toBeLessThan(1));
	await expect.poll(() => page.locator('.resource-card img').evaluateAll(images =>
		images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)), { timeout: 20_000 }).toBe(true);
	await page.screenshot({ path: testInfo.outputPath('sparse-filter.png') });
});

test('评论加载及高度更新不移动上方正在阅读的正文', async ({ page }) => {
	await page.route('https://giscus.app/**', route => route.abort());
	await page.goto(article, { waitUntil: 'domcontentloaded' });
	await page.evaluate(() => document.fonts.ready);
	await page.locator('.article-series').scrollIntoViewIfNeeded();
	const result = await page.evaluate(async () => {
		const anchor = document.querySelector('.article-series')!;
		const comments = document.querySelector('.giscus')!;
		const iframe = document.createElement('iframe');
		iframe.className = 'giscus-frame';
		iframe.title = 'Comments test';
		comments.append(iframe);
		const start = anchor.getBoundingClientRect().top;
		const positions: number[] = [];
		for (const height of [150, 380, 460, 440, 520]) {
			iframe.style.height = height + 'px';
			await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
			positions.push(anchor.getBoundingClientRect().top);
		}
		return { start, positions };
	});
	for (const position of result.positions) expect(Math.abs(position - result.start)).toBeLessThan(1);
});

test('文章图片未下载时已经预留高度，评论有初始占位', async ({ page }) => {
	// Leave image requests pending so this assertion cannot be rescued by a fast CDN.
	let release!: () => void;
	const pending = new Promise<void>(resolve => { release = resolve; });
	await page.route('https://assets.telysta.com/**', async route => { await pending; await route.abort(); });
	await page.route('https://giscus.app/**', route => route.abort());
	try {
		await page.goto(article, { waitUntil: 'domcontentloaded' });
		const images = page.locator('[data-article-content] img');
		await expect(images).toHaveCount(4);
		for (const image of await images.all()) {
			await expect(image).toHaveAttribute('width', /^[1-9]\d*$/);
			await expect(image).toHaveAttribute('height', /^[1-9]\d*$/);
			expect((await image.boundingBox())!.height).toBeGreaterThan(200);
		}
		expect((await page.locator('.article-comments').boundingBox())!.height).toBeGreaterThanOrEqual(400);
	} finally { release(); }
});

test('文章滚轮不经过第二层插值，图片和评论区域仍可正常阅读', async ({ page }) => {
	await page.route('https://giscus.app/**', route => route.abort());
	await page.goto(article, { waitUntil: 'domcontentloaded' });
	await expect(page.locator('html')).toHaveClass(/lenis/);
	await page.evaluate(() => {
		Object.assign(window, { smoothWheelSeen: false });
		new MutationObserver(() => {
			if (document.documentElement.classList.contains('lenis-smooth')) Object.assign(window, { smoothWheelSeen: true });
		}).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
	});
	await page.mouse.move(180, 400);
	await page.mouse.wheel(0, 220);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
	expect(await page.evaluate(() => (window as unknown as { smoothWheelSeen: boolean }).smoothWheelSeen)).toBe(false);
});
