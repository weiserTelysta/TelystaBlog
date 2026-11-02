import { expect, test } from '@playwright/test';
import { readPostLinkIndex } from '../../scripts/lib/post-link-index.mjs';
import { buildPostRedirects } from '../../src/lib/postLinks.mjs';
import { permalinkFor } from '../helpers/post-routes';

const index = readPostLinkIndex();
const byzantium = permalinkFor('/blog/reading/history/2026-11-3-拜占庭的赠礼/');

test('所有公开文章、搜索与 sitemap 使用短编号，全部旧文件名地址直接跳转且保留评论键', async ({ request }) => {
	const sitemap = await (await request.get('/sitemap-0.xml')).text();
	const search = await (await request.get('/blog/search-index.json')).json();
	for (const post of index.posts) {
		if (post.data.draft === true) continue;
		expect(post.href).toMatch(/^\/blog\/WEISER[0-9a-f]{12}\/$/);
		const response = await request.get(post.href);
		expect(response.status(), post.file).toBe(200);
		const html = await response.text();
		expect(html).toContain(`rel="canonical" href="https://telysta.com${post.href}"`);
		expect(html).toContain('data-mapping="specific"');
		expect(html).toContain(`data-term="${encodeURI(post.data.commentId ?? post.id)}"`);
		expect(sitemap).toContain(`https://telysta.com${post.href}`);
		expect(search.some((item: { href: string }) => item.href === post.href)).toBe(true);
	}
	for (const [oldPath, target] of Object.entries(buildPostRedirects(index))) {
		const response = await request.get(oldPath);
		expect(response.status(), oldPath).toBe(200);
		const html = await response.text();
		expect(html).toMatch(/http-equiv="refresh"/i);
		expect(html).toContain(target);
		expect(decodeURI(sitemap)).not.toContain(`https://telysta.com${oldPath}<`);
	}
});

for (const width of [390, 1440]) {
	test(`拜占庭文明史系列与长篇阅读保留现有版式：${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.route('https://giscus.app/**', route => route.abort());
		await page.goto('/series/byzantine-civilization/');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('拜占庭文明史');
		const link = page.locator('.article-post-list a');
		await expect(link).toHaveAttribute('href', byzantium);
		await link.focus();
		await expect(link).toHaveCSS('outline-style', 'solid');
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(new URL(byzantium, page.url()).href);
		await expect(page.locator('h1')).toHaveText('拜占庭的赠礼');
		await expect(page.locator('[data-article-content]')).toContainText('拜占庭与伊斯兰');
		await expect(page.locator('.article-series__link')).toHaveAttribute('href', '/series/byzantine-civilization/');
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		await page.screenshot({ path: testInfo.outputPath('byzantium-reading.png') });
	});
}
