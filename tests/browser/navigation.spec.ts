import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
	test(`角色英文题签与 letters 跳转：${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: width === 390 ? 'reduce' : 'no-preference' });
		await page.goto('/blog/');
		const entry = page.locator('.category-accordion__entry');
		await expect(entry).toContainText('Category');
		await expect(entry).toContainText('All Records');
		await entry.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog.locator('.category-accordion__card-title-prefix')).toHaveText([
			'Weiser', 'Telysta', 'Rhaelysa', 'Alice', 'Sylvaena', 'Rhaelysa', 'Weiser',
		]);
		await expect(dialog.locator('.category-accordion__card-title-name')).toHaveText([
			'Manuscript', 'Collection', 'Letters', 'Reading', 'Life', 'Portrait', 'Notes',
		]);
		await page.evaluate(() => document.fonts.ready);
		await page.screenshot({ path: testInfo.outputPath('category-collapsed.png'), animations: 'disabled' });
		const firstCard = dialog.locator('.category-accordion__card').first();
		await expect(firstCard).toHaveAttribute('data-foil', 'starlight');
		const starlight = await firstCard.locator('.category-accordion__card-inner').evaluate(el => getComputedStyle(el, '::before').backgroundImage);
		const aurora = await dialog.locator('.category-accordion__card').nth(1).locator('.category-accordion__card-inner').evaluate(el => getComputedStyle(el, '::before').backgroundImage);
		expect(starlight).not.toBe(aurora);
		await firstCard.click();
		await expect(firstCard).toHaveAttribute('aria-pressed', 'true');
		await expect(firstCard.locator('.category-accordion__card-copy')).toContainText('Weiser 的手稿');
		await expect(firstCard.locator('.category-accordion__card-copy')).toContainText(/\d+ records/);
		await page.screenshot({ path: testInfo.outputPath('category-expanded.png'), animations: 'disabled' });
		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
		await expect(entry).toBeFocused();
		await entry.press('Enter');
		const letters = dialog.getByRole('button', { name: /^静默书简，/ });
		await letters.focus();
		await letters.press('Enter');
		await expect(letters).toHaveAttribute('aria-pressed', 'true');
		await letters.press('Enter');
		await expect(page).toHaveURL(/\/blog\/category\/letters\/$/);
		await expect(page.locator('.category-accordion__entry-title')).toHaveText("Rhaelysa's Letters");
		await expect(page.getByRole('link', { name: 'Lamy2000的使用体验', exact: true })).toBeVisible();
		await expect(page.locator('article a[href="/blog/category/letters/"]')).toContainText('letters');
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	});
}

test('全部分类页及返回总览的入口使用英文题签', async ({ page }) => {
	for (const [id, label] of Object.entries({
		manuscript: "Weiser's Manuscript", collection: "Telysta's Collection", letters: "Rhaelysa's Letters",
		reading: "Alice's Reading", life: "Sylvaena's Life", portraits: "Rhaelysa's Portrait", notes: "Weiser's Notes",
	})) {
		await page.goto(`/blog/category/${id}/`);
		await expect(page.locator('.category-accordion__entry-label')).toHaveText('Category');
		await expect(page.locator('.category-accordion__entry-title')).toHaveText(label);
	}
	await page.locator('.category-accordion__entry').click();
	await page.getByRole('dialog').getByRole('link', { name: 'All Records', exact: true }).click();
	await expect(page).toHaveURL(/\/blog\/?$/);
	await expect(page.locator('.category-accordion__entry-title')).toHaveText('All Records');
});

for (const width of [320, 390, 768, 1440]) {
	test(`Category / Series 对齐且无横向溢出：${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		for (const route of ['/blog/', '/blog/category/manuscript/']) {
			await page.goto(route);
			await page.evaluate(() => document.fonts.ready);
			const category = page.locator('.category-accordion__entry-label');
			const series = page.locator('.blog-series-link span').first();
			const left = (await category.boundingBox())!;
			const right = (await series.boundingBox())!;
			expect(Math.abs(left.y - right.y), '两个入口的标签应处于同一高度').toBeLessThan(1);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		}
	});
}

test('资源看图器接收真实键盘切换与 Escape', async ({ page }, testInfo) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.goto('/resources/');
	await page.getByRole('link', { name: '查看资源：Telysta · 克里诺林裙', exact: true }).click();
	await expect(page.locator('.pswp')).toBeVisible();
	await page.keyboard.press('ArrowRight');
	await expect(page.locator('#resource-lightbox-title')).toContainText('2 / 2');
	const activeImage = page.locator('.pswp img[src$="telysta_crinoline_design.webp"]');
	await expect(activeImage).toBeInViewport();
	await expect.poll(() => activeImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0), { timeout: 20_000 }).toBe(true);
	await page.screenshot({ path: testInfo.outputPath('lightbox.png') });
	await page.keyboard.press('Escape');
	await expect(page.locator('.pswp')).toHaveCount(0);
	expect(errors).toEqual([]);
});
