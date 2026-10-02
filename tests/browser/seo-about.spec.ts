import { test, expect } from '@playwright/test';

test('robots 与 sitemap 指向可抓取的正式页面，元信息与 JSON-LD 一致', async ({ request }) => {
	const robots = await request.get('/robots.txt');
	expect(robots.ok()).toBe(true);
	expect(await robots.text()).toContain('Sitemap: https://telysta.com/sitemap-index.xml');
	const index = await request.get('/sitemap-index.xml');
	expect(index.ok()).toBe(true);
	const sitemap = await request.get('/sitemap-0.xml');
	const xml = await sitemap.text();
	const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
	expect(urls).toContain('https://telysta.com/about/');
	expect(urls).not.toContain('https://telysta.com/blog/search-index.json');
	expect(new Set(urls).size).toBe(urls.length);
	for (const url of urls) {
		const response = await request.get(new URL(url).pathname);
		expect(response.status(), url).toBe(200);
		const html = await response.text();
		expect(html, url).toContain(`rel="canonical" href="${url}"`);
		expect(html, url).toMatch(/<title>[^<]+<\/title>/);
		expect(html, url).toMatch(/name="description" content="[^"]+"/);
		const json = html.match(/<script type="application\/ld\+json">([^]*?)<\/script>/)?.[1];
		expect(json, url).toBeTruthy();
		const data = JSON.parse(json!);
		expect(data['@graph'].some((node: { url?: string }) => node.url === url)).toBe(true);
	}
});

test('About 与首页身份说明不依赖 JavaScript，入口与资源同级', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
	try {
		const page = await context.newPage();
		await page.goto('/');
		await expect(page.getByText('telysta.com 是 Weiser 的个人主页与博客', { exact: false })).toBeVisible();
		const links = page.locator('.home-section__links');
		await expect(links.getByRole('link', { name: /Resource Index/ })).toBeVisible();
		await links.getByRole('link', { name: /^About/ }).click();
		await expect(page).toHaveURL(/\/about\/$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('About');
		await expect(page.locator('.prose')).toContainText('我是 Weiser');
		await expect(page.locator('.prose')).toContainText('原创角色');
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		const contact = page.getByRole('link', { name: 'weiser@telysta.com', exact: true });
		await contact.focus();
		await expect(contact).toBeFocused();
		await page.screenshot({ path: '.tmp/seo-2026-10-02/about-mobile.png', fullPage: true });
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.screenshot({ path: '.tmp/seo-2026-10-02/about-desktop.png', fullPage: true });
	} finally { await context.close(); }
});
