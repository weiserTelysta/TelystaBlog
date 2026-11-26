import { test, expect } from '@playwright/test';

test('碎花瓣沿标题右上角错落，并遵循减少动态设置', async ({ page }) => {
	await page.goto('/series/');
	const flower = page.locator('.series-index [data-flower-ornament]');
	await expect(flower).toHaveClass(/is-blooming/);
	const placement = await flower.evaluate(el => {
		const text = el.parentElement!.getBoundingClientRect();
		const petals = el.getBoundingClientRect();
		return { overlap: text.right - petals.left, width: petals.width };
	});
	expect(placement.overlap).toBeGreaterThan(0);
	expect(placement.overlap).toBeLessThan(8);
	expect(placement.width).toBeLessThan(28);
	const petals = await flower.evaluate(ornament => {
		const elements = [...ornament.querySelectorAll('[data-petal]')];
		const animations = elements.flatMap(petal => petal.getAnimations());
		animations.forEach(animation => { animation.pause(); animation.currentTime = 0; });
		const folded = elements.map(petal => getComputedStyle(petal).transform);
		animations.forEach(animation => { animation.currentTime = 1000; });
		return { folded, open: elements.map(petal => getComputedStyle(petal).transform) };
	});
	expect(petals.folded).not.toEqual(petals.open);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await expect(flower.locator('[data-petal="1"]')).toHaveCSS('animation-name', 'none');
});

for (const width of [390, 1440]) {
	test(`Series displays artwork, compact entries and borderless article lists at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/series/');
		const main = page.locator('main');
		await expect(main).not.toHaveAttribute('lang', 'en');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('系列文章');
		await expect(page.locator('.series-index__summary strong').first()).toHaveText('博客建设记录');
		await expect(page.locator('.series-index__summary p').first()).toContainText('记录这个安静博客');
		const entries = page.locator('.series-index__card');
		await expect(entries.first().locator('img')).toHaveAttribute('src', /^\/_astro\/.*\.webp$/);
		await expect.poll(() => entries.first().locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(176);
		await expect(entries.first().locator('.series-index__meta')).toContainText('篇文章');
		const first = (await entries.nth(0).boundingBox())!;
		const second = (await entries.nth(1).boundingBox())!;
		if (width === 390) expect(second.y).toBeGreaterThan(first.y);
		else expect(second.y).toBe(first.y);
		await page.screenshot({ path: testInfo.outputPath('series.png'), fullPage: true });
		await page.locator('.series-index__list a').first().click();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('博客建设记录');
		await expect(page).toHaveTitle(/博客建设记录/);
		await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /记录这个安静博客/);
		await expect(page.locator('.series-page__eyebrow')).toContainText('Series');
		const rows = page.locator('.article-post-list li');
		for (const row of await rows.all()) {
			await expect(row.locator('strong')).toHaveText(/\p{Script=Han}/u);
			await expect(row.locator('p')).toHaveText(/\p{Script=Han}/u);
		}
		await page.screenshot({ path: testInfo.outputPath('series-directory.png'), fullPage: true });
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
