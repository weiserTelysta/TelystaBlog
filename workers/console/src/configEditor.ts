import { parse } from '@babel/parser';
import { HttpError } from './http';
import { safeLink } from './documentFields';

export type Label = [string, string];
export type ConfigDefinition = {
	file: string;
	name: string;
	title: Label;
	description: Label;
	group: string;
};
const definition = (
	file: string,
	name: string,
	title: Label,
	description: Label,
	group = 'pages'
): ConfigDefinition => ({
	file: 'src/config/' + file,
	name,
	title,
	description,
	group
});
export const CONFIG_DEFINITIONS: ConfigDefinition[] = [
	definition(
		'site.ts',
		'SITE_CONFIG',
		['站点身份与分享', 'Site identity & sharing'],
		[
			'站点名称、简介、作者、分享图片和主导航。',
			'Site name, description, author, social image and primary navigation.'
		],
		'site'
	),
	definition(
		'pages/home.ts',
		'HOME_SECTIONS',
		['首页内容与导航', 'Home content & navigation'],
		[
			'首页文字、见我、画廊、书室及世界观入口。',
			'Home writing and links to About, Gallery, Library and Annals.'
		],
		'home'
	),
	definition(
		'pages/home.ts',
		'HOME_ARCHIVE_INTRO',
		['首页文章导语', 'Home archive intro'],
		[
			'首页文章列表上方的导语短句。',
			'A short lead-in above the article list on the home page.'
		],
		'home'
	),
	definition(
		'pages/home.ts',
		'HOME_SOCIAL_LINKS',
		['社交链接', 'Social links'],
		[
			'首页底部的社交账号与联系方式。',
			'Social accounts and contact links in the home footer.'
		],
		'home'
	),
	definition(
		'pages/home.ts',
		'HOME_QR_CONTACTS',
		['联系二维码', 'Contact QR images'],
		[
			'QQ和微信二维码的名称与图片。',
			'Names and images for QQ and WeChat contacts.'
		],
		'home'
	),
	definition(
		'pages/homeGreetings.ts',
		'HOME_GREETINGS',
		['欢迎语', 'Greetings'],
		[
			'头像下随机显示的问候语及出现偏好。',
			'Random greetings below the avatar and their display preferences.'
		],
		'home'
	),
	definition(
		'pages/homeProfiles.ts',
		'HOME_PROFILES',
		['头像与身份', 'Avatars & identities'],
		[
			'首页访问身份、头像说明、权重和启用状态。',
			'Home identities, avatar descriptions, weights and availability.'
		],
		'home'
	),
	definition(
		'tabGreetings.ts',
		'TAB_GREETINGS',
		['非活动标签页文案', 'Inactive-tab messages'],
		[
			'浏览器标签页处于非活动状态时显示的短句。',
			'Short messages shown while the browser tab is inactive.'
		],
		'home'
	),
	definition(
		'pages/blog.ts',
		'BLOG_PAGE_CONFIG',
		['文章列表与搜索', 'Article list & search'],
		[
			'文章导航、搜索反馈、分类与系列界面文案。',
			'Article navigation, search feedback, categories and series labels.'
		]
	),
	definition(
		'pages/article.ts',
		'ARTICLE_PAGE_CONFIG',
		['文章阅读', 'Article reading'],
		[
			'文章目录、图片查看、代码复制与系列导航。',
			'Contents, image viewer, code copy and series navigation.'
		]
	),
	definition(
		'pages/resources.ts',
		'RESOURCE_PAGE_CONFIG',
		['画廊界面', 'Gallery interface'],
		[
			'作品筛选、图片查看与下载的界面文案。',
			'Labels for filtering, viewing and downloading artwork.'
		]
	),
	definition(
		'pages/ebooks.ts',
		'EBOOK_PAGE_CONFIG',
		['书室界面', 'Library interface'],
		[
			'书室说明、空书架反馈及下载文案。',
			'Library descriptions, empty states and download labels.'
		]
	),
	definition(
		'content/blogCategories.ts',
		'BLOG_CATEGORIES',
		['文章分类', 'Article categories'],
		[
			'文章分类名称、说明及英文对应。固定编号不随名称变化。',
			'Category names and descriptions in both languages. IDs remain stable.'
		],
		'content'
	),
	definition(
		'content/blogSeries.ts',
		'BLOG_SERIES',
		['文章系列', 'Article series'],
		[
			'系列名称、说明与所属分类。',
			'Series names, descriptions and their categories.'
		],
		'content'
	),
	definition(
		'content/resourceGallery.ts',
		'RESOURCE_GALLERY_CONFIG',
		['画廊收录', 'Gallery selection'],
		[
			'控制哪些额外图像进入公开画廊。',
			'Select additional images for the public gallery.'
		],
		'content'
	),
	definition(
		'content/resourceTypes.ts',
		'RESOURCE_TYPES',
		['作品类型', 'Work types'],
		['作品类型的名称与说明。', 'Names and descriptions for work types.'],
		'content'
	),
	definition(
		'visuals/categoryVisuals.ts',
		'VISUAL_COPY',
		['分类图片与题签', 'Category images & labels'],
		[
			'分类插画、英文题签、裁切与缩放。',
			'Category artwork, English labels, crops and scaling.'
		],
		'appearance'
	),
	definition(
		'visuals/foilPresets.ts',
		'FOIL_PRESETS',
		['角色光泽', 'Character finishes'],
		[
			'角色卡片已有的光泽样式。只在需要视觉调优时修改。',
			'Existing character card finishes. Change only for visual tuning.'
		],
		'appearance'
	),
	definition(
		'visuals/socialIcons.ts',
		'SOCIAL_ICON_PATHS',
		['社交图标', 'Social icons'],
		[
			'社交图标的矢量定义，通常无需修改。',
			'Vector definitions for social icons; rarely needs editing.'
		],
		'advanced'
	),
	definition(
		'interactions/scroll.ts',
		'SCROLL_CONFIG',
		['滚动行为', 'Scrolling behavior'],
		[
			'定点跳转的滚动参数，不改变浏览器原生滚动。',
			'Anchor navigation settings, preserving native page scrolling.'
		],
		'advanced'
	),
	definition(
		'interactions/siteChrome.ts',
		'SITE_CHROME_CONFIG',
		['页面辅助控件', 'Page utilities'],
		[
			'阅读进度、返回顶部等辅助功能。',
			'Reading progress, back-to-top and other page utilities.'
		],
		'advanced'
	),
	definition(
		'library.ts',
		'LIBRARY_FILE_ORIGIN',
		['书库连接', 'Library connection'],
		[
			'书库文件服务地址。更换地址还需要同步网关配置。',
			'Library file service address; changes also require gateway configuration.'
		],
		'advanced'
	)
];

