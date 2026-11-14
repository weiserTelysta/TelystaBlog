import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
	test(`真实书室按中图法分页，原生链接与详情可用：${width}px`, async ({ browser, baseURL }, testInfo) => {
		const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
		const page = await context.newPage();
		const requestedBooks: string[] = [];
		page.on('request', request => { if (request.url().startsWith('https://library-files.telysta.com/books/')) requestedBooks.push(request.url()); });
		try {
			await page.goto('/ebooks/', { waitUntil: 'domcontentloaded' });
			await expect(page.locator('h1')).toHaveText('书室');
			await expect(page.locator('.ebook-card')).toHaveCount(24);
			expect(requestedBooks).toEqual([]);
			await expect(page.locator('.ebook-grid')).toHaveCSS('grid-template-columns', width === 1440 ? /^\S+ \S+ \S+ \S+$/ : /^\S+$/);
			const firstPage = await page.locator('.ebook-card h2 a').evaluateAll(links => links.map(link => link.getAttribute('href')));
			await page.getByRole('link', { name: '下一页 →' }).click();
			await expect(page).toHaveURL(/\/ebooks\/page\/2\/$/);
			const secondPage = await page.locator('.ebook-card h2 a').evaluateAll(links => links.map(link => link.getAttribute('href')));
			expect(firstPage.some(href => secondPage.includes(href))).toBe(false);
			await page.locator('.ebook-classification summary').click();
			await page.getByRole('link', { name: /^B · 哲学、宗教/ }).click();
			await expect(page).toHaveURL(/\/ebooks\/clc\/B\/$/);
			await expect(page.locator('.ebook-classification summary')).toContainText('哲学、宗教');
			await expect(page.locator('.ebook-pagination')).toContainText('137');
			await page.goto('/ebooks/WEISER8cf630042445/', { waitUntil: 'domcontentloaded' });
			await expect(page.locator('h1')).toHaveText('伯里曼人体结构绘画教学（最新版）');
			await expect(page.locator('dl')).toContainText('乔治·伯里曼');
			await expect(page.getByRole('link', { name: /下载.*（PDF）/ })).toHaveAttribute('href', /^https:\/\/library-files\.telysta\.com\/books\/.+\.pdf$/);
			await page.goto('/ebooks/WEISERd073e41fae03/', { waitUntil: 'domcontentloaded' });
			await expect(page.locator('.ebook-detail__cover.ebook-cover-placeholder')).toBeVisible();
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
			expect(requestedBooks).toEqual([]);
			await page.screenshot({ path: testInfo.outputPath(`library-${width}.png`) });
		} finally { await context.close(); }
	});
}

