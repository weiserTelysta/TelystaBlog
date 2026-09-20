import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
	test(`Series uses English grouping and borderless lists at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/series/');
		const main = page.locator('main');
		await expect(main).toHaveAttribute('lang', 'en');
		expect(await main.innerText()).not.toMatch(/\p{Script=Han}/u);
		await expect(page.locator('.series-index__group-header h2').first()).toHaveText('Manuscript');
		expect((await page.locator('.series-index__group-header').allTextContents()).join(' ')).not.toMatch(/Weiser|Alice|Rhaelysa/);
		await page.screenshot({ path: testInfo.outputPath('series.png'), fullPage: true });
		await page.locator('.series-index__list a').first().click();
		const rows = page.locator('.article-post-list li');
		await expect(rows.first()).toBeVisible();
		for (const row of await rows.all()) {
			await expect(row).toHaveCSS('border-top-width', '0px');
			await expect(row).toHaveCSS('border-bottom-width', '0px');
		}
		await page.locator('.article-post-list a').first().focus();
		await expect(page.locator('.article-post-list a').first()).toHaveCSS('outline-style', 'solid');
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	});

	test(`Cards use responsive artwork and layered foil without rings at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/blog/');
		await page.locator('.category-accordion__entry').click();
		const card = page.locator('.category-accordion__card').first();
		const artwork = card.locator('img');
		await expect.poll(() => artwork.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
		await expect(artwork).toHaveAttribute('srcset', /480w, .*800w/);
		const geometry = await artwork.evaluate((img: HTMLImageElement) => ({
			width: img.clientWidth, height: img.clientHeight,
			parentHeight: img.parentElement!.clientHeight,
		}));
		expect(Math.abs(geometry.height - geometry.parentHeight)).toBeLessThan(1);
		expect(geometry.height / geometry.width).toBeGreaterThan(2.4);
		const inner = card.locator('.category-accordion__card-inner');
		const layers = await inner.evaluate(el => getComputedStyle(el, '::before').backgroundImage);
		expect(layers.match(/gradient\(/g)?.length).toBe(3);
		expect(layers).not.toMatch(/(?:radial|conic)-gradient/);
		await card.hover({ position: { x: 30, y: 80 } });
		await page.screenshot({ path: testInfo.outputPath('category-foil.png') });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await card.hover({ position: { x: 90, y: 160 } });
		expect(await card.evaluate(el => getComputedStyle(el).getPropertyValue('--pointer-x').trim())).toBe('50%');
		expect(await inner.evaluate(el => getComputedStyle(el, '::before').transitionDuration)).toBe('0s');
		await page.keyboard.press('Escape');
		await expect(page.locator('.category-accordion__entry')).toBeFocused();
	});

	test(`Both observation hymns render SVG and keyboard-accessible fallback at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		for (const [slug, title, key] of [
			['2026-9-11-天主教考察日志02', '慈光歌', 'Ab'],
			['2026-9-20-天主教观察日志03', '耶稣基督是生命源', 'C'],
		]) {
			await page.goto(`/blog/notes/catholic-observation-log/${slug}/`);
			const score = page.locator('.music-score');
			await expect(score).toHaveCount(1);
			await expect(score.locator('svg')).toBeVisible();
			await expect(score).toHaveAccessibleName(title);
			await score.scrollIntoViewIfNeeded();
			await page.screenshot({ path: testInfo.outputPath(`${slug}.png`) });
			await score.locator('.music-score__viewport').focus();
			await expect(score.locator('.music-score__viewport')).toBeFocused();
			await score.locator('summary').click();
			await expect(score.locator('pre')).toContainText(`1 = ${key}`);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		}
	});
}