type Node = {
	type: string;
	start?: number | null;
	end?: number | null;
	[key: string]: unknown;
};
export type ConfigField = {
	path: Array<string | number>;
	key: string;
	kind: string;
	value?: unknown;
	children?: ConfigField[];
};
function node(value: unknown): Node {
	if (!value || typeof value !== 'object' || !('type' in value))
		throw new HttpError(400, '配置结构暂不支持。');
	return value as Node;
}
function unwrap(value: unknown): Node {
	let n = node(value);
	while (
		[
			'TSAsExpression',
			'TSSatisfiesExpression',
			'ParenthesizedExpression'
		].includes(n.type)
	)
		n = node(n.expression);
	return n;
}
function children(n: Node): Node[] {
	return (Array.isArray(n.properties) ? n.properties : []).map(node);
}
function property(n: Node) {
	const key = node(n.key);
	return typeof key.name === 'string' ? key.name : String(key.value ?? '');
}
function scalar(n: Node): unknown {
	if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(n.type))
		return n.value;
	if (
		n.type === 'NullLiteral' ||
		(n.type === 'Identifier' && n.name === 'undefined')
	)
		return null;
	if (
		n.type === 'TemplateLiteral' &&
		Array.isArray(n.expressions) &&
		!n.expressions.length
	)
		return (
			((n.quasis as Node[])[0]?.value as { cooked?: string })?.cooked ?? ''
		);
	if (
		n.type === 'UnaryExpression' &&
		n.operator === '-' &&
		node(n.argument).type === 'NumericLiteral'
	)
		return -Number(node(n.argument).value);
	return undefined;
}
function describe(
	value: unknown,
	path: Array<string | number> = [],
	key = ''
): ConfigField {
	const n = unwrap(value),
		simple = scalar(n);
	if (simple !== undefined)
		return {
			path,
			key,
			kind:
				key === 'id' ? 'readonly' : simple === null ? 'string' : typeof simple,
			value: simple
		};
	if (n.type === 'ArrayExpression')
		return {
			path,
			key,
			kind: 'array',
			children: (n.elements as unknown[]).map((v, i) =>
				describe(v, [...path, i], String(i + 1))
			)
		};
	if (n.type === 'ObjectExpression')
		return {
			path,
			key,
			kind: 'object',
			children: children(n)
				.filter((p) => p.type === 'ObjectProperty' && !p.computed)
				.map((p) => describe(p.value, [...path, property(p)], property(p)))
		};
	return { path, key, kind: 'readonly', value: null };
}
function declaration(source: string, name: string) {
	try {
		const ast = parse(source, {
			sourceType: 'module',
			plugins: ['typescript']
		});
		for (const statement of ast.program.body) {
			const s: Node =
				statement.type === 'ExportNamedDeclaration' && statement.declaration
					? node(statement.declaration)
					: node(statement);
			if (s.type !== 'VariableDeclaration') continue;
			for (const d of (s.declarations as unknown[]).map(node))
				if (node(d.id).name === name && d.init) return unwrap(d.init);
		}
	} catch (error) {
		if (error instanceof HttpError) throw error;
		throw new HttpError(400, '配置语法无效，请先修复原文。');
	}
	throw new HttpError(400, '未找到对应设置。');
}
export function configSections(source: string, sourcePath: string) {
	return CONFIG_DEFINITIONS.filter((d) => d.file === sourcePath).map((d) => ({
		...d,
		fields: describe(declaration(source, d.name))
	}));
}

