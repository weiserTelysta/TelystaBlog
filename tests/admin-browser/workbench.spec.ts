import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { adminBrowserFixture } from '../helpers/admin-browser-fixture';

test('读取表单期间输入源码会重新读取；过期检查结果不覆盖新输入', async ({
	page,
}) => {
	const fixture = await adminBrowserFixture();
	try {
		let first = true;
		await page.route('**/api/post-fields', async (route) => {
			if (first) {
				first = false;
				await new Promise((resolve) => setTimeout(resolve, 250));
			}
			await route.continue();
		});
		await page.goto(fixture.url);
		await page.getByRole('button', { name: '系列与文章', exact: true }).click();
		const loading = page.waitForRequest((request) =>
			request.url().endsWith('/api/post-fields'),
		);
		await page.getByRole('button', { name: /测试文章/ }).click();
		await loading;
		const source = page.getByRole('textbox', { name: 'Markdown 源码' });
		await source.fill(
			(await source.inputValue()) +
				'\n\n读取期间写下的一段正文，应该保留并参与摘要建议。\n',
		);
		await expect(
			page.getByRole('textbox', { name: '标题', exact: true }),
		).toHaveValue('测试文章');
		await expect(page.locator('.excerpt-suggestion')).toContainText('读取期间');
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route('**/api/post-assist', async (route) => {
			await gate;
			await route.continue();
		});
		const inspecting = page.waitForRequest((request) =>
			request.url().endsWith('/api/post-assist'),
		);
		await page.getByRole('button', { name: '检查当前文章' }).click();
		await inspecting;
		await source.fill((await source.inputValue()) + '\n更新后的输入。');
		release();
		await expect(
			page.getByRole('button', { name: '检查当前文章' }),
		).toBeEnabled();
		await expect(page.locator('.writing-checks')).not.toContainText(
			'内容检查通过',
		);
		await expect(source).toHaveValue(/更新后的输入/);
	} finally {
		page.once('dialog', (dialog) => dialog.accept());
		await page.goto('about:blank');
		await fixture.close();
	}
});

