import { test, expect } from '@playwright/test';

const routes = [
	['/blog/portraits/serava/2026-9-29-serava的设计理念/', '/blog/portraits/mirelle/2026-9-29-mirelle的设计理念/'],
	['/blog/portraits/serava/2026-7-2-神戸新一的skeb委托/', '/blog/portraits/mirelle/2026-7-2-神戸新一的skeb委托/'],
	['/series/serava-notes/', '/series/mirelle-notes/'],
];

test('Mirelle routes replace old names in navigation, search and sitemap', async ({ page, request }) => {
	const sitemap = await (await request.get('/sitemap-0.xml')).text();
	expect(sitemap).not.toMatch(/serava|severa|sevara/i);
	const search = await (await request.get('/blog/search-index.json')).text();
	expect(search).not.toMatch(/serava|severa|sevara/i);
	for (const [oldPath, newPath] of routes) {
		await page.goto(oldPath);
		await expect.poll(() => decodeURI(new URL(page.url()).pathname)).toBe(newPath);
		const canonical = await page.locator('link[rel=canonical]').getAttribute('href');
		expect(decodeURI(canonical!)).toBe('https://telysta.com' + newPath);
		expect(decodeURI(sitemap)).toContain('https://telysta.com' + newPath);
	}
	await page.goto('/series/');
	await expect(page.getByRole('link', { name: /Mirelle 札记/ })).toHaveAttribute('href', '/series/mirelle-notes/');
	await page.goto('/series/mirelle-notes/');
	await expect(page.locator('.article-post-list a').first()).toHaveAttribute('href', routes[0][1]);
	await page.goto('/blog/portraits/sylvaena/2026-9-24-コクノコ委托/');
	await expect(page.locator('.prose')).toContainText('Sylvaena');
});

test('Mirelle identity loads the matching avatar and local favicon', async ({ page }) => {
	await page.addInitScript(() => sessionStorage.setItem('telysta:visit-profile', 'mirelle'));
	await page.goto('/');
	await expect(page.locator('img[alt="Mirelle avatar"]')).toHaveAttribute('src', /Profile_Mirelle/);
	await expect(page.locator('link[rel=icon]')).toHaveAttribute('href', /mirelle-48\.png/);
});
