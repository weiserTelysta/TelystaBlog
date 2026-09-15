import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { adminBrowserFixture as adminFixture } from '../helpers/admin-browser-fixture';

test('本地表单保存、冲突保留输入、Markdown 与素材入口', async ({ page }) => {
	const fixture = await adminFixture();
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	try {
		await page.goto(fixture.url);
		await expect(
			page.getByRole('heading', { name: '站点身份', exact: true }),
		).toBeVisible();
		await page
			.getByRole('button', { name: 'Hero 欢迎语', exact: true })
			.click();
		const greeting = page
			.getByRole('textbox', { name: '句子', exact: true })
			.first();
		await greeting.fill('新的欢迎语\n保留换行');
		await page
			.getByRole('button', { name: '查看保存差异', exact: true })
			.click();
		await expect(page.getByRole('status')).toContainText('尚未写入');
		await page.getByRole('button', { name: '保存到本地', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('已保存到本地');
		await page.getByRole('button', { name: '按此小时试抽一句' }).click();
		await expect(page.locator('main > .text-preview')).not.toContainText(
			'试抽样使用',
		);
		const file = path.join(fixture.root, 'src/config/pages/homeGreetings.ts');
		expect(await fs.readFile(file, 'utf8')).toContain('新的欢迎语\\n保留换行');
		await fs.appendFile(file, '\n// external edit\n');
		await greeting.fill('冲突中的输入');
		await page.getByRole('button', { name: '保存到本地', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('文件已变化');
		await expect(greeting).toHaveValue('冲突中的输入');
		expect(await fs.readFile(file, 'utf8')).toContain('// external edit');
		page.once('dialog', (dialog) => dialog.accept());
		await page.getByRole('button', { name: '系列与文章', exact: true }).click();
		await page.getByRole('button', { name: /测试文章/ }).click();
		const editor = page.getByRole('textbox', { name: 'Markdown 源码' });
		await editor.fill((await editor.inputValue()) + '\n补充文字。');
		await page.getByRole('button', { name: '保存文章', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('文章已保存');
		expect(
			await fs.readFile(path.join(fixture.root, fixture.relative), 'utf8'),
		).toContain('# 保留作者注释');
		expect(
			await fs.readFile(path.join(fixture.root, fixture.relative), 'utf8'),
		).not.toMatch(/(?<!\r)\n/);
		await page.getByRole('button', { name: '素材选择', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: '素材选择', exact: true }),
		).toBeVisible();
		await page.getByRole('searchbox').fill('wechat');
		await expect(page.locator('.media-card')).toHaveCount(1);
		expect(errors).toEqual([]);
	} finally {
		await page.goto('about:blank');
		await fixture.close();
	}
});

test('移动端与减少动态：键盘可用，主要表单不溢出', async ({ page }) => {
	const fixture = await adminFixture();
	try {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto(fixture.url);
		await expect(
			page.getByRole('heading', { name: '站点身份', exact: true }),
		).toBeVisible();
		await page.keyboard.press('Tab');
		await expect(
			page.getByRole('link', { name: '跳转到编辑区' }),
		).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page.locator('main')).toBeFocused();
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
		).toBeTruthy();
		await page.screenshot({ path: '.tmp/admin-mobile.png', fullPage: true });
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page
			.getByRole('button', { name: '头像与访问身份', exact: true })
			.click();
		await expect(page.locator('img.record-avatar')).toHaveCount(7);
		await expect(page.locator('img.avatar')).toHaveCount(1);
		await expect(page.locator('img.favicon')).toHaveCount(1);
		await page.locator('header').scrollIntoViewIfNeeded();
		await page.screenshot({ path: '.tmp/admin-desktop.png', fullPage: false });
	} finally {
		await page.goto('about:blank');
		await fixture.close();
	}
});

test('文章表单、未保存草稿预览与脚本隔离', async ({ page }) => {
	const fixture = await adminFixture();
	const external: string[] = [];
	page.on('request', (req) => {
		if (req.url().includes('untrusted.example')) external.push(req.url());
	});
	try {
		await page.goto(fixture.url);
		await page.getByRole('button', { name: '系列与文章', exact: true }).click();
		await page.getByRole('button', { name: /测试文章/ }).click();
		await page
			.getByRole('textbox', { name: '标题', exact: true })
			.fill('表单修改的标题');
		await page.getByRole('combobox', { name: /^分类/ }).selectOption('notes');
		await page
			.getByRole('combobox', { name: '系列', exact: true })
			.selectOption('plants-in-their-season');
		await page.getByRole('spinbutton', { name: '系列顺序' }).fill('2');
		await page.getByRole('button', { name: '应用字段到源码' }).click();
		await expect(page.getByRole('status')).toContainText('尚未保存文件');
		expect(
			await fs.readFile(path.join(fixture.root, fixture.relative), 'utf8'),
		).not.toContain('表单修改的标题');
		const source = page.getByRole('textbox', { name: 'Markdown 源码' });
		await source.fill(
			(await source.inputValue()) +
				'\n\n**预览加粗**\n\n<script>parent.injected=true</script>\n\n![外部图](https://untrusted.example/image.png)\n\n[外链](https://untrusted.example/)',
		);
		await page.getByRole('button', { name: '校验与预览' }).click();
		await expect(page.locator('iframe.post-preview')).toHaveAttribute(
			'sandbox',
			'',
		);
		const frame = page.frameLocator('iframe.post-preview');
		await expect(
			frame.getByRole('heading', { name: '表单修改的标题' }),
		).toBeVisible();
		await expect(frame.locator('strong')).toHaveText('预览加粗');
		await expect(frame.locator('script')).toHaveCount(0);
		await expect(frame.locator('a[href]')).toHaveCount(0);
		expect(
			await frame
				.locator('body')
				.evaluate((body) => getComputedStyle(body).color),
		).toBe('rgb(216, 222, 233)');
		expect(
			await page.evaluate(() => Reflect.get(window, 'injected')),
		).toBeUndefined();
		expect(external).toEqual([]);
		expect(
			await fs.readFile(path.join(fixture.root, fixture.relative), 'utf8'),
		).not.toContain('表单修改的标题');
		await page.setViewportSize({ width: 390, height: 844 });
		await page.locator('iframe.post-preview').scrollIntoViewIfNeeded();
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBeTruthy();
		await page.screenshot({ path: '.tmp/admin-writing-mobile.png' });
		await page.getByRole('button', { name: '保存文章', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('文章已保存');
		const saved = await fs.readFile(
			path.join(fixture.root, fixture.relative),
			'utf8',
		);
		expect(saved).toContain('custom: 未知字段保留');
		expect(saved).toContain('series: "plants-in-their-season"');
	} finally {
		page.once('dialog', (dialog) => dialog.accept());
		await page.goto('about:blank');
		await fixture.close();
	}
});

test('源码在表单读取后变化时保留双方输入，不允许直接覆盖', async ({ page }) => {
	const fixture = await adminFixture();
	try {
		await page.goto(fixture.url);
		await page.getByRole('button', { name: '系列与文章', exact: true }).click();
		await page.getByRole('button', { name: /测试文章/ }).click();
		const title = page.getByRole('textbox', { name: '标题', exact: true });
		await title.fill('尚未应用的标题');
		const source = page.getByRole('textbox', { name: 'Markdown 源码' });
		await source.fill((await source.inputValue()) + '\n源码里的新内容');
		await page.getByRole('button', { name: '应用字段到源码' }).click();
		await expect(page.getByRole('status')).toContainText('源码已变化');
		await expect(title).toHaveValue('尚未应用的标题');
		await expect(source).toHaveValue(/源码里的新内容/);
		await page.getByRole('button', { name: '保存文章', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('请先点击');
		expect(
			await fs.readFile(path.join(fixture.root, fixture.relative), 'utf8'),
		).not.toContain('源码里的新内容');
	} finally {
		page.once('dialog', (dialog) => dialog.accept());
		await page.goto('about:blank');
		await fixture.close();
	}
});