export function replaceSeriesArray(source: string, series: unknown[]) {
	const value = declaration(source, 'BLOG_SERIES');
	if (value.type !== 'ArrayExpression') throw new HttpError(400, '文章系列配置格式无效。');
	return source.slice(0, value.start!) + JSON.stringify(series, null, '\t') + source.slice(value.end!);
}

export function patchConfig(
	source: string,
	sourcePath: string,
	name: string,
	patches: unknown
): string {
	if (
		!CONFIG_DEFINITIONS.some((d) => d.file === sourcePath && d.name === name) ||
		!Array.isArray(patches) ||
		patches.length > 1000
	)
		throw new HttpError(400, '设置修改无效。');
	const root = declaration(source, name),
		edits: Array<{ start: number; end: number; text: string }> = [],
		seen = new Set<string>();
	for (const patch of patches) {
		if (
			!patch ||
			typeof patch !== 'object' ||
			!Array.isArray(patch.path) ||
			patch.path.length > 12
		)
			throw new HttpError(400, '设置字段无效。');
		let n = root;
		for (const part of patch.path) {
			if (['__proto__', 'prototype', 'constructor'].includes(String(part)))
				throw new HttpError(400, '设置字段无效。');
			if (
				n.type === 'ArrayExpression' &&
				Number.isSafeInteger(part) &&
				part >= 0
			)
				n = unwrap((n.elements as unknown[])[part]);
			else if (n.type === 'ObjectExpression' && typeof part === 'string') {
				const p = children(n).find(
					(p) =>
						p.type === 'ObjectProperty' && !p.computed && property(p) === part
				);
				if (!p || part === 'id')
					throw new HttpError(400, '固定编号或字段不可修改。');
				n = unwrap(p.value);
			} else throw new HttpError(400, '设置字段不存在。');
		}
		const before = scalar(n),
			value = patch.value,
			key = JSON.stringify(patch.path);
		if (
			before === undefined ||
			(before !== null && typeof value !== typeof before) ||
			(!['string', 'number', 'boolean'].includes(typeof value) &&
				value !== null) ||
			(typeof value === 'number' && !Number.isFinite(value)) ||
			(typeof value === 'string' && value.length > 40000) ||
			seen.has(key)
		)
			throw new HttpError(400, '设置值无效或不支持通过表单修改。');
		const field = String(patch.path.at(-1) || name);
		if (
			typeof value === 'string' &&
			value &&
			/^(href|url|siteUrl|origin|imageSrc|avatarSrc|LIBRARY_FILE_ORIGIN)$/i.test(
				field
			) &&
			!safeLink(value) &&
			!/^asset:[\w/-]+$/.test(value)
		)
			throw new HttpError(
				400,
				'请输入安全的站点路径或HTTPS链接。',
				'DOCUMENT_INVALID'
			);
		seen.add(key);
		edits.push({ start: n.start!, end: n.end!, text: JSON.stringify(value) });
	}
	for (const edit of edits.sort((a, b) => b.start - a.start))
		source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
	declaration(source, name);
	return source;
}
