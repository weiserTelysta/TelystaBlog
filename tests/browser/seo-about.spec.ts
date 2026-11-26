import { test, expect } from '@playwright/test';
import { HOME_SECTIONS } from '../../src/config/pages/home';

test('robots 与 sitemap 指向可抓取的正式页面，元信息与 JSON-LD 一致', async ({ request }) => {
	const robots = await request.get('/robots.txt');
	expect(robots.ok()).toBe(true);
	const rules = await robots.text();
	expect(rules).toContain('Sitemap: https://telysta.com/sitemap.xml');
	const general = rules.split('\n\n').find(group => group.startsWith('User-agent: *'));
	expect(general).toContain('Crawl-delay: 5');
	for (const excludedPath of ['/console', '/telysta-console', '/ebooks/WEISER', '/ebooks/read']) {
		expect(general).toContain(`Disallow: ${excludedPath}`);
	}
	const sitemap = await request.get('/sitemap.xml');
	expect(sitemap.ok()).toBe(true);
	const xml = await sitemap.text();
	const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
	expect(urls).toContain('https://telysta.com/about/');
	expect(urls).not.toContain('https://telysta.com/blog/search-index.json');
	expect(urls.filter(url => url.startsWith('https://telysta.com/ebooks/'))).toEqual(['https://telysta.com/ebooks/']);
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

test('About 与作者首页文案不依赖 JavaScript，入口与资源同级', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
	try {
		const page = await context.newPage();
		await page.goto('/');
		const intro = HOME_SECTIONS.find(section => section.type === 'profile')!;
		for (const paragraph of intro.description) {
			await expect(page.getByText(paragraph, { exact: true })).toBeVisible();
		}
		const links = page.locator('.home-section__links');
		await expect(links.getByRole('link', { name: /^画廊/ })).toBeVisible();
		const profile = links.getByRole('link', { name: /^见我/ });
		await expect(profile.locator('.home-section__link-kind')).toHaveText('Marginalia');
		await profile.focus();
		await expect(profile).toBeFocused();
		await profile.click();
		await expect(page).toHaveURL(/\/about\/$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('见我');
		await expect(page.locator('.prose')).toContainText('我是 Weiser');
		await expect(page.locator('.prose')).toContainText('来自中国宁波');
		await expect(page.locator('.prose')).toContainText('深圳大学');
		await expect(page.locator('.prose')).toContainText('管理学学士');
		await expect(page.locator('.prose')).toContainText('拉丁语');
		await expect(page.locator('.prose h2, .prose ul')).toHaveCount(0);
		const illustration = page.locator('.markdown-page__illustration');
		await expect(illustration).toHaveAttribute('alt', '');
		await expect(illustration).toHaveCSS('width', '80px');
		await expect.poll(() => illustration.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

		await page.screenshot({ path: '.tmp/seo-2026-10-02/about-mobile.png', fullPage: true });
		await page.setViewportSize({ width: 1440, height: 1000 });
		await expect(illustration).toHaveCSS('width', '160px');
		const prose = await page.locator('.markdown-page .prose').boundingBox();
		const art = await illustration.boundingBox();
		expect(art!.x).toBeGreaterThan(prose!.x + prose!.width);
		expect(Math.abs(art!.y + art!.height - prose!.y - prose!.height)).toBeLessThan(8);
		await page.screenshot({ path: '.tmp/seo-2026-10-02/about-desktop.png', fullPage: true });
	} finally { await context.close(); }
});
