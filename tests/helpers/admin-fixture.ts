import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { projectRoot, createAdminServer } from '../../scripts/admin/server';

export async function adminFixture() {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'telysta-admin-test-'));
	await fs.cp(
		path.join(projectRoot, 'src/config'),
		path.join(root, 'src/config'),
		{ recursive: true },
	);
	for (const dir of [
		'src/content/weiser-posts/letters',
		'src/generated',
		'src/assets/contact',
		'src/assets/images/accordion',
		'public/favicons',
	])
		await fs.mkdir(path.join(root, dir), { recursive: true });
	await fs.copyFile(
		path.join(projectRoot, 'src/generated/cdn-assets.json'),
		path.join(root, 'src/generated/cdn-assets.json'),
	);
	await fs.cp(
		path.join(projectRoot, 'public/favicons'),
		path.join(root, 'public/favicons'),
		{ recursive: true },
	);
	await fs.cp(
		path.join(projectRoot, 'src/assets/images/accordion'),
		path.join(root, 'src/assets/images/accordion'),
		{ recursive: true },
	);
	for (const name of ['qq.png', 'wechat.png'])
		await fs.copyFile(
			path.join(projectRoot, 'src/assets/contact', name),
			path.join(root, 'src/assets/contact', name),
		);
	const relative = 'src/content/weiser-posts/letters/2026-9-14-测试文章.md';
	const source =
		'---\r\n# 保留作者注释\r\ntitle: 测试文章\r\ndraft: true\r\ncustom: 未知字段保留\r\n---\r\n\r\n$$ x^2 $$\r\n\r\n```jianpu\r\n1 2 3\r\n```\r\n';
	await fs.writeFile(path.join(root, relative), source);
	const server = createAdminServer(root);
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	if (!address || typeof address === 'string')
		throw new Error('Test server missing');
	const url = `http://127.0.0.1:${address.port}`;
	const { token } = await (await fetch(`${url}/api/session`)).json();
	const headers = {
		'x-telysta-token': token,
		'Content-Type': 'application/json',
	};
	const request = (
		route: string,
		body?: unknown,
		extra?: Record<string, string>,
	) =>
		fetch(url + route, {
			method: body === undefined ? 'GET' : 'POST',
			headers: { ...headers, ...extra },
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		});
	return {
		root,
		url,
		source,
		relative,
		request,
		async close() {
			server.closeAllConnections();
			await new Promise<void>((resolve, reject) =>
				server.close((e) => (e ? reject(e) : resolve())),
			);
			if (
				!path
					.resolve(root)
					.startsWith(path.join(os.tmpdir(), 'telysta-admin-test-'))
			)
				throw new Error('Unexpected cleanup path');
			await fs.rm(root, { recursive: true, force: true });
		},
	};
}
