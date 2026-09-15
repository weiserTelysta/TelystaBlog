import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import ts from 'typescript';
import { sections, parseConfig, updateConfig, type Value } from './config';
import { AdminError, readVersion, safePath, writeVersion } from './store';
import {
	loadContentDocuments,
	parseContentDocument,
	validatePostDocuments,
} from '../lib/content-validation';
import { getWeightedGreeting } from '../../src/lib/homeGreeting';
import type { HomeGreeting } from '../../src/config/pages/homeGreetings';
import { describePost, patchPostFields } from './post-fields';
import { renderPostPreview } from './post-preview';
import { readCatalog, createCatalogEntry, uploadQr } from './catalog';
import { SOCIAL_ICON_PATHS } from '../../src/config/visuals/socialIcons';
import { FOIL_PRESETS } from '../../src/config/visuals/foilPresets';

const exec = promisify(execFile);
const directory = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(directory, '../..');
const staticFiles: Record<string, { file: string; type: string }> = {
	'/': {
		file: path.join(directory, 'ui/index.html'),
		type: 'text/html; charset=utf-8',
	},
	'/app.js': {
		file: path.join(directory, 'ui/app.js'),
		type: 'text/javascript; charset=utf-8',
	},
	'/style.css': {
		file: path.join(directory, 'ui/style.css'),
		type: 'text/css; charset=utf-8',
	},
	'/foil.css': {
		file: path.join(projectRoot, 'src/styles/category-foil.css'),
		type: 'text/css; charset=utf-8',
	},
	'/role-font.ttf': {
		file: path.join(projectRoot, 'src/assets/fonts/MonteCarlo-Regular.ttf'),
		type: 'font/ttf',
	},
};
const POST_ROOT = 'src/content/weiser-posts/';
const mime: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
};