for (const width of [320, 1440]) {
	test(`格式菜单保持站内样式、键盘关闭与边缘定位：${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/ebooks/', { waitUntil: 'domcontentloaded' });
		const trigger = page.getByLabel('筛选文件格式', { exact: true });
		const picker = page.locator('[data-format-picker]');
		await trigger.click();
		await expect(picker).toHaveAttribute('open');
		const menu = page.locator('.ebook-format-menu');
		await expect(menu).toBeVisible();
		await expect.poll(async () => (await menu.boundingBox())!.x).toBeGreaterThanOrEqual(0);
		const bounds = (await menu.boundingBox())!;
		expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
		await expect(page.locator('select')).toHaveCount(0);
		await page.screenshot({ path: testInfo.outputPath(`format-menu-${width}.png`) });
		await page.getByRole('radio', { name: 'PDF', exact: true }).check();
		await expect(picker).not.toHaveAttribute('open');
		await expect(trigger).toContainText('PDF');
		await expect(trigger).toBeFocused();
		await page.keyboard.press('Enter');
		await page.keyboard.press('Tab');
		await page.keyboard.press('ArrowDown');
		await expect(trigger).toContainText('EPUB');
		await expect(trigger).toBeFocused();
		await page.keyboard.press('Enter');
		await page.keyboard.press('Escape');
		await expect(picker).not.toHaveAttribute('open');
		await expect(trigger).toBeFocused();
		await trigger.click();
		await page.mouse.click(4, 120);
		await expect(picker).not.toHaveAttribute('open');
	});
}

test('搜索按全库和书单范围筛选、格式可组合、编号页可直达', async ({ page }) => {
	let indexRequests = 0;
	page.on('request', request => { if (request.url().endsWith('/ebooks/search-index.json')) indexRequests++; });
	await page.goto('/ebooks/', { waitUntil: 'domcontentloaded' });
	await expect(page.locator('[data-shelf-search]')).toBeVisible();
	expect(indexRequests).toBe(0);
	await expect(page.locator('.ebook-header')).toHaveCount(0);
	await expect(page.locator('.ebook-classification')).not.toHaveAttribute('open');
	await page.getByRole('searchbox', { name: '搜索书名或作者' }).fill('玛拉兹英灵录 卷二');
	await expect(page.locator('.ebook-card')).toHaveCount(1);
	await expect(page.locator('.ebook-card h2')).toHaveText('玛拉兹英灵录 卷二：死屋之门');
	await page.getByLabel('筛选文件格式', { exact: true }).click();
	await page.getByRole('radio', { name: 'PDF', exact: true }).check();
	await expect(page.locator('.ebook-card')).toHaveCount(0);
	await page.getByLabel('筛选文件格式', { exact: true }).click();
	await page.getByRole('radio', { name: 'EPUB', exact: true }).check();
	await expect(page.locator('.ebook-card')).toHaveCount(1);
	expect(indexRequests).toBe(1);
	await page.getByRole('searchbox').fill('Private Pleasures');
	await expect(page.locator('.ebook-card')).toHaveCount(0);
	await page.goto('/ebooks/clc/K/?q=Private+Pleasures', { waitUntil: 'domcontentloaded' });
	await expect(page.locator('[data-search-status]')).toContainText('找到 0');
	await expect(page.locator('.ebook-card')).toHaveCount(0);
	await page.getByRole('link', { name: /印度 K351/ }).click();
	await expect(page).toHaveURL(/\/ebooks\/booklists\/K351\/$/);
	await page.getByRole('searchbox').fill('Private Pleasures');
	await expect(page.locator('.ebook-card')).toHaveCount(1);
	await page.goto('/ebooks/', { waitUntil: 'domcontentloaded' });
	await page.getByLabel('跳转页码').fill('3');
	await page.getByRole('button', { name: '前往' }).click();
	await expect(page).toHaveURL(/\/ebooks\/page\/3\/$/);
	await page.getByRole('link', { name: '第 27 页', exact: true }).click();
	await expect(page).toHaveURL(/\/ebooks\/page\/27\/$/);
	await expect(page.locator('.ebook-card')).toHaveCount(15);
});

for (const width of [390, 1440]) {
	test(`封面放大且书名作者格式对齐，详情不重复信息：${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/ebooks/', { waitUntil: 'domcontentloaded' });
		const positions = await page.locator('.ebook-card').evaluateAll(cards => cards.slice(0, 6).map(card => {
			const y = card.getBoundingClientRect().top;
			return {
				title: card.querySelector('h2')!.getBoundingClientRect().top - y,
				authors: card.querySelector('.ebook-card__authors')!.getBoundingClientRect().top - y,
				formats: card.querySelector('.ebook-formats')!.getBoundingClientRect().top - y,
				coverWidth: card.querySelector('.ebook-card__cover')!.getBoundingClientRect().width,
			};
		}));
		for (const position of positions) {
			expect(position.title).toBeCloseTo(positions[0].title, 1);
			expect(position.authors).toBeCloseTo(positions[0].authors, 1);
			expect(position.formats).toBeCloseTo(positions[0].formats, 1);
			expect(position.coverWidth).toBeGreaterThanOrEqual(100);
		}
		const title = page.locator('.ebook-card h2 a').first();
		await expect(title).toHaveAttribute('title', (await title.textContent())!);
		await page.screenshot({ path: testInfo.outputPath(`shelf-refined-${width}.png`) });
		await page.goto('/ebooks/WEISER82d055db40bc/', { waitUntil: 'domcontentloaded' });
		await expect(page.locator('h1')).toHaveText('玛拉兹英灵录 卷二：死屋之门');
		await expect(page.locator('.ebook-header p')).toHaveCount(0);
		await expect(page.locator('dl')).toContainText('译者');
		await expect(page.locator('dd').filter({ hasText: /^Jass$/ })).toHaveCount(1);
		expect(await page.locator('.ebook-detail__cover').evaluate(el => el.getBoundingClientRect().width)).toBe(width === 1440 ? 240 : 200);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		await page.screenshot({ path: testInfo.outputPath(`detail-refined-${width}.png`) });
	});
}
