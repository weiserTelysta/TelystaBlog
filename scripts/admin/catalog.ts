import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import sharp from 'sharp';
import { sections, parseConfig, options, type Value } from './config';
import {
	AdminError,
	readVersion,
	safePath,
	versionOf,
	writeVersion,
} from './store';

type Row = Record<string, Value>;
type Change = { path: string; source: string | Buffer; version: string | null };
const ids = ['categories', 'visuals', 'series', 'profiles'] as const;

export async function readCatalog(root: string) {
	const entries = await Promise.all(
		ids.map(async (id) => {
			const section = sections.find((s) => s[0] === id)!;
			const file = await readVersion(root, section[2]);
			return [
				id,
				{
					...file,
					path: section[2],
					value: parseConfig(file.source, section).value,
				},
			] as const;
		}),
	);
	return Object.fromEntries(entries) as Record<
		(typeof ids)[number],
		{ path: string; source: string; version: string; value: Value }
	>;
}

function text(value: unknown, label: string, max = 2000) {
	if (typeof value !== 'string' || !value.trim() || value.length > max)
		throw new AdminError(`请填写${label}（最多 ${max} 字符）`);
	return value.trim();
}
function choice(value: unknown, list: string[], label: string) {
	if (typeof value !== 'string' || !list.includes(value))
		throw new AdminError(`${label}无效`);
	return value;
}

/** Insert one JSON literal, retaining existing expressions and author comments. */
function append(source: string, id: string, row: Row, key?: string) {
	const section = sections.find((s) => s[0] === id)!;
	const { node } = parseConfig(source, section);
	const list = ts.isArrayLiteralExpression(node)
		? node.elements
		: ts.isObjectLiteralExpression(node)
			? node.properties
			: undefined;
	if (!list) throw new AdminError('配置结构不支持新增');
	const formatted = JSON.stringify(row, null, '\t').replace(/\n/g, '\n\t');
	const insertion = `${list.length && !list.hasTrailingComma ? ',' : ''}\n\t${key ? `${JSON.stringify(key)}: ` : ''}${formatted},`;
	const next = source.slice(0, list.end) + insertion + source.slice(list.end);
	parseConfig(next, section);
	return next;
}

export async function prepareImage(
	content: unknown,
	purpose: 'avatar' | 'role' | 'qr',
) {
	if (
		typeof content !== 'string' ||
		content.length > 12_000_000 ||
		!/^[A-Za-z0-9+/]+={0,2}$/.test(content)
	)
		throw new AdminError('请选择 PNG、JPEG 或 WebP 图片（不超过 8 MB）');
	const input = Buffer.from(content, 'base64');
	if (!input.length || input.length > 8 * 1024 * 1024)
		throw new AdminError('图片超过 8 MB');
	const image = sharp(input, { limitInputPixels: 24_000_000 });
	const meta = await image.metadata();
	if (
		!['png', 'jpeg', 'webp'].includes(meta.format ?? '') ||
		(meta.pages ?? 1) > 1
	)
		throw new AdminError('仅支持静态 PNG、JPEG 或 WebP 图片');
	let pipeline = image.rotate();
	if (purpose === 'avatar')
		pipeline = pipeline.resize(384, 384, { fit: 'cover' });
	if (purpose === 'role')
		pipeline = pipeline.resize({
			width: 1200,
			height: 2400,
			fit: 'inside',
			withoutEnlargement: true,
		});
	const { data, info } = await pipeline
		.webp(purpose === 'qr' ? { lossless: true } : { quality: 88 })
		.toBuffer({ resolveWithObject: true });
	const relative = `public/media/${purpose}-${versionOf(data).slice(0, 20)}.webp`;
	return {
		data,
		relative,
		image: {
			src: relative.slice('public'.length),
			width: info.width,
			height: info.height,
			format: 'webp',
		},
	};
}

async function ensureFolder(root: string, relative: string) {
	await safePath(root, path.posix.dirname(relative));
	await fs.mkdir(await safePath(root, relative, true)).catch((error) => {
		if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
	});
	await safePath(root, relative);
}

/** Preflight all versions; on ordinary I/O failures restore only bytes still owned by this operation. */
export async function writeChanges(root: string, changes: Change[]) {
	if (new Set(changes.map((change) => change.path)).size !== changes.length)
		throw new AdminError('同一次保存不能重复写入同一路径');
	const before = new Map<string, Buffer | null>();
	for (const change of changes) {
		const file = await safePath(root, change.path, change.version === null);
		const old = await fs.readFile(file).catch((e) => {
			if (e.code === 'ENOENT' && change.version === null) return null;
			throw e;
		});
		if ((old === null ? null : versionOf(old)) !== change.version)
			throw new AdminError('文件已变化，未开始保存；请重新读取后重试', 409);
		before.set(change.path, old);
	}
	const written: Change[] = [];
	try {
		for (const change of changes) {
			await writeVersion(root, change.path, change.source, change.version);
			written.push(change);
		}
	} catch (error) {
		const unresolved: string[] = [];
		for (const change of written.reverse()) {
			try {
				const old = before.get(change.path)!;
				if (old !== null)
					await writeVersion(root, change.path, old, versionOf(change.source));
				else {
					const file = await safePath(root, change.path);
					if (versionOf(await fs.readFile(file)) !== versionOf(change.source))
						throw new Error('Conflict');
					await fs.unlink(file);
				}
			} catch {
				unresolved.push(change.path);
			}
		}
		if (unresolved.length)
			throw new AdminError(
				`保存中断，以下文件需人工核对：${unresolved.join('、')}。原文件备份在 .tmp/admin-recovery。`,
				409,
			);
		throw error;
	}
}

