import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { adminFixture } from './helpers/admin-fixture';
import { writeChanges } from '../scripts/admin/catalog';
import { versionOf } from '../scripts/admin/store';

const image = async () =>
	(
		await sharp({
			create: { width: 48, height: 64, channels: 4, background: '#a4b8ce' },
		})
			.png()
			.toBuffer()
	).toString('base64');
async function json(response: Response) {
	const value = await response.json();
	assert.equal(response.status, 200, JSON.stringify(value));
	return value;
}

test('新增头像先预览，再生成本地 WebP 与配套 favicon；冲突不会覆盖', async () => {
	const f = await adminFixture();
	try {
		const { versions } = await json(await f.request('/api/catalog'));
		const data = {
			kind: 'profiles',
			versions,
			content: await image(),
			record: {
				id: 'new-profile',
				name: '新角色',
				alt: '新角色头像',
				tone: 'moon',
			},
		};
		const preview = await json(
			await f.request('/api/catalog', { ...data, preview: true }),
		);
		assert.equal(preview.changes.length, 4);
		await assert.rejects(fs.stat(path.join(f.root, 'public/media')));
		await json(await f.request('/api/catalog', data));
		const config = await json(await f.request('/api/config?id=profiles'));
		const profile = config.value.at(-1);
		assert.equal(profile.id, 'new-profile');
		const meta = await sharp(
			await fs.readFile(path.join(f.root, 'public', profile.avatar.src)),
		).metadata();
		assert.equal(meta.format, 'webp');
		assert.equal(meta.width, 384);
		assert.equal(meta.height, 384);
		for (const size of [32, 48])
			assert.equal(
				(
					await sharp(
						await fs.readFile(
							path.join(f.root, `public/favicons/new-profile-${size}.png`),
						),
					).metadata()
				).width,
				size,
			);
		const before = await fs.readFile(path.join(f.root, config.path));
		assert.equal((await f.request('/api/catalog', data)).status, 409);
		assert.deepEqual(await fs.readFile(path.join(f.root, config.path)), before);
		profile.name = '新角色改名';
		await json(
			await f.request('/api/config?id=profiles', {
				version: config.version,
				value: config.value,
			}),
		);
	} finally {
		await f.close();
	}
});

test('分类与角色一起创建，新增系列和文章立即识别新目录，无需重启', async () => {
	const f = await adminFixture();
	try {
		let catalog = await json(await f.request('/api/catalog'));
		const category = {
			kind: 'categories',
			versions: catalog.versions,
			content: await image(),
			record: {
				id: 'travel',
				title: '旅途',
				prefix: 'Weiser',
				name: 'Travel',
				subtitle: '沿途见闻',
				description: '旅途中的记录',
				descriptionEn: 'Travel notes',
				foil: 'crosshatch',
			},
		};
		await json(await f.request('/api/catalog', category));
		const visuals = await json(await f.request('/api/config?id=visuals'));
		assert.equal(visuals.value.travel.cardInscription.prefix, 'Weiser');
		assert.ok(visuals.previews[visuals.value.travel.image.src]);
		catalog = await json(await f.request('/api/catalog'));
		await json(
			await f.request('/api/catalog', {
				kind: 'series',
				versions: catalog.versions,
				record: {
					id: 'travel-diary',
					category: 'travel',
					title: '旅行日志',
					titleEn: 'Travel Diary',
					description: '每天的见闻',
					descriptionEn: 'Daily notes',
				},
			}),
		);
		const relative = 'src/content/weiser-posts/travel/2026-9-15-新的日志.md';
		const source =
			'---\ndraft: true\nseries: travel-diary\nseriesOrder: 1\n---\n\n今天看到了新的风景。';
		const fields = await json(
			await f.request('/api/post-fields', { path: relative, source }),
		);
		assert.equal(fields.metadata.category, 'travel');
		await json(
			await f.request('/api/post', { path: relative, version: null, source }),
		);
		assert.equal(
			await fs.readFile(path.join(f.root, relative), 'utf8'),
			source,
		);
		const listing = await json(await f.request('/api/posts'));
		assert.equal(
			listing.posts.find((post: { path: string }) => post.path === relative)
				?.category,
			'travel',
			'文章列表也应立即推导新分类，无需重启后台',
		);
		const mismatch = source.replace(
			'series: travel-diary',
			'category: letters\nseries: travel-diary',
		);
		assert.equal(
			(
				await f.request('/api/post', {
					path: relative,
					source: mismatch,
					preview: true,
				})
			).status,
			400,
		);
		const all = await json(await f.request('/api/config?id=categories'));
		assert.equal(all.schema.item.fields.foil.kind, 'string');
		assert.equal(all.schema.item.fields.foil.options.length, 8);
		all.value.at(-1).foil = 'satin';
		await json(
			await f.request('/api/config?id=categories', {
				value: all.value,
				version: all.version,
			}),
		);
	} finally {
		await f.close();
	}
});

test('二维码使用无损图片地址，恶意文件与外站地址被拒绝；多文件保存先核对全部版本', async () => {
	const f = await adminFixture();
	try {
		const input = await image();
		const qr = await json(
			await f.request('/api/qr-upload', { content: input }),
		);
		assert.match(qr.src, /^\/media\/qr-.*\.webp$/);
		assert.ok(
			(
				await sharp(await fs.readFile(path.join(f.root, qr.path)))
					.ensureAlpha()
					.raw()
					.toBuffer()
			).equals(
				await sharp(Buffer.from(input, 'base64'))
					.ensureAlpha()
					.raw()
					.toBuffer(),
			),
			'二维码转换后像素应保持一致',
		);
		const config = await json(await f.request('/api/config?id=contacts'));
		config.value[0].imageSrc = qr.src;
		await json(
			await f.request('/api/config?id=contacts', {
				value: config.value,
				version: config.version,
			}),
		);
		const fresh = await json(await f.request('/api/config?id=contacts'));
		fresh.value[0].imageSrc = 'javascript:alert(1)';
		assert.equal(
			(
				await f.request('/api/config?id=contacts', {
					value: fresh.value,
					version: fresh.version,
				})
			).status,
			400,
		);
		assert.equal(
			(
				await f.request('/api/qr-upload', {
					content: Buffer.from('<svg onload="alert(1)"/>').toString('base64'),
				})
			).status,
			400,
		);
		const file = 'src/config/pages/home.ts';
		const original = await fs.readFile(path.join(f.root, file), 'utf8');
		await assert.rejects(
			writeChanges(f.root, [
				{ path: file, source: original + '\n', version: versionOf(original) },
				{
					path: f.relative,
					source: 'will not write',
					version: 'wrong-version',
				},
			]),
			/变化/,
		);
		assert.equal(await fs.readFile(path.join(f.root, file), 'utf8'), original);
	} finally {
		await f.close();
	}
});
