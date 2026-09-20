import { test, expect, type Page } from '@playwright/test';

const seriesIndex = '/series/weiser-blog-construction-records/';
const standalone = '/blog/letters/2026-9-12-lamy2000的使用体验/';
const navSelector = '.article-series';
const rowSelector = '.article-series__chapters';

async function chapters(page: Page, route = seriesIndex) {
	await page.goto(route, { waitUntil: 'domcontentloaded' });
	return page.locator('.article-post-list a').evaluateAll(links =>
		links.map(link => link.getAttribute('href')!),
	);
}

test('所有公开系列的首章、中间章、末章与单篇系列链接对应目录顺序', async ({ page }, testInfo) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	for (const series of ['weiser-blog-construction-records', 'ningbo-catholic-observation-log', 'marketing-ecommerce-notes', 'telysta-notes', 'rhaelysa-notes', 'plants-in-their-season']) {
		const route = `/series/${series}/`;
		const hrefs = await chapters(page, route);
		expect(hrefs.length).toBeGreaterThan(0);
		for (const [index, href] of hrefs.entries()) {
			await page.goto(href, { waitUntil: 'domcontentloaded' });
			const controls = page.locator(`${rowSelector} > li > *`);
			await expect(controls).toHaveCount(3);
			for (const [position, target] of [hrefs[index - 1], route, hrefs[index + 1]].entries()) {
				const control = controls.nth(position);
				if (target) {
					await expect(control).toHaveAttribute('href', target);
					await expect(control).not.toHaveAttribute('aria-disabled');
				} else {
					await expect(control).toHaveAttribute('aria-disabled', 'true');
					await expect(control).not.toHaveAttribute('href');
					await expect(control).not.toHaveAttribute('tabindex');
				}
			}
			await expect(page.locator('.article-series__count')).toHaveText(String(hrefs.length).padStart(2, '0'));
		}
		if (series === 'telysta-notes') {
			await page.locator(navSelector).screenshot({ path: testInfo.outputPath('single-series.png') });
		}
	}
	expect(errors).toEqual([]);
});

test('无系列文章保留三个禁用入口，点击不会导航', async ({ page }) => {
	await page.goto(standalone, { waitUntil: 'domcontentloaded' });
	const controls = page.locator(`${rowSelector} [aria-disabled="true"]`);
	await expect(controls).toHaveCount(3);
	await expect(page.locator(`${navSelector} a`)).toHaveCount(0);
	const before = page.url();
	for (const control of await controls.all()) {
		await control.click({ force: true });
		expect(page.url()).toBe(before);
		expect(await control.evaluate(el => (el as HTMLElement).tabIndex)).toBe(-1);
	}
});

for (const width of [320, 390, 768, 1440]) {
	test(`章节导航三等分、无边框且字号小于正文：${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		const hrefs = await chapters(page);
		await page.goto(hrefs[1], { waitUntil: 'domcontentloaded' });
		await page.evaluate(() => document.fonts.ready);
		await page.locator(navSelector).scrollIntoViewIfNeeded();
		const geometry = await page.locator(rowSelector).evaluate(el => {
			const controls = [...el.querySelectorAll<HTMLElement>('.article-series__chapter')];
			return {
				widths: controls.map(control => control.getBoundingClientRect().width),
				heights: controls.map(control => control.getBoundingClientRect().height),
				borders: controls.map(control => getComputedStyle(control).borderTopWidth),
				fontSize: parseFloat(getComputedStyle(controls[0]).fontSize),
				proseSize: parseFloat(getComputedStyle(document.querySelector('.prose')!).fontSize),
			};
		});
		expect(Math.max(...geometry.widths) - Math.min(...geometry.widths)).toBeLessThan(1);
		expect(Math.min(...geometry.heights)).toBeGreaterThanOrEqual(44);
		expect(geometry.borders).toEqual(['0px', '0px', '0px']);
		expect(geometry.fontSize).toBeLessThan(geometry.proseSize);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		await page.screenshot({ path: testInfo.outputPath(`article-series-${width}.png`) });
		await page.evaluate(() => document.documentElement.style.fontSize = '200%');
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	});
}

test('原生链接支持键盘、跳过禁用项，无 JavaScript 仍能前后翻章与进入目录', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	try {
		const hrefs = await chapters(page);
		await page.goto(hrefs[0], { waitUntil: 'domcontentloaded' });
		await page.locator('.article-series__link').focus();
		await page.keyboard.press('Tab');
		const contents = page.locator('.article-series__chapter--contents');
		await expect(contents).toBeFocused();
		expect(await contents.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
		await page.keyboard.press('Tab');
		await expect(page.locator('.article-series__chapter--next')).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(new URL(hrefs[1], page.url()).href);
		await page.locator('.article-series__chapter--previous').click();
		await expect(page).toHaveURL(new URL(hrefs[0], page.url()).href);
		await page.locator('.article-series__chapter--contents').click();
		await expect(page).toHaveURL(new URL(seriesIndex, page.url()).href);
	} finally { await context.close(); }
});

test('箭头只移动 2px，按下变淡，快速反向与减少动态效果不会残留位移', async ({ page }) => {
	const hrefs = await chapters(page);
	await page.goto(hrefs[1], { waitUntil: 'domcontentloaded' });
	const link = page.locator('.article-series__chapter--next');
	const arrow = link.locator('svg');
	await link.scrollIntoViewIfNeeded();
	const position = () => arrow.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
	expect(await position()).toBe(0);
	await expect(arrow).toHaveCSS('transition-duration', '0.14s');
	// Slow the same transition in the test so CI can inspect a deterministic midpoint.
	await arrow.evaluate(el => (el as SVGElement).style.transitionDuration = '1s');
	await link.hover();
	const intermediate = await arrow.evaluate(el => {
		const animation = el.getAnimations()[0];
		if (!animation) throw new Error('Expected the arrow transition to be running');
		animation.pause();
		animation.currentTime = 500;
		const offset = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
		animation.finish();
		return offset;
	});
	expect(intermediate).toBeGreaterThan(0);
	expect(intermediate).toBeLessThan(2);
	await arrow.evaluate(el => (el as SVGElement).style.removeProperty('transition-duration'));
	await expect.poll(position).toBe(2);
	await page.mouse.down();
	await expect.poll(() => link.evaluate(el => Number(getComputedStyle(el).opacity))).toBe(0.72);
	await page.mouse.move(0, 0);
	await page.mouse.up();
	await expect.poll(position).toBe(0);
	await link.hover();
	await page.mouse.move(0, 0);
	await expect.poll(position).toBe(0);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await link.hover();
	expect(await position()).toBe(0);
	await expect(arrow).toHaveCSS('transition-duration', '0s');
	await expect(link).toHaveCSS('transition-duration', '0s');
});