export async function createCatalogEntry(
	root: string,
	data: Record<string, unknown>,
) {
	const kind = choice(
		data.kind,
		['profiles', 'categories', 'series'],
		'新增类型',
	);
	const record = data.record as Record<string, unknown>;
	if (!record || typeof record !== 'object' || Array.isArray(record))
		throw new AdminError('新增表单无效');
	const id = text(record.id, '稳定 ID', 60);
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
		throw new AdminError('ID 使用小写英文、数字和连接号');
	const catalog = await readCatalog(root);
	const versions = data.versions as Record<string, unknown> | undefined;
	for (const name of ids)
		if (versions?.[name] !== catalog[name].version)
			throw new AdminError('配置文件已变化，请保留输入并重新读取新增表单', 409);
	const existing = catalog[kind as 'profiles' | 'categories' | 'series'];
	if ((existing.value as Row[]).some((row) => row.id === id))
		throw new AdminError('该 ID 已存在，不能重复新增');
	const changes: Change[] = [];
	let row: Row;
	let image: Awaited<ReturnType<typeof prepareImage>> | undefined;
	if (kind === 'series') {
		row = {
			id,
			category: choice(
				record.category,
				(catalog.categories.value as Row[]).map((c) => String(c.id)),
				'所属分类',
			),
			title: text(record.title, '系列标题'),
			titleEn: text(record.titleEn, '英文标题'),
			description: text(record.description, '系列介绍'),
			descriptionEn: text(record.descriptionEn, '英文介绍'),
		};
	} else {
		image = await prepareImage(
			data.content,
			kind === 'profiles' ? 'avatar' : 'role',
		);
		changes.push({ path: image.relative, source: image.data, version: null });
		if (kind === 'profiles') {
			row = {
				id,
				name: text(record.name, '角色名'),
				alt: text(record.alt, '替代文字'),
				tone: choice(record.tone, options.tone, '色调'),
				weight: 1,
				enabled: true,
				avatar: {
					src: image.image.src,
					width: image.image.width,
					height: image.image.height,
				},
			};
			for (const size of [32, 48])
				changes.push({
					path: `public/favicons/${id}-${size}.png`,
					version: null,
					source: await sharp(image.data).resize(size, size).png().toBuffer(),
				});
		} else {
			const prefix = text(record.prefix, '角色名'),
				name = text(record.name, '英文分类题签');
			const description = text(record.description, '分类介绍');
			row = {
				id,
				title: text(record.title, '中文分类名'),
				titleEn: `${prefix}'s ${name}`,
				subtitle: text(record.subtitle, '中文小题签'),
				subtitleEn: name,
				description,
				descriptionEn: text(record.descriptionEn, '英文介绍'),
				foil: choice(record.foil, options.foil, '光泽样式'),
			};
			const visual = {
				cardInscription: { prefix, name },
				image: image.image,
				description,
				tone: 'blue',
				imagePosition: 'center center',
				imageScale: 1.04,
			};
			changes.push({
				path: catalog.visuals.path,
				version: catalog.visuals.version,
				source: append(catalog.visuals.source, 'visuals', visual, id),
			});
			// Track the new authoring folder, including when the category has no article yet.
			changes.push({
				path: `src/content/weiser-posts/${id}/.gitkeep`,
				source: '',
				version: null,
			});
		}
	}
	changes.push({
		path: existing.path,
		source: append(existing.source, kind, row),
		version: existing.version,
	});
	if (data.preview === true)
		return {
			changes: changes.map((c) => ({
				path: c.path,
				source:
					typeof c.source === 'string' ? c.source : `${c.source.length} bytes`,
			})),
			image: image
				? `data:image/webp;base64,${image.data.toString('base64')}`
				: undefined,
		};
	if (image) await ensureFolder(root, 'public/media');
	if (kind === 'categories') {
		const folder = `src/content/weiser-posts/${id}`;
		// Reject case collisions and Windows device names even on an empty folder.
		await ensureFolder(root, folder);
	}
	// Content-addressed images can be reused, but never replace differing existing bytes.
	if (image) {
		const target = await safePath(root, image.relative, true);
		const old = await fs.readFile(target).catch((e) => {
			if (e.code === 'ENOENT') return null;
			throw e;
		});
		if (old?.equals(image.data))
			changes.splice(
				changes.findIndex((c) => c.path === image!.relative),
				1,
			);
	}
	await writeChanges(root, changes);
	return { id, paths: changes.map((c) => c.path) };
}

export async function uploadQr(root: string, content: unknown) {
	const image = await prepareImage(content, 'qr');
	await ensureFolder(root, 'public/media');
	const file = await safePath(root, image.relative, true);
	const old = await fs.readFile(file).catch((e) => {
		if (e.code === 'ENOENT') return null;
		throw e;
	});
	if (!old?.equals(image.data))
		await writeVersion(root, image.relative, image.data, null);
	return { ...image.image, path: image.relative };
}
