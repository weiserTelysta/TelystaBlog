import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export class AdminError extends Error {
	constructor(
		message: string,
		public status = 400,
	) {
		super(message);
	}
}
export const versionOf = (content: Buffer | string) =>
	createHash('sha256').update(content).digest('hex');

export async function safePath(
	root: string,
	relative: string,
	allowMissing = false,
): Promise<string> {
	if (
		!relative ||
		relative.includes('\\') ||
		/[<>:"|?*\u0000-\u001f]/.test(relative) ||
		relative
			.split('/')
			.some(
				(s) =>
					!s ||
					s === '.' ||
					s === '..' ||
					/[. ]$/.test(s) ||
					/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s),
			)
	)
		throw new AdminError('非法文件路径');
	const resolvedRoot = await fs.realpath(root);
	let current = resolvedRoot;
	const parts = relative.split('/');
	for (let i = 0; i < parts.length; i++) {
		current = path.join(current, parts[i]);
		try {
			const info = await fs.lstat(current);
			if (info.isSymbolicLink())
				throw new AdminError('不支持符号链接或目录联接');
			const actual = await fs.realpath(current);
			if (actual !== current && process.platform !== 'win32')
				throw new AdminError('路径解析不一致');
			if (
				!actual.toLowerCase().startsWith(resolvedRoot.toLowerCase() + path.sep)
			)
				throw new AdminError('路径超出仓库');
			const siblings = await fs.readdir(path.dirname(current));
			if (!siblings.includes(parts[i]))
				throw new AdminError('路径大小写不一致');
		} catch (error) {
			if (
				allowMissing &&
				i === parts.length - 1 &&
				(error as NodeJS.ErrnoException).code === 'ENOENT'
			) {
				// Linux reports a case variant as missing; still reject names that
				// would collide when this checkout is opened on Windows or macOS.
				const siblings = await fs.readdir(path.dirname(current));
				if (
					siblings.some((name) => name.toLowerCase() === parts[i].toLowerCase())
				)
					throw new AdminError('路径大小写不一致');
				return current;
			}
			throw error;
		}
	}
	return current;
}

export async function readVersion(root: string, relative: string) {
	const file = await safePath(root, relative);
	const bytes = await fs.readFile(file);
	return { source: bytes.toString('utf8'), version: versionOf(bytes) };
}

/** Caller serializes mutations. No automatic restore: preserve recovery bytes for explicit inspection. */
export async function writeVersion(
	root: string,
	relative: string,
	content: string | Buffer,
	expected: string | null,
) {
	const file = await safePath(root, relative, expected === null);
	const check = async () => {
		const current = await fs.readFile(file).catch((error) => {
			if (
				(error as NodeJS.ErrnoException).code === 'ENOENT' &&
				expected === null
			)
				return null;
			throw error;
		});
		if ((current === null ? null : versionOf(current)) !== expected)
			throw new AdminError(
				'文件已被其他编辑修改，请保留当前内容并重新读取后合并。没有覆盖原文件。',
				409,
			);
		return current;
	};
	const old = await check();
	if (old?.equals(Buffer.isBuffer(content) ? content : Buffer.from(content)))
		return { version: versionOf(content) };
	const recovery = path.join(root, '.tmp', 'admin-recovery');
	await fs.mkdir(recovery, { recursive: true });
	await safePath(root, '.tmp/admin-recovery');
	if (old) {
		const id = randomUUID();
		await fs.writeFile(path.join(recovery, `${id}.bak`), old, { flag: 'wx' });
		await fs.writeFile(
			path.join(recovery, `${id}.json`),
			JSON.stringify({
				path: relative,
				version: expected,
				savedAt: new Date().toISOString(),
			}),
			{ flag: 'wx' },
		);
	}
	const temporary = path.join(path.dirname(file), `.admin-${randomUUID()}.tmp`);
	try {
		await fs.writeFile(temporary, content, { flag: 'wx' });
		await safePath(root, relative, expected === null);
		await check();
		if (expected === null) {
			// Exclusive creation never overwrites a file created by an external editor.
			await fs.link(temporary, file).catch((error) => {
				if ((error as NodeJS.ErrnoException).code === 'EEXIST')
					throw new AdminError('文件已存在，未覆盖', 409);
				throw error;
			});
		} else await fs.rename(temporary, file);
	} finally {
		await fs.rm(temporary, { force: true });
	}
	return { version: versionOf(content) };
}
