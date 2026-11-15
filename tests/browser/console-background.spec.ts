import { test, expect } from '@playwright/test';
import { createPlatformFixture } from '../helpers/platform-fixture.mjs';

test('登录状态接口缓慢时星空先出现，表单凭据不进入查询字符串', async ({ page }) => {
 const fixture = await createPlatformFixture();
 let resume!: () => void;
 const pending = new Promise<void>(resolve => { resume = resolve; });
 try {
  await fixture.attach(page.context());
  await page.context().route('https://telysta.com/console/api/auth/session', async route => {
   await pending;
   await route.fallback();
  });
  await page.goto('https://telysta.com/console/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#loading')).toBeVisible();
  await expect.poll(() => page.locator('#account-starfield canvas').evaluate((node: HTMLCanvasElement) => node.width)).toBeGreaterThan(0);
  resume();
  await expect(page.getByRole('heading', { name: '登录', exact: true })).toBeVisible();
  await expect(page.locator('#login-form')).toHaveAttribute('method', 'post');
 } finally { resume(); await fixture.mf.dispose(); }
});

test('登录星空遵守减少动态、隐藏暂停与页面生命周期，表单始终可操作', async ({ page }) => {
 test.setTimeout(60_000);
 const fixture = await createPlatformFixture();
 try {
  await fixture.attach(page.context());
  await page.addInitScript(() => {
   (window as any).starPaints = 0;
   const fill = CanvasRenderingContext2D.prototype.fillRect;
   CanvasRenderingContext2D.prototype.fillRect = function (...args) {
    if (this.canvas.closest('#account-starfield')) (window as any).starPaints++;
    return fill.apply(this, args);
   };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('https://telysta.com/console/');
  await expect(page.getByRole('heading', { name: '登录', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).starPaints)).toBeGreaterThan(0);
  const paints = () => page.evaluate(() => (window as any).starPaints);
  const frozen = await paints();
  await page.getByLabel('邮箱', { exact: true }).fill('reader@example.com');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '获取验证码', exact: true })).toBeFocused();
  await page.waitForTimeout(250);
  expect(await paints()).toBe(frozen);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(paints).toBeGreaterThan(frozen + 2);
  await page.evaluate(() => {
   Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
   document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = await paints();
  await page.waitForTimeout(200);
  expect(await paints()).toBe(hidden);
  await page.evaluate(() => {
   Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
   document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(paints).toBeGreaterThan(hidden);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  const stopped = await paints();
  await page.waitForTimeout(200);
  expect(await paints()).toBe(stopped);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect.poll(paints).toBeGreaterThan(stopped);
 } finally { await fixture.mf.dispose(); }
});

for (const width of [390, 1440]) test(`画廊直接进入筛选与作品，页面名称保留语义：${width}px`, async ({ page }, testInfo) => {
 await page.setViewportSize({ width, height: 900 });
 await page.emulateMedia({ reducedMotion: 'reduce' });
 await page.goto('/gallery/');
 const title = page.getByRole('heading', { name: '画廊', exact: true });
 await expect(title).toHaveCount(1);
 expect(await title.evaluate(node => node.getBoundingClientRect().height)).toBe(1);
 await expect(page.locator('.resource-hero__eyebrow')).toHaveCount(0);
 const filters = page.locator('.resource-filters');
 await expect(filters).toBeVisible();
 await expect(page.locator('.resource-card').first()).toBeInViewport();
 await expect(page.locator('.resource-card').first()).toHaveCSS('opacity', '1');
 await page.locator('.resource-card img').first().evaluate((image: HTMLImageElement) => image.decode());
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.screenshot({ path: testInfo.outputPath(`gallery-content-${width}.png`) });
});
