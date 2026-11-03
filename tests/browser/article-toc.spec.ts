import { expect, test, type Page } from '@playwright/test';
import { permalinkFor } from '../helpers/post-routes';

const route = permalinkFor('/blog/reading/history/2026-11-3-拜占庭的赠礼/');
const drawer = '[data-article-toc-disclosure]';
const panel = '[data-article-toc-panel]';
const list = '[data-article-toc-list]';
const trigger = `${drawer} summary`;
const entry = (slug: string) => `[data-toc-link="${slug}"]`;

async function openToc(page: Page) {
	await page.goto(route);
	await page.evaluate(() => document.fonts.ready);
	await page.locator(trigger).hover();
	await expect(page.locator(drawer)).not.toHaveAttribute('open');
	await expect(page.locator(panel)).toBeHidden();
	await page.locator(trigger).click();
	await expect(page.locator(panel)).toHaveCSS('opacity', '1');
}

async function expectAtHeading(page: Page, slug: string) {
	await expect.poll(() => page.evaluate(id => {
		const heading = document.getElementById(id)!;
		const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-clearance'));
		return Math.abs(heading.getBoundingClientRect().top - offset);
	}, slug)).toBeLessThan(2);
	await expect(page.locator('[data-toc-link][aria-current="location"]')).toHaveAttribute('data-toc-link', slug);
}

for (const width of [390, 1440]) {
	test(`${width}px 目录点击后原位淡入淡出，连续切换不残留滚动锁`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await openToc(page);
		const openLeft = await page.locator(panel).evaluate(el => el.getBoundingClientRect().left);
		if (width >= 1360) {
			const contentRight = await page.locator('[data-article-content]').evaluate(el => el.getBoundingClientRect().right);
			expect(openLeft).toBeGreaterThan(contentRight);
		}
		await page.screenshot({ path: testInfo.outputPath(`toc-${width}.png`) });
		await page.locator(trigger).click();
		// Freeze CSS transitions at their midpoint, including the native details
		// content-visibility transition; an invisible close animation is a regression.
		const closing = await page.locator(drawer).evaluate(el => {
			for (const animation of el.getAnimations({ subtree: true })) {
				if (!(animation instanceof CSSTransition)) continue;
				animation.pause();
				animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
			}
			const content = el.querySelector<HTMLElement>('[data-article-toc-panel]')!;
			return {
				visibility: getComputedStyle(el, '::details-content').contentVisibility,
				opacity: Number(getComputedStyle(content).opacity),
				left: content.getBoundingClientRect().left,
				transform: getComputedStyle(content).transform,
			};
		});
		expect(closing.visibility).toBe('visible');
		expect(closing.opacity).toBeGreaterThan(0);
		expect(closing.opacity).toBeLessThan(1);
		expect(closing.left).toBeCloseTo(openLeft, 5);
		expect(closing.transform).toBe('none');
		await page.locator(drawer).evaluate(el => el.getAnimations({ subtree: true }).forEach(a => a.play()));
		await expect(page.locator(panel)).toBeHidden();
		await page.locator(trigger).click();
		const opening = await page.locator(panel).evaluate(el => {
			const transition = el.getAnimations().find(a => a instanceof CSSTransition && a.transitionProperty === 'opacity');
			if (!transition) throw new Error('Missing drawer entry transition');
			transition.pause();
			transition.currentTime = Number(transition.effect!.getTiming().duration) / 2;
			const frame = { left: el.getBoundingClientRect().left, opacity: Number(getComputedStyle(el).opacity) };
			transition.play();
			return frame;
		});
		expect(opening.left).toBeCloseTo(openLeft, 5);
		expect(opening.opacity).toBeGreaterThan(0);
		expect(opening.opacity).toBeLessThan(1);
		// Toggle directly to avoid Playwright waiting for the animated trigger to settle.
		await page.locator(trigger).evaluate(async el => {
			for (let i = 0; i < 3; i++) {
				(el as HTMLElement).click();
				await new Promise(resolve => setTimeout(resolve, 30));
			}
		});
		await expect(page.locator(drawer)).not.toHaveAttribute('open');
		await expect(page.locator(panel)).toBeHidden();
		await expect(page.locator(panel)).toHaveJSProperty('inert', true);
		await expect(page.locator('html')).not.toHaveClass(/is-page-scroll-locked|is-article-toc-overlay-open/);
	});
}

