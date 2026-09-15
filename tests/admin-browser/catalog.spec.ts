import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { adminBrowserFixture } from '../helpers/admin-browser-fixture';

test('分类光泽、关联角色、图标和图片选择在桌面与手机上可操作', async ({
	page,
}) => {
	const f = await adminBrowserFixture();
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	try {
		await page.goto(f.url);
		await page
			.getByRole('button', { name: '中文分类介绍', exact: true })
			.click();
		await expect(page.locator('.record-select')).toHaveCount(7);
		await expect(page.locator('.role-preview')).toHaveJSProperty(
			'complete',
			true,
		);
		const foil = page.getByRole('combobox', { name: '光泽样式' });
		await expect(foil.locator('option')).toHaveCount(8);
		await foil.selectOption('crosshatch');
		await expect(page.locator('.role-frame')).toHaveAttribute(
			'data-foil',
			'crosshatch',
		);
		await page.getByRole('button', { name: '保存到本地', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('已保存到本地');
		await page.screenshot({
			path: '.tmp/admin-categories-desktop.png',
			fullPage: true,
		});
		await page
			.getByRole('button', { name: '编辑对应角色', exact: true })
			.click();
		await expect(
			page.getByRole('textbox', { name: '角色名', exact: true }),
		).toHaveValue('Weiser');
		await page.getByRole('textbox', { name: '裁切位置' }).fill('center top');
		await expect(page.locator('.role-preview')).toHaveCSS(
			'object-position',
			'50% 0%',
		);
		await page.getByRole('button', { name: '保存到本地', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('已保存到本地');
		await page.setViewportSize({ width: 390, height: 844 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.locator('.role-frame').focus();
		await expect(page.locator('.role-frame')).toBeFocused();
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBeTruthy();
		await page.screenshot({ path: '.tmp/admin-role-mobile.png' });
		await page.getByRole('button', { name: '社交链接', exact: true }).click();
		const before = await page.locator('.social-preview path').getAttribute('d');
		await page.getByRole('combobox', { name: '图标' }).selectOption('email');
		expect(
			await page.locator('.social-preview path').getAttribute('d'),
		).not.toBe(before);
		await page.getByRole('button', { name: '保存到本地', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('已保存到本地');
		await page
			.getByRole('button', { name: 'QQ / 微信二维码', exact: true })
			.click();
		await page
			.getByRole('combobox', { name: '已有二维码' })
			.selectOption('src/assets/contact/wechat.png');
		await expect(
			page.getByRole('textbox', { name: '二维码图片地址' }),
		).toHaveValue('src/assets/contact/wechat.png');
		expect(errors).toEqual([]);
	} finally {
		page.once('dialog', (d) => d.accept());
		await page.goto('about:blank');
		await f.close();
	}
});

test('界面新增头像和系列后可以继续编辑，新增表单使用明确字段与本地保存反馈', async ({
	page,
}) => {
	const f = await adminBrowserFixture();
	try {
		await page.goto(f.url);
		await page
			.getByRole('button', { name: '头像与访问身份', exact: true })
			.click();
		await page
			.getByRole('button', { name: '新增头像身份', exact: true })
			.click();
		await page.getByRole('textbox', { name: '稳定 ID' }).fill('browser-avatar');
		await page
			.getByRole('textbox', { name: '角色名', exact: true })
			.fill('测试身份');
		await page
			.getByRole('textbox', { name: '替代文字', exact: true })
			.fill('测试头像');
		await page
			.getByLabel('头像图片（居中裁成正方形）')
			.setInputFiles(path.join(f.root, 'public/favicons/weiser-48.png'));
		await page.getByRole('button', { name: '查看创建预览' }).click();
		await expect(page.locator('.creation-preview')).toContainText(
			'browser-avatar-32.png',
		);
		await page.getByRole('button', { name: '创建并保存到本地' }).click();
		await expect(page.getByRole('status')).toContainText('已创建并保存');
		await expect(page.locator('.record-select')).toHaveCount(8);
		await page
			.locator('.record-select')
			.filter({ hasText: '测试身份' })
			.click();
		await expect(page.locator('img.avatar')).toHaveJSProperty(
			'naturalWidth',
			384,
		);
		await page.getByRole('checkbox', { name: '启用', exact: true }).uncheck();
		await page.getByRole('button', { name: '保存到本地', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('已保存到本地');
		await page.getByRole('button', { name: '系列介绍', exact: true }).click();
		await page.getByRole('button', { name: '新增系列', exact: true }).click();
		await page.getByRole('textbox', { name: '稳定 ID' }).fill('browser-series');
		await page.getByRole('textbox', { name: '系列标题' }).fill('新系列');
		await page
			.getByRole('textbox', { name: '英文标题', exact: true })
			.fill('New Series');
		await page
			.getByRole('textbox', { name: '系列介绍', exact: true })
			.fill('新的系列介绍');
		await page
			.getByRole('textbox', { name: '英文介绍', exact: true })
			.fill('New description');
		await page.getByRole('button', { name: '创建并保存到本地' }).click();
		await expect(page.getByRole('status')).toContainText('已创建并保存');
		expect(
			await fs.readFile(
				path.join(f.root, 'src/config/content/blogSeries.ts'),
				'utf8',
			),
		).toContain('browser-series');
	} finally {
		await page.goto('about:blank');
		await f.close();
	}
});
