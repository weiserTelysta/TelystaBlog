import { expect, test, type Page } from '@playwright/test';

const article = '/blog/portraits/sylvaena/2026-9-24-コクノコ委托/';
const imageSelector = '[data-article-content] img';

async function openArticle(page: Page) {
	await page.route('https://giscus.app/**', route => route.abort());
	await page.goto(article, { waitUntil: 'domcontentloaded' });
	const image = page.locator(imageSelector).first();
	await image.scrollIntoViewIfNeeded();
	await image.evaluate((image: HTMLImageElement) => image.decode());
	return page.locator('.article-image-link').first();
}

for (const width of [390, 1440]) {
	test(`文章图片放大、缩放与滚动恢复：${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		const trigger = await openArticle(page);
		const image = trigger.locator('img');
		const box = await image.boundingBox();
		expect(box?.width).toBe(width === 390 ? 358 : 760);
		await page.screenshot({ path: testInfo.outputPath('article-image-inline.png') });
		const scroll = await page.evaluate(() => scrollY);
		await trigger.click();
		const dialog = page.getByRole('dialog', { name: /^图片预览/ });
		await expect(dialog).toBeVisible();
		await expect(dialog.locator('.pswp__img').last()).toHaveAttribute('src', await image.getAttribute('src') as string);
		await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
		await page.getByRole('button', { name: '放大／缩小图片', exact: true }).click();
		await expect(dialog).toHaveClass(/pswp--zoomed-in/);
		await page.keyboard.press('z');
		await expect(dialog).not.toHaveClass(/pswp--zoomed-in/);
		await page.screenshot({ path: testInfo.outputPath('article-image-viewer.png') });
		await page.mouse.wheel(0, -160);
		await expect(dialog).toHaveClass(/pswp--zoomed-in/);
		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
		await expect(trigger).toBeFocused();
		expect(await page.evaluate(() => scrollY)).toBeCloseTo(scroll, 0);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		expect(errors).toEqual([]);
	});
}

test('键盘焦点、减少动态效果、重复打开与页面切换清理', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const trigger = await openArticle(page);
	for (let i = 0; i < 2; i++) {
		await trigger.focus();
		await page.keyboard.press('Enter');
		const dialog = page.locator('.article-lightbox');
		await expect(dialog).toBeVisible();
		await expect(dialog).toBeFocused();
		for (let tab = 0; tab < 4; tab++) {
			await page.keyboard.press(tab % 2 ? 'Shift+Tab' : 'Tab');
			expect(await page.evaluate(() => !!document.activeElement?.closest('.article-lightbox'))).toBe(true);
		}
		if (i === 0) await page.getByRole('button', { name: '关闭图片预览' }).click();
		else await page.evaluate(() => document.dispatchEvent(new Event('astro:before-swap')));
		await expect(dialog).toHaveCount(0);
		await expect(trigger).toBeFocused();
		await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
	}
});

test('手机触摸打开与双指缩放', async ({ browser }) => {
	const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
	try {
		const page = await context.newPage();
		const trigger = await openArticle(page);
		await trigger.tap();
		const dialog = page.locator('.article-lightbox');
		await expect(dialog).toBeVisible();
		const session = await context.newCDPSession(page);
		await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 165, y: 400, id: 0 }, { x: 225, y: 400, id: 1 }] });
		for (const offset of [40, 55, 75, 95]) {
			await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195 - offset, y: 400, id: 0 }, { x: 195 + offset, y: 400, id: 1 }] });
		}
		await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		await expect(dialog).toHaveClass(/pswp--zoomed-in/);
		await page.getByRole('button', { name: '关闭图片预览' }).tap();
		await expect(dialog).toHaveCount(0);
	} finally { await context.close(); }
});

test('已有链接、picture、重复初始化与坏图不会产生嵌套控件或空弹层', async ({ page }) => {
	await openArticle(page);
	await page.evaluate(() => {
		const content = document.querySelector('[data-article-content]')!;
		content.insertAdjacentHTML('beforeend', '<a id="author-link" href="/resources/"><img src="/favicon.svg" alt="作者链接"></a><picture id="test-picture"><img src="/favicon.svg" alt="picture"></picture><img id="broken" src="/missing-test-image.webp" alt="失效图片">');
		document.dispatchEvent(new Event('astro:page-load'));
		document.dispatchEvent(new Event('astro:page-load'));
	});
	await expect(page.locator('#author-link')).toHaveAttribute('href', '/resources/');
	await expect(page.locator('#author-link a, .article-image-link .article-image-link')).toHaveCount(0);
	await expect(page.locator('.article-image-link > #test-picture')).toHaveCount(1);
	await page.locator('#broken').evaluate(image => image.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
	await expect(page.locator('.article-lightbox')).toHaveCount(0);
});

test('看图器模块失败时保留直接查看图片的回退路径', async ({ page }) => {
	await page.route('**/articleImageViewer.*.js', route => route.abort());
	const trigger = await openArticle(page);
	const url = await trigger.getAttribute('href');
	await trigger.click();
	await expect(page).toHaveURL(url!);
});

test('打开动画期间立即关闭，不残留弹层或滚动锁', async ({ page }) => {
	const trigger = await openArticle(page);
	// Observe creation rather than waiting for animation/actionability.
	await page.evaluate(() => {
		const observer = new MutationObserver(() => {
			const close = document.querySelector<HTMLButtonElement>('.article-lightbox .pswp__button--close');
			if (!close) return;
			observer.disconnect();
			close.click();
		});
		observer.observe(document.body, { childList: true, subtree: true });
	});
	await trigger.click();
	await expect(trigger).toBeFocused();
	await expect(page.locator('.article-lightbox')).toHaveCount(0);
	await expect(trigger).not.toHaveAttribute('aria-busy');
	await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
	await trigger.click();
	await expect(page.locator('.article-lightbox')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.locator('.article-lightbox')).toHaveCount(0);
});

test('无 JavaScript 时正文与图片仍可阅读', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	try {
		const page = await context.newPage();
		await page.goto(`http://127.0.0.1:4322${article}`);
		const image = page.locator(imageSelector).first();
		await image.scrollIntoViewIfNeeded();
		await expect(image).toBeVisible();
		await expect(page.locator(imageSelector)).toHaveCount(4);
	} finally { await context.close(); }
});