test('文章状态与分类筛选、功能搜索和手机导航', async ({ page }) => {
	const fixture = await adminBrowserFixture();
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	try {
		const notes = path.join(fixture.root, 'src/content/weiser-posts/notes');
		await fs.mkdir(notes);
		await fs.writeFile(
			path.join(notes, '2026-9-15-公开笔记.md'),
			'---\ntitle: 旧标题\npublishedAt: 2026-9-15\nupdatedAt: 2026-10-3\n---\n\n# 公开笔记\n\n这是一篇已经公开的观察笔记，记录日常生活中的一些有趣事情。\n',
		);
		await page.goto(fixture.url);
		await page
			.getByRole('heading', { name: '站点身份', exact: true })
			.waitFor();
		await page.keyboard.press('Control+k');
		await expect(
			page.getByRole('searchbox', { name: '查找管理功能' }),
		).toBeFocused();
		await page
			.getByRole('searchbox', { name: '查找管理功能' })
			.fill('系列与文章');
		await page.getByRole('button', { name: '系列与文章', exact: true }).click();
		await expect(page.locator('.post-list > button')).toHaveCount(2);
		await expect(page.locator('.post-list > button').first()).toContainText(
			'公开笔记',
		);
		await expect(page.locator('.post-list > button').first()).toContainText(
			'2026-10-03',
		);
		await page
			.getByRole('combobox', { name: '文章状态' })
			.selectOption('draft');
		await expect(page.locator('.post-list > button')).toHaveCount(1);
		await expect(page.locator('.post-list')).toContainText('测试文章');
		await page.getByRole('combobox', { name: '文章状态' }).selectOption('');
		await page
			.getByRole('combobox', { name: '筛选分类' })
			.selectOption('notes');
		await expect(page.locator('.post-list')).toContainText('公开笔记');
		await page
			.getByRole('searchbox', { name: '搜索文章标题或路径' })
			.fill('不存在的标题');
		await expect(page.locator('.empty-state')).toBeVisible();
		await page.setViewportSize({ width: 390, height: 844 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.getByRole('button', { name: /^管理功能/ }).click();
		await page
			.getByRole('searchbox', { name: '查找管理功能' })
			.fill('素材选择');
		await page.getByRole('button', { name: '素材选择', exact: true }).click();
		await expect(page.locator('#navigation-panel')).toBeHidden();
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBeTruthy();
		expect(errors).toEqual([]);
	} finally {
		await page.goto('about:blank');
		await fixture.close();
	}
});

test('摘要与章节建议、快捷保存自动应用字段，并保留作者源码', async ({
	page,
}) => {
	const fixture = await adminBrowserFixture();
	try {
		const folder = path.join(
			fixture.root,
			'src/content/weiser-posts/portraits',
		);
		await fs.mkdir(folder);
		await fs.writeFile(
			path.join(folder, '2026-9-16-chapter.md'),
			'---\nseries: telysta-notes\nseriesOrder: 3\ndraft: true\n---\n\n# 上一章\n\n这里记录上一章的内容，仍然是作者没有公开的草稿。\n',
		);
		await page.goto(fixture.url);
		await page.getByRole('button', { name: '系列与文章', exact: true }).click();
		await page.getByRole('button', { name: /测试文章/ }).click();
		const source = page.getByRole('textbox', { name: 'Markdown 源码' });
		await source.fill(
			(await source.inputValue()) +
				'\n\n这是可以单独表达文章内容的一段正文，用来生成清晰自然的文章摘要。\n',
		);
		await page.getByRole('button', { name: '从源码读取表单' }).click();
		await page.getByRole('button', { name: '使用首段摘要' }).click();
		await page
			.getByRole('combobox', { name: /^分类/ })
			.selectOption('portraits');
		await page
			.getByRole('combobox', { name: '系列', exact: true })
			.selectOption('telysta-notes');
		await expect(
			page
				.getByRole('combobox', { name: '系列', exact: true })
				.locator('option[value="plants-in-their-season"]'),
		).toHaveJSProperty('disabled', true);
		await page.getByRole('button', { name: '使用建议序号' }).click();
		await expect(
			page.getByRole('spinbutton', { name: '系列顺序' }),
		).toHaveValue('4');
		await page
			.getByRole('textbox', { name: '标题', exact: true })
			.fill('使用辅助后的标题');
		await expect(page.locator('#save-state')).toHaveText('有未保存修改');
		await page.keyboard.press('Control+s');
		await expect(page.getByRole('status')).toContainText('文章已保存');
		const saved = await fs.readFile(
			path.join(fixture.root, fixture.relative),
			'utf8',
		);
		expect(saved).toContain('title: "使用辅助后的标题"');
		expect(saved).toContain('description: "这是可以单独表达文章内容的一段正文');
		expect(saved).toContain('seriesOrder: 4');
		expect(saved).toContain('custom: 未知字段保留');
		expect(saved).toContain('# 保留作者注释');
		expect(saved).not.toMatch(/(?<!\r)\n/);
		await expect(page.locator('#save-state')).toHaveText('无未保存修改');
		await page.screenshot({
			path: '.tmp/admin-workbench-writing.png',
			fullPage: true,
		});
	} finally {
		await page.goto('about:blank');
		await fixture.close();
	}
});

test('助手检查定位源码，图片选择插入网站路径，保存差异有逐行标记', async ({
	page,
}) => {
	const fixture = await adminBrowserFixture();
	const original = await fs.readFile(
		path.join(fixture.root, fixture.relative),
		'utf8',
	);
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	try {
		await page.goto(fixture.url);
		await page.getByRole('button', { name: '系列与文章', exact: true }).click();
		await page.getByRole('button', { name: /测试文章/ }).click();
		const source = page.getByRole('textbox', { name: 'Markdown 源码' });
		await source.fill(
			(await source.inputValue()) + '\n\n![缺失](missing.png)\n',
		);
		await page.getByRole('button', { name: '检查当前文章' }).click();
		await expect(page.locator('.writing-checks')).toContainText('请先修正');
		await page
			.locator('.issue-link')
			.filter({ hasText: 'missing.png' })
			.click();
		await expect(source).toBeFocused();
		expect(
			await source.evaluate((node: HTMLTextAreaElement) =>
				node.value.slice(node.selectionStart, node.selectionEnd),
			),
		).toContain('missing.png');
		await source.fill(
			(await source.inputValue()).replace('![缺失](missing.png)', ''),
		);
		await source.evaluate((node: HTMLTextAreaElement) =>
			node.setSelectionRange(node.value.length, node.value.length),
		);
		await page.getByRole('button', { name: '插入图片', exact: true }).click();
		await page
			.getByRole('textbox', { name: '图片说明', exact: true })
			.fill('微信二维码');
		await page
			.getByRole('searchbox', { name: '搜索可插入的图片' })
			.fill('wechat');
		await page.locator('.inline-media-item').click();
		await expect(source).toHaveValue(
			/!\[微信二维码\]\(<\.\.\/\.\.\/\.\.\/assets\/contact\/wechat.png>\)/,
		);
		await page.getByRole('button', { name: '校验与预览' }).click();
		await expect(page.locator('.source-diff .diff-add')).not.toHaveCount(0);
		await expect(page.locator('.source-diff')).toContainText('微信二维码');
		expect(
			await fs.readFile(path.join(fixture.root, fixture.relative), 'utf8'),
		).toBe(original);
		await page.setViewportSize({ width: 390, height: 844 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBeTruthy();
		await page.screenshot({
			path: '.tmp/admin-workbench-mobile.png',
			fullPage: true,
		});
		expect(errors).toEqual([]);
	} finally {
		page.once('dialog', (d) => d.accept());
		await page.goto('about:blank');
		await fixture.close();
	}
});
