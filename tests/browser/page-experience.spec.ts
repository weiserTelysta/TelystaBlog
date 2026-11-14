import { test, expect } from '@playwright/test';

const article = '/blog/WEISER1cb3c69c6556/';
const pages = ['/about/', '/blog/', '/gallery/', '/ebooks/', '/series/', '/series/byzantine-civilization/', article];

test('首页四个入口使用作者确认的中英文名称与文案', async ({ page }) => {
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	const navigation = page.locator('.home-section--resources');
	const items = [
		['见我', 'Marginalia', '我见我知，予言予闻。', '/about/'],
		['画廊', 'Gallery', '笔已经自己在画了！', '/gallery/'],
		['书室', 'Library', '电子书是人类进步的电梯。', '/ebooks/'],
		['世界观', 'Annals', '一些过去的故事。', 'https://annals.telysta.com'],
	];
	for (const [label, kind, description, href] of items) {
		const link = navigation.getByRole('link', { name: new RegExp(`^${label}`) });
		await expect(link).toHaveAttribute('href', href);
		await expect(link.locator('.home-section__link-kind')).toHaveText(kind);
		await expect(link).toContainText(description);
	}
});

for (const width of [390, 1440]) {
	test(`页面主标题与文章共用字号，${width}px 下没有横向溢出`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		const sizes = [];
		for (const path of pages) {
			await page.goto(path, { waitUntil: 'domcontentloaded' });
			const heading = page.getByRole('heading', { level: 1 });
			await expect(heading).toBeVisible();
			if (path === '/ebooks/') {
				await expect(heading).toHaveClass('ebook-sr-only');
				continue;
			}
			sizes.push(await heading.evaluate(el => {
				const s = getComputedStyle(el);
				return { font: parseFloat(s.fontSize), line: parseFloat(s.lineHeight) };
			}));
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
			if (['/about/', '/gallery/', '/ebooks/'].includes(path)) {
				await page.screenshot({ path: testInfo.outputPath(`${path.split('/')[1]}-${width}.png`) });
			}
		}
		for (const size of sizes) {
			expect(size.font).toBeCloseTo(width === 1440 ? 40 : 30.4, 1);
			expect(size.line).toBeCloseTo(size.font * 1.2, 1);
		}
	});
}

test('站内导航后正文原位淡入，初始、中间与结束位置稳定', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await page.addInitScript(() => {
		document.addEventListener('DOMContentLoaded', () => {
			const shell = document.querySelector<HTMLElement>('.site-shell');
			if (!shell) return;
			const animation = shell.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === 'site-page-enter');
			if (!animation) return;
			animation.pause();
			const duration = Number(animation.effect!.getTiming().duration);
			const frames = [0, duration / 2, duration].map(time => {
				animation.currentTime = time;
				const s = getComputedStyle(shell);
				return { opacity: Number(s.opacity), transform: s.transform, x: shell.getBoundingClientRect().x };
			});
			(shell as HTMLElement & { entryFrames: typeof frames }).entryFrames = frames;
			animation.finish();
		});
	});
	for (const [label, path] of [['见我', '/about/'], ['画廊', '/gallery/'], ['书室', '/ebooks/']]) {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await page.locator('.home-section--resources').getByRole('link', { name: new RegExp(`^${label}`) }).click();
		await expect(page).toHaveURL(new RegExp(`${path}$`));
		const frames = await page.locator('.site-shell').evaluate(el => (el as HTMLElement & { entryFrames: { opacity: number; transform: string; x: number }[] }).entryFrames);
		expect(frames).toHaveLength(3);
		expect(frames[0].opacity).toBe(0);
		expect(frames[1].opacity).toBeGreaterThan(0);
		expect(frames[1].opacity).toBeLessThan(1);
		expect(frames[2].opacity).toBe(1);
		for (const frame of frames) {
			expect(frame.transform).toBe('none');
			expect(frame.x).toBe(frames[0].x);
		}
		await expect(page.locator('h1')).toBeVisible();
	}
});

test('减少动态效果时所有站内页面立即显示', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	for (const path of pages) {
		await page.goto(path, { waitUntil: 'domcontentloaded' });
		const shell = page.locator('.site-shell');
		expect(await shell.evaluate(el => ({ animation: getComputedStyle(el).animationName, opacity: getComputedStyle(el).opacity }))).toEqual({ animation: 'none', opacity: '1' });
		await expect(page.locator('h1')).toBeVisible();
	}
});