test('点击底部条目时目录平滑上移并露出后续条目，选中状态保持到正文抵达', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 1440, height: 800 });
	await openToc(page);
	const slug = '伊斯兰崛起';
	const link = page.locator(entry(slug));
	// Click the visible bottom entry directly. Locator auto-scrolling would first
	// center it and skip the edge-selection behavior that a reader encounters.
	const bounds = (await link.boundingBox())!;
	const viewport = (await page.locator(list).boundingBox())!;
	expect(bounds.y).toBeGreaterThan(viewport.y + viewport.height * 0.8);
	expect(bounds.y + bounds.height).toBeLessThan(viewport.y + viewport.height);
	const before = await page.locator(list).evaluate(el => el.scrollTop);
	await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
	const during = await page.evaluate(async () => {
		const samples: { slug: string | undefined; top: number; y: number }[] = [];
		const start = performance.now();
		while (performance.now() - start < 1400) {
			samples.push({
				slug: document.querySelector<HTMLElement>('[data-toc-link][aria-current]')?.dataset.tocLink,
				top: document.querySelector<HTMLElement>('[data-article-toc-list]')!.scrollTop,
				y: scrollY,
			});
			await new Promise(requestAnimationFrame);
		}
		return samples;
	});
	expect(new Set(during.map(s => s.slug))).toEqual(new Set([slug]));
	expect(new Set(during.map(s => s.top)).size).toBeGreaterThan(5);
	expect(during.at(-1)!.top).toBeGreaterThan(before + 100);
	expect(new Set(during.map(s => s.y)).size).toBeGreaterThan(5);
	await expectAtHeading(page, slug);
	const position = await link.evaluate(el => {
		const bounds = el.getBoundingClientRect();
		const viewport = el.closest('[data-article-toc-list]')!.getBoundingClientRect();
		return ((bounds.top + bounds.bottom) / 2 - viewport.top) / viewport.height;
	});
	expect(position).toBeGreaterThan(0.24);
	expect(position).toBeLessThan(0.68);
	await expect(page.locator(entry('智慧宫'))).toBeInViewport();
	await expect(link).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
	expect(await link.evaluate(el => getComputedStyle(el, '::before').content)).toBe('none');
	await expect(link).toHaveCSS('font-weight', '550');
	await page.screenshot({ path: testInfo.outputPath('toc-bottom-selection.png') });
	// A nearby entry is now comfortably visible and needs no further recentering.
	const settledTop = await page.locator(list).evaluate(el => el.scrollTop);
	await page.locator(entry('倭马亚王朝阿巴斯王朝')).click();
	await expectAtHeading(page, '倭马亚王朝阿巴斯王朝');
	expect(await page.locator(list).evaluate(el => el.scrollTop)).toBe(settledTop);
});

test('阅读时目录平滑跟随，鼠标查看目录时不抢走滚动位置', async ({ page }) => {
	await openToc(page);
	await page.mouse.move(700, 500);
	const positions = await page.evaluate(async () => {
		const toc = document.querySelector<HTMLElement>('[data-article-toc-list]')!;
		const heading = document.getElementById('伊斯兰哲学')!;
		window.scrollTo({ top: heading.getBoundingClientRect().top + scrollY - 28, behavior: 'instant' });
		const values: number[] = [];
		const start = performance.now();
		while (performance.now() - start < 650) {
			values.push(toc.scrollTop);
			await new Promise(requestAnimationFrame);
		}
		return values;
	});
	expect(new Set(positions).size).toBeGreaterThan(5);
	const toc = page.locator(list);
	await toc.hover();
	await toc.evaluate(el => el.scrollTop = 0);
	await page.evaluate(() => {
		const heading = document.getElementById('基辅')!;
		window.scrollTo({ top: heading.getBoundingClientRect().top + scrollY - 28, behavior: 'instant' });
	});
	await expect(page.locator(entry('基辅'))).toHaveAttribute('aria-current', 'location');
	await page.waitForTimeout(300);
	expect(await toc.evaluate(el => el.scrollTop)).toBe(0);
});