export function createAdminServer(root = projectRoot) {
	const token = randomBytes(32).toString('hex');
	const previewNonce = randomBytes(24).toString('base64');
	let origin = '';
	let queue = Promise.resolve();
	let job: { running: boolean; output: string; exitCode: number | null } = {
		running: false,
		output: '',
		exitCode: null,
	};
	const mediaFiles = new Map<string, string>();
	async function localImage(relative: string) {
		await safePath(root, relative);
		mediaFiles.set(relative, relative);
		return `/api/image?id=${encodeURIComponent(relative)}`;
	}
	const mutate = <T>(fn: () => Promise<T>): Promise<T> => {
		const next = queue.then(() => {
			if (job.running)
				throw new AdminError('检查运行期间暂停保存，请稍后重试', 409);
			return fn();
		});
		queue = next.then(
			() => undefined,
			() => undefined,
		);
		return next;
	};
	const payload = async (req: http.IncomingMessage) => {
		const chunks: Buffer[] = [];
		let size = 0;
		for await (const chunk of req) {
			size += chunk.length;
			if (size > 12 * 1024 * 1024) throw new AdminError('请求过大', 413);
			chunks.push(chunk);
		}
		try {
			return JSON.parse(Buffer.concat(chunks).toString('utf8'));
		} catch {
			throw new AdminError('无效 JSON');
		}
	};
	const postPath = (value: unknown): string => {
		if (
			typeof value !== 'string' ||
			!value.startsWith(POST_ROOT) ||
			!value.endsWith('.md')
		)
			throw new AdminError('只允许编辑文章 Markdown');
		return value;
	};
	async function inspectPost(relative: string, source: string) {
		const file = await safePath(root, relative, true);
		const catalog = await readCatalog(root);
		const categories = (
			catalog.categories.value as Record<string, Value>[]
		).map((c) => String(c.id));
		const categoryIds = new Set(categories);
		const seriesIds = (catalog.series.value as Record<string, Value>[]).map(
			(c) => String(c.id),
		);
		const document = parseContentDocument(
			file,
			source,
			'post',
			root,
			categoryIds,
		);
		const meta = document.frontmatter;
		if (typeof meta.series === 'string') {
			const series = catalog.series.value as Record<string, Value>[];
			const selected = series.find((item) => item.id === meta.series);
			if (selected && selected.category !== meta.category)
				throw new AdminError('所选系列与文章分类不一致，请同时核对分类和系列');
		}
		if (meta.draft !== undefined && typeof meta.draft !== 'boolean')
			throw new AdminError('draft 必须是 true 或 false');
		if (
			meta.tags !== undefined &&
			(!Array.isArray(meta.tags) ||
				meta.tags.some((t) => typeof t !== 'string'))
		)
			throw new AdminError('tags 必须是字符串列表');
		for (const key of ['cover', 'series'])
			if (meta[key] !== undefined && typeof meta[key] !== 'string')
				throw new AdminError(`${key} 必须是字符串`);
		const documents = loadContentDocuments(root, categoryIds).filter(
			(item) => item.relativePath !== relative,
		);
		const issues = [
			...document.parseIssues,
			...validatePostDocuments([...documents, document], root, {
				categories,
				series: seriesIds,
			}),
		].filter((issue) => issue.filePath === relative);
		if (issues.some((issue) => issue.severity === 'error'))
			throw new AdminError(
				issues
					.map(
						(issue) =>
							`${issue.line ? `第 ${issue.line} 行：` : ''}${issue.message}`,
					)
					.join('\n'),
			);
		return {
			metadata: document.frontmatter,
			warnings: issues.map((issue) => issue.message),
		};
	}
	async function collectMedia() {
		const list: {
			label: string;
			source: string;
			url: string;
			publicUrl?: string;
			reference: string;
			width?: number;
			height?: number;
		}[] = [];
		const manifest = JSON.parse(
			await fs.readFile(
				await safePath(root, 'src/generated/cdn-assets.json'),
				'utf8',
			),
		);
		for (const [key, value] of Object.entries(manifest.assets) as [
			string,
			{
				display?: { path: string; width?: number; height?: number };
				cover?: { path: string };
			},
		][]) {
			if (!value.display) continue;
			const url = new URL(
				(value.cover ?? value.display).path
					.split('/')
					.map(encodeURIComponent)
					.join('/'),
				manifest.origin,
			);
			if (url.protocol !== 'https:' || url.hostname !== 'assets.telysta.com')
				continue;
			const publicUrl = new URL(
				value.display.path.split('/').map(encodeURIComponent).join('/'),
				manifest.origin,
			).href;
			list.push({
				label: key,
				source: 'R2',
				url: url.href,
				publicUrl,
				reference: `asset:${key}`,
				width: value.display.width,
				height: value.display.height,
			});
		}
		const profilesSection = sections.find((s) => s[0] === 'profiles')!;
		const profiles = parseConfig(
			(await readVersion(root, profilesSection[2])).source,
			profilesSection,
		).value as Record<string, Value>[];
		for (const profile of profiles) {
			const avatar = profile.avatar as Record<string, Value>;
			if (avatar && typeof avatar.src === 'string') continue;
			const match = String(profile.avatar).match(
				/^createCdnAvatar\(['"]([^'"]+)['"]\)$/,
			);
			if (!match) continue;
			const url = `https://assets.telysta.com/avatars/${encodeURIComponent(match[1])}`;
			list.push({
				label: String(profile.id),
				source: 'R2 头像',
				url,
				publicUrl: url,
				reference: url,
				width: 384,
				height: 384,
			});
		}
		for (const folder of [
			'src/assets/contact',
			'src/assets/images/accordion',
			'public/favicons',
			'public/media',
		]) {
			if (!(await fs.stat(path.join(root, folder)).catch(() => null))) continue;
			await safePath(root, folder);
			for (const name of await fs.readdir(path.join(root, folder))) {
				if (!mime[path.extname(name).toLowerCase()]) continue;
				const relative = `${folder}/${name}`;
				await safePath(root, relative);
				const id = relative;
				mediaFiles.set(id, relative);
				list.push({
					label: name,
					source: folder.includes('favicons') ? 'favicon' : '本地',
					url: `/api/image?id=${encodeURIComponent(id)}`,
					reference: relative.startsWith('public/')
						? relative.slice(6)
						: relative,
				});
			}
		}
		return list;
	}
	async function previewImage(relative: string, imageSource: string) {
		try {
			if (/^https:\/\//.test(imageSource)) {
				const url = new URL(imageSource);
				return url.hostname === 'assets.telysta.com' ? url.href : undefined;
			}
			if (/^[a-z]+:|^\/\//i.test(imageSource)) return undefined;
			const decoded = decodeURIComponent(imageSource.split(/[?#]/)[0]);
			const imagePath = decoded.startsWith('/')
				? `public${decoded}`
				: path.posix.normalize(
						path.posix.join(path.posix.dirname(relative), decoded),
					);
			if (
				![POST_ROOT, 'src/assets/images/', 'public/'].some((prefix) =>
					imagePath.startsWith(prefix),
				) ||
				!mime[path.extname(imagePath).toLowerCase()]
			)
				return undefined;
			const file = await safePath(root, imagePath);
			if ((await fs.stat(file)).size > 8 * 1024 * 1024) return undefined;
			const image = sharp(await fs.readFile(file), {
				limitInputPixels: 24_000_000,
			});
			if (
				!['png', 'jpeg', 'webp'].includes((await image.metadata()).format ?? '')
			)
				return undefined;
			const bytes = await image
				.resize({
					width: 1200,
					height: 1200,
					fit: 'inside',
					withoutEnlargement: true,
				})
				.webp()
				.toBuffer();
			return `data:image/webp;base64,${bytes.toString('base64')}`;
		} catch {
			return undefined;
		}
	}
	const server = http.createServer(async (req, res) => {
		const send = (data: unknown, status = 200) => {
			res.writeHead(status, {
				'Content-Type': 'application/json; charset=utf-8',
			});
			res.end(JSON.stringify(data));
		};
		res.setHeader('Cache-Control', 'no-store');
		res.setHeader('X-Content-Type-Options', 'nosniff');
		res.setHeader('Referrer-Policy', 'no-referrer');
		res.setHeader(
			'Content-Security-Policy',
			`default-src 'self'; script-src 'self'; style-src 'self' 'nonce-${previewNonce}'; img-src 'self' https://assets.telysta.com data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
		);
		try {
			const address = server.address();
			if (!address || typeof address === 'string')
				throw new AdminError('服务尚未就绪', 503);
			origin = `http://127.0.0.1:${address.port}`;
			if (
				req.headers.host !== `127.0.0.1:${address.port}` ||
				(req.headers.origin && req.headers.origin !== origin) ||
				(req.headers['sec-fetch-site'] &&
					!['same-origin', 'none'].includes(
						String(req.headers['sec-fetch-site']),
					))
			)
				throw new AdminError('不允许的请求来源', 403);
			const url = new URL(req.url ?? '/', origin);
			if (url.pathname === '/api/session' && req.method === 'GET')
				return send({
					token,
					sections: sections.map(([id, label]) => ({ id, label })),
					preview: 'http://127.0.0.1:4321/',
					icons: SOCIAL_ICON_PATHS,
					foils: FOIL_PRESETS,
				});
			if (!url.pathname.startsWith('/api/')) {
				if (req.method !== 'GET') throw new AdminError('方法不允许', 405);
				const asset = Object.hasOwn(staticFiles, url.pathname)
					? staticFiles[url.pathname]
					: undefined;
				if (!asset) throw new AdminError('未找到', 404);
				const bytes = await fs.readFile(asset.file);
				res.writeHead(200, { 'Content-Type': asset.type });
				return res.end(bytes);
			}
			if (url.pathname === '/api/image' && req.method === 'GET') {
				const relative = mediaFiles.get(url.searchParams.get('id') ?? '');
				if (!relative) throw new AdminError('图片未登记', 404);
				const file = await safePath(root, relative);
				const bytes = await fs.readFile(file);
				res.writeHead(200, { 'Content-Type': mime[path.extname(file)] });
				return res.end(bytes);
			}
			if (req.headers['x-telysta-token'] !== token)
				throw new AdminError('会话已失效，请重新打开后台', 403);
			if (
				req.method === 'POST' &&
				req.headers['content-type'] !== 'application/json'
			)
				throw new AdminError('请求格式错误', 415);
			if (url.pathname === '/api/catalog' && req.method === 'GET') {
				const catalog = await readCatalog(root);
				return send({
					versions: Object.fromEntries(
						Object.entries(catalog).map(([id, v]) => [id, v.version]),
					),
					categories: catalog.categories.value,
				});
			}
			if (url.pathname === '/api/catalog' && req.method === 'POST') {
				const data = await payload(req);
				return send(await mutate(() => createCatalogEntry(root, data)));
			}
			if (url.pathname === '/api/qr-upload' && req.method === 'POST') {
				const data = await payload(req);
				const result = await mutate(() => uploadQr(root, data.content));
				return send({ ...result, preview: await localImage(result.path) });
			}
			if (url.pathname === '/api/config') {
				const section = sections.find(
					(item) => item[0] === url.searchParams.get('id'),
				);
				if (!section) throw new AdminError('未知配置', 404);
				if (req.method === 'GET') {
					const current = await readVersion(root, section[2]);
					const parsed = parseConfig(current.source, section);
					const previews: Record<string, string> = {};
					if (section[0] === 'profiles')
						for (const profile of parsed.value as Record<string, Value>[])
							previews[String(profile.id)] = await localImage(
								`public/favicons/${profile.id}-48.png`,
							);
					if (section[0] === 'visuals')
						for (const statement of parsed.source.statements) {
							if (
								!ts.isImportDeclaration(statement) ||
								!statement.importClause?.name ||
								!ts.isStringLiteral(statement.moduleSpecifier)
							)
								continue;
							const relative = path.posix.normalize(
								path.posix.join(
									path.posix.dirname(section[2]),
									statement.moduleSpecifier.text,
								),
							);
							if (
								!relative.startsWith('src/assets/images/accordion/') ||
								!mime[path.posix.extname(relative)]
							)
								continue;
							previews[statement.importClause.name.text] =
								await localImage(relative);
						}
					const entries = Array.isArray(parsed.value)
						? parsed.value
						: Object.values(parsed.value as Record<string, Value>);
					for (const row of entries as Record<string, Value>[]) {
						if (!row || typeof row !== 'object') continue;
						const src =
							(row.avatar as Record<string, Value>)?.src ??
							(row.image as Record<string, Value>)?.src ??
							row.imageSrc;
						if (typeof src === 'string') {
							previews[src] = src.startsWith('/media/')
								? await localImage('public' + src)
								: src.startsWith('src/assets/contact/')
									? await localImage(src)
									: src;
						}
					}

					return send({
						...current,
						value: parsed.value,
						schema: parsed.schema,
						previews,
						path: section[2],
						label: section[1],
					});
				}
				if (req.method === 'POST') {
					const data = await payload(req);
					return send(
						await mutate(async () => {
							const current = await readVersion(root, section[2]);
							if (data.version !== current.version)
								throw new AdminError(
									'配置文件已变化，请保留输入并重新读取后合并',
									409,
								);
							const source = updateConfig(
								current.source,
								section,
								data.value as Value,
							);
							if (section[0] === 'contacts')
								for (const contact of data.value) {
									const src = contact.imageSrc;
									if (typeof src !== 'string')
										throw new AdminError('请填写图片地址');
									if (/^https:\/\/assets\.telysta\.com\/[^\s\\]+$/.test(src))
										continue;
									if (
										!/^(?:src\/assets\/contact\/|\/media\/)[^/]+\.(png|jpe?g|webp)$/i.test(
											src,
										)
									)
										throw new AdminError(
											'请选择本地二维码，或填写 assets.telysta.com 的 HTTPS 图片地址',
										);
									await safePath(
										root,
										src.startsWith('/') ? 'public' + src : src,
									);
								}

							if (data.preview) return { source, previous: current.source };
							return writeVersion(root, section[2], source, data.version);
						}),
					);
				}
			}
			if (url.pathname === '/api/greeting-preview' && req.method === 'POST') {
				const data = await payload(req);
				if (!Number.isInteger(data.hour) || data.hour < 0 || data.hour > 23)
					throw new AdminError('小时应为 0–23 的整数');
				const section = sections.find((s) => s[0] === 'hero')!;
				const current = await readVersion(root, section[2]);
				updateConfig(current.source, section, data.value);
				return send(
					getWeightedGreeting(
						data.hour,
						Math.random,
						data.value as HomeGreeting[],
					),
				);
			}
			if (url.pathname === '/api/posts' && req.method === 'GET') {
				const catalog = await readCatalog(root);
				const categoryIds = new Set(
					(catalog.categories.value as Record<string, Value>[]).map((c) =>
						String(c.id),
					),
				);
				const posts = loadContentDocuments(root, categoryIds)
					.filter((d) => d.kind === 'post')
					.map((d) => ({
						path: d.relativePath,
						title: d.frontmatter.title ?? path.basename(d.filePath),
						draft: d.frontmatter.draft === true,
						category: d.frontmatter.category,
					}));
				const folders = await fs.readdir(
					await safePath(root, POST_ROOT.slice(0, -1)),
					{ withFileTypes: true },
				);
				return send({
					posts,
					folders: folders
						.filter((f) => f.isDirectory() && !f.isSymbolicLink())
						.map((f) => f.name),
				});
			}
			if (url.pathname === '/api/post-fields' && req.method === 'POST') {
				const data = await payload(req),
					relative = postPath(data.path);
				await safePath(root, relative, true);
				if (typeof data.source !== 'string' || data.source.length > 2e6)
					throw new AdminError('正文无效或过大');
				const source =
					data.patch === undefined
						? data.source
						: patchPostFields(data.source, data.patch);
				const catalog = await readCatalog(root);
				const categories = catalog.categories.value as Record<string, Value>[];
				return send({
					source,
					...describePost(
						source,
						relative,
						new Set(categories.map((c) => String(c.id))),
					),
					categories,
					series: catalog.series.value,
				});
			}
			if (url.pathname === '/api/post') {
				if (req.method === 'GET') {
					const relative = postPath(url.searchParams.get('path'));
					return send({
						...(await readVersion(root, relative)),
						path: relative,
					});
				}
				if (req.method === 'POST') {
					const data = await payload(req);
					const relative = postPath(data.path);
					if (typeof data.source !== 'string' || data.source.length > 2e6)
						throw new AdminError('正文为空或过大');
					return send(
						await mutate(async () => {
							const info = await inspectPost(relative, data.source);
							if (data.version === null && info.metadata.draft !== true)
								throw new AdminError('新文章必须先保存为草稿');
							if (data.preview)
								return {
									...info,
									html: await renderPostPreview(
										data.source,
										String(info.metadata.title),
										previewNonce,
										(src) => previewImage(relative, src),
									),
								};
							return {
								...(await writeVersion(
									root,
									relative,
									data.source,
									data.version,
								)),
								...info,
							};
						}),
					);
				}
			}
			if (url.pathname === '/api/media' && req.method === 'GET')
				return send(await collectMedia());
			if (url.pathname === '/api/upload' && req.method === 'POST') {
				const data = await payload(req);
				return send(
					await mutate(async () => {
						const relative = String(data.path);
						const validContact =
							/^src\/assets\/contact\/[^/]+\.(png|jpe?g)$/i.test(relative);
						const validArticle =
							relative.startsWith(POST_ROOT) &&
							/\.(png|jpe?g)$/i.test(relative);
						if (!validContact && !validArticle)
							throw new AdminError('仅允许上传二维码或文章 PNG / JPEG 图片');
						const bytes = Buffer.from(data.content, 'base64');
						if (bytes.length > 8 * 1024 * 1024)
							throw new AdminError('图片最大 8 MiB');
						const metadata = await sharp(bytes, {
							limitInputPixels: 24_000_000,
						}).metadata();
						if (
							!['png', 'jpeg'].includes(metadata.format ?? '') ||
							(metadata.format === 'png') !==
								relative.toLowerCase().endsWith('.png')
						)
							throw new AdminError('真实图片格式与扩展名不一致');
						await sharp(bytes, { limitInputPixels: 24_000_000 }).stats();
						return writeVersion(root, relative, bytes, null);
					}),
				);
			}
			if (url.pathname === '/api/history' && req.method === 'GET') {
				const args = [
					'log',
					'-20',
					'--date=short',
					'--format=%h %ad %s',
					'--',
					'src/config',
					'src/content',
				];
				const [history, status] = await Promise.all([
					exec('git', args, { cwd: root, maxBuffer: 500_000 }),
					exec('git', ['status', '--short'], { cwd: root, maxBuffer: 500_000 }),
				]);
				return send({ history: history.stdout, status: status.stdout });
			}
			if (url.pathname === '/api/check') {
				if (req.method === 'GET') return send(job);
				if (req.method === 'POST') {
					await mutate(async () => {
						const cli = process.env.npm_execpath;
						if (!cli || !cli.endsWith('npm-cli.js'))
							throw new AdminError('请通过 npm run admin 启动以使用项目检查');
						job = { running: true, output: '', exitCode: null };
						const child = spawn(process.execPath, [cli, 'run', 'check'], {
							cwd: root,
							windowsHide: true,
							shell: false,
						});
						const append = (chunk: Buffer) => {
							job.output = (job.output + chunk.toString()).slice(-150_000);
						};
						child.stdout.on('data', append);
						child.stderr.on('data', append);
						child.on('error', (error) => {
							job.output += error.message;
							job.running = false;
							job.exitCode = 1;
						});
						child.on('close', (code) => {
							job.running = false;
							job.exitCode = code ?? 1;
						});
					});
					return send(job, 202);
				}
			}
			throw new AdminError('接口或方法不存在', 404);
		} catch (error) {
			send(
				{ error: error instanceof Error ? error.message : '操作失败' },
				error instanceof AdminError ? error.status : 400,
			);
		}
	});
	return server;
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const port = Number(process.env.TELYSTA_ADMIN_PORT ?? 4323);
	if (!Number.isInteger(port) || port < 1024 || port > 65535)
		throw new Error('TELYSTA_ADMIN_PORT 无效');
	const server = createAdminServer();
	server.on('error', (error) => {
		console.error(`后台启动失败：${error.message}`);
		process.exitCode = 1;
	});
	server.listen(port, '127.0.0.1', () =>
		console.log(
			`Telysta 本地管理：http://127.0.0.1:${port}/\n网站预览另运行 npm run dev。保存不会提交、推送或写入 R2。`,
		),
	);
}
