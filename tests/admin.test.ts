import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {
	parseConfig,
	sections,
	updateConfig,
	type Value,
} from '../scripts/admin/config';
import { safePath, readVersion, writeVersion } from '../scripts/admin/store';
import { projectRoot } from '../scripts/admin/server';
import { adminFixture } from './helpers/admin-fixture';

test('all registered config sections preserve exact source on unchanged round trips', async () => {
	for (const section of sections) {
		const source = await fs.readFile(
			path.join(projectRoot, section[2]),
			'utf8',
		);
		assert.equal(
			updateConfig(source, section, parseConfig(source, section).value),
			source,
			section[0],
		);
	}
});
test('literal edits preserve code, comments and ASCII strings; protected fields reject writes', async () => {
	const section = sections.find((s) => s[0] === 'profiles')!;
	const source = await fs.readFile(path.join(projectRoot, section[2]), 'utf8');
	const values = parseConfig(source, section).value as Record<string, Value>[];
	values[0].name = 'A "quote" ${process.exit()}\n名字';
	values[0].enabled = false;
	const edited = updateConfig(source, section, values);
	assert.match(
		edited,
		/avatar: createCdnAvatar\('Profile_Weiser.avatar.webp'\)/,
	);
	assert.match(
		edited,
		/export const DEFAULT_HOME_PROFILE = HOME_PROFILES\[0\]/,
	);
	assert.deepEqual(parseConfig(edited, section).value, values);
	values[0].avatar = 'malicious()';
	assert.throws(() => updateConfig(source, section, values), /受保护/);
	const hero = sections.find((s) => s[0] === 'hero')!;
	const heroSource = await fs.readFile(path.join(projectRoot, hero[2]), 'utf8');
	const rows = parseConfig(heroSource, hero).value as Record<string, Value>[];
	rows[0].text = '新的句子';
	assert.ok(updateConfig(heroSource, hero, rows).includes("'⣿⡇⣿⣿⣿"));
	rows[0].dayAffinity = 2;
	assert.throws(() => updateConfig(heroSource, hero, rows), /昼夜偏好/);
});
test('lists support additions and deletions; malformed syntax and invalid values cannot save', async () => {
	const section = sections.find((s) => s[0] === 'tabs')!;
	const source = await fs.readFile(path.join(projectRoot, section[2]), 'utf8');
	const values = parseConfig(source, section).value as string[];
	values.splice(1, 1);
	values.push('新句子');
	values.push('再加一句');
	const updated = updateConfig(source, section, values);
	assert.ok(updated.startsWith('// One greeting per hidden transition'));
	assert.deepEqual(parseConfig(updated, section).value, values);
	assert.throws(() => updateConfig(source, section, []), /至少/);
	assert.throws(() => parseConfig('const TAB_GREETINGS = [;', section), /语法/);
	const site = sections.find((s) => s[0] === 'site')!;
	const text = await fs.readFile(path.join(projectRoot, site[2]), 'utf8');
	const data = parseConfig(text, site).value as Record<string, Value>;
	(data.navItems as Record<string, Value>[])[0].href = 'javascript:alert(1)';
	assert.throws(() => updateConfig(text, site, data), /链接/);
});
test('HTTP source and token checks; version conflicts preserve both editor and external contents', async () => {
	const fixture = await adminFixture();
	try {
		assert.equal(
			(await fetch(fixture.url + '/api/config?id=hero')).status,
			403,
		);
		assert.equal(
			(
				await fixture.request('/api/session', undefined, {
					Origin: 'https://evil.example',
				})
			).status,
			403,
		);
		const badHostStatus = await new Promise<number | undefined>(
			(resolve, reject) => {
				const req = http.get(
					fixture.url + '/api/session',
					{ headers: { Host: 'evil.example' } },
					(res) => {
						res.resume();
						resolve(res.statusCode);
					},
				);
				req.on('error', reject);
			},
		);
		assert.equal(badHostStatus, 403);
		const current = await (await fixture.request('/api/config?id=hero')).json();
		current.value[0].text = '后台待保存';
		const file = path.join(fixture.root, current.path);
		const external = current.source + '\n// VS Code 修改\n';
		await fs.writeFile(file, external);
		assert.equal(
			(
				await fixture.request('/api/config?id=hero', {
					version: current.version,
					value: current.value,
				})
			).status,
			409,
		);
		assert.equal(await fs.readFile(file, 'utf8'), external);
		const fresh = await (await fixture.request('/api/config?id=hero')).json();
		assert.equal(
			(
				await fixture.request('/api/config?id=hero', {
					version: fresh.version,
					value: current.value,
				})
			).status,
			200,
		);
		assert.match(await fs.readFile(file, 'utf8'), /VS Code 修改/);
		const backups = await fs.readdir(
			path.join(fixture.root, '.tmp/admin-recovery'),
		);
		assert.equal(backups.filter((f) => f.endsWith('.bak')).length, 1);
	} finally {
		await fixture.close();
	}
});
test('Markdown saves raw CRLF, comments and extensions; invalid metadata and duplicate files rejected', async () => {
	const fixture = await adminFixture();
	try {
		const current = await (
			await fixture.request(
				`/api/post?path=${encodeURIComponent(fixture.relative)}`,
			)
		).json();
		const source = current.source + '\r\n正文补充。\r\n';
		const response = await fixture.request('/api/post', { ...current, source });
		assert.equal(response.status, 200, await response.text());
		assert.equal(
			await fs.readFile(path.join(fixture.root, fixture.relative), 'utf8'),
			source,
		);
		assert.equal(
			(await fixture.request('/api/post', { ...current, source })).status,
			409,
		);
		assert.equal(
			(
				await fixture.request('/api/post', {
					...current,
					source: source.replace('draft: true', 'draft: "false"'),
					preview: true,
				})
			).status,
			400,
		);
		assert.equal(
			(
				await fixture.request('/api/post', {
					path: fixture.relative,
					version: null,
					source,
				})
			).status,
			409,
		);
		const newPath = 'src/content/weiser-posts/letters/2026-9-15-新文章.md';
		assert.equal(
			(
				await fixture.request('/api/post', {
					path: newPath,
					version: null,
					source,
				})
			).status,
			200,
		);
		assert.equal(
			(
				await fixture.request('/api/post', {
					path: newPath.replace('新文章', '公开'),
					version: null,
					source: source.replace('draft: true', 'draft: false'),
				})
			).status,
			400,
		);
	} finally {
		await fixture.close();
	}
});
test('write paths reject traversal, case mismatches and junctions; media upload never replaces files', async () => {
	const fixture = await adminFixture();
	try {
		for (const invalid of [
			'../file.md',
			'C:/secret',
			'src/../file.md',
			'src\\config',
			'src/config/site.ts.',
			'src/config/Site.ts',
			'src/config/CON.md',
		])
			await assert.rejects(() => safePath(fixture.root, invalid, true));
		const target = path.join(fixture.root, 'src/content/weiser-posts/letters');
		const link = path.join(fixture.root, 'src/content/weiser-posts/link');
		await fs.symlink(
			target,
			link,
			process.platform === 'win32' ? 'junction' : 'dir',
		);
		await assert.rejects(
			() =>
				safePath(fixture.root, 'src/content/weiser-posts/link/test.md', true),
			/符号链接/,
		);
		const current = await readVersion(fixture.root, fixture.relative);
		await assert.rejects(
			() => writeVersion(fixture.root, fixture.relative, 'x', null),
			/已被其他/,
		);
		assert.equal(
			(await readVersion(fixture.root, fixture.relative)).version,
			current.version,
		);
		const content = (
			await fs.readFile(path.join(fixture.root, 'src/assets/contact/qq.png'))
		).toString('base64');
		const upload = { path: 'src/assets/contact/new.png', content };
		assert.equal((await fixture.request('/api/upload', upload)).status, 200);
		assert.equal((await fixture.request('/api/upload', upload)).status, 409);
		assert.equal(
			(
				await fixture.request('/api/upload', {
					path: 'src/config/site.ts',
					content,
				})
			).status,
			400,
		);
		const media = await (await fixture.request('/api/media')).json();
		assert.ok(media.some((m: { source: string }) => m.source === 'R2 头像'));
		assert.ok(media.every((m: { url: string }) => !m.url.endsWith('.psd')));
	} finally {
		await fixture.close();
	}
});