test('连续点击与键盘导航以最后一次为准，正文滚轮可打断跳转', async ({ page }) => {
	await openToc(page);
	await page.locator(entry('伊斯兰崛起')).click();
	await page.locator(entry('拜占庭的黑暗时代')).click();
	await expectAtHeading(page, '拜占庭的黑暗时代');
	await page.waitForTimeout(300);
	await expect(page.locator(entry('拜占庭的黑暗时代'))).toHaveAttribute('aria-current', 'location');
	await page.locator(entry('伊斯兰哲学')).click();
	await page.mouse.move(700, 500);
	await page.mouse.wheel(0, -300);
	await expect(page.locator(entry('伊斯兰哲学'))).not.toHaveAttribute('aria-current');
	await page.locator(entry('伊斯兰崛起')).click();
	const slider = page.getByRole('slider', { name: 'Page scroll position' });
	await slider.focus();
	await slider.press('Home');
	await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test('手机目录键盘焦点、Escape、局部滚动与选章后的页面滚动正常', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await openToc(page);
	await expect(page.locator('html')).toHaveClass(/is-page-scroll-locked/);
	await page.keyboard.press('Tab');
	await expect(page.locator('[data-toc-link]').first()).toBeFocused();
	await expect(page.locator('[data-toc-link]').first()).toHaveCSS('outline-style', 'solid');
	const toc = page.locator(list);
	await toc.hover();
	await page.mouse.wheel(0, 400);
	await expect.poll(() => toc.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
	expect(await page.evaluate(() => scrollY)).toBe(0);
	await page.keyboard.press('Escape');
	await expect(page.locator(trigger)).toBeFocused();
	await expect(page.locator(panel)).toBeHidden();
	await page.locator(trigger).press('Enter');
	await expect(page.locator(panel)).toHaveCSS('opacity', '1');
	await page.locator(entry('伊斯兰崛起')).click();
	await expect(page.locator(panel)).toBeHidden();
	await expect(page.locator('html')).not.toHaveClass(/is-page-scroll-locked/);
	await expectAtHeading(page, '伊斯兰崛起');
});

for (const width of [390, 1440]) {
	test(`${width}px 减少动态时目录与正文即时定位`, async ({ page }) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await openToc(page);
		const link = page.locator(entry('伊斯兰崛起'));
		await link.click();
		await expectAtHeading(page, '伊斯兰崛起');
		await expect(page.locator(panel)).toHaveCSS('transition-duration', '0s');
		await expect(link).toHaveCSS('transition-duration', '0s');
		expect(await link.evaluate(el => getComputedStyle(el, '::before').content)).toBe('none');
		expect(await page.locator(drawer).evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	});
}

test('触屏滑动只滚动目录，选章后恢复正文导航', async ({ browser }) => {
	const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
	try {
		const page = await context.newPage();
		await page.goto(`http://127.0.0.1:4322${route}`);
		await page.locator(trigger).tap();
		await expect(page.locator(panel)).toHaveCSS('opacity', '1');
		const session = await context.newCDPSession(page);
		await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 700 }] });
		for (const y of [650, 550, 450, 300]) {
			await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y }] });
		}
		await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		await expect.poll(() => page.locator(list).evaluate(el => el.scrollTop)).toBeGreaterThan(100);
		expect(await page.evaluate(() => scrollY)).toBe(0);
		await page.locator(entry('伊斯兰崛起')).tap();
		await expect(page.locator(panel)).toBeHidden();
		await expectAtHeading(page, '伊斯兰崛起');
	} finally {
		await context.close();
	}
});

test('无 JavaScript 时目录仍可展开并通过原生锚点定位', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
	try {
		const page = await context.newPage();
		await page.goto(`http://127.0.0.1:4322${route}`);
		await page.locator(trigger).click();
		await expect(page.locator(panel)).toHaveCSS('opacity', '1');
		await page.locator(entry('伊斯兰崛起')).click();
		expect(decodeURIComponent(new URL(page.url()).hash)).toBe('#伊斯兰崛起');
	} finally {
		await context.close();
	}
});
