import ts from 'typescript';
import { FOIL_PRESETS } from '../../src/config/visuals/foilPresets';

export const sections = [
	['site', '站点身份', 'src/config/site.ts', 'SITE_CONFIG'],
	['home', '首页区块', 'src/config/pages/home.ts', 'HOME_SECTIONS'],
	['intro', '首页题句', 'src/config/pages/home.ts', 'HOME_ARCHIVE_INTRO'],
	[
		'hero',
		'Hero 欢迎语',
		'src/config/pages/homeGreetings.ts',
		'HOME_GREETINGS',
	],
	[
		'profiles',
		'头像与访问身份',
		'src/config/pages/homeProfiles.ts',
		'HOME_PROFILES',
	],
	['tabs', '标签页祝福', 'src/config/tabGreetings.ts', 'TAB_GREETINGS'],
	['social', '社交链接', 'src/config/pages/home.ts', 'HOME_SOCIAL_LINKS'],
	[
		'contacts',
		'QQ / 微信二维码',
		'src/config/pages/home.ts',
		'HOME_QR_CONTACTS',
	],
	[
		'categories',
		'中文分类介绍',
		'src/config/content/blogCategories.ts',
		'BLOG_CATEGORIES',
	],
	[
		'visuals',
		'角色英文题签与裁切',
		'src/config/visuals/categoryVisuals.ts',
		'VISUAL_COPY',
	],
	['series', '系列介绍', 'src/config/content/blogSeries.ts', 'BLOG_SERIES'],
	['blog', '博客界面文案', 'src/config/pages/blog.ts', 'BLOG_PAGE_CONFIG'],
	[
		'article',
		'文章界面文案',
		'src/config/pages/article.ts',
		'ARTICLE_PAGE_CONFIG',
	],
	[
		'resources',
		'资源界面文案',
		'src/config/pages/resources.ts',
		'RESOURCE_PAGE_CONFIG',
	],
] as const;
export type Section = (typeof sections)[number];
export type Value =
	null | boolean | number | string | Value[] | { [key: string]: Value };
export type Field = {
	kind: string;
	fields?: Record<string, Field>;
	item?: Field;
	options?: string[];
	locked?: boolean;
};
const same = (a: unknown, b: unknown) =>
	JSON.stringify(a) === JSON.stringify(b);
const record = (v: Value): v is Record<string, Value> =>
	v !== null && !Array.isArray(v) && typeof v === 'object';
const unwrap = (n: ts.Expression): ts.Expression =>
	ts.isAsExpression(n) ||
	ts.isSatisfiesExpression(n) ||
	ts.isParenthesizedExpression(n)
		? unwrap(n.expression)
		: n;
function propertyName(n: ts.PropertyName): string {
	return ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : '';
}

/** Only literal data is interpreted. Imports, callbacks and derived expressions never execute here. */
function read(n: ts.Expression, source: ts.SourceFile): Value {
	n = unwrap(n);
	if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))
		return n.text;
	if (ts.isNumericLiteral(n)) return Number(n.text);
	if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
	if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
	if (
		n.kind === ts.SyntaxKind.NullKeyword ||
		(ts.isIdentifier(n) && n.text === 'undefined')
	)
		return null;
	if (
		ts.isPrefixUnaryExpression(n) &&
		n.operator === ts.SyntaxKind.MinusToken &&
		ts.isNumericLiteral(n.operand)
	)
		return -Number(n.operand.text);
	if (
		ts.isBinaryExpression(n) &&
		n.operatorToken.kind === ts.SyntaxKind.PlusToken
	) {
		const left = read(n.left, source),
			right = read(n.right, source);
		if (
			typeof left === 'string' &&
			typeof right === 'string' &&
			literal(n.left) &&
			literal(n.right)
		)
			return left + right;
	}
	if (ts.isArrayLiteralExpression(n))
		return n.elements.map((e) => read(e as ts.Expression, source));
	if (ts.isObjectLiteralExpression(n)) {
		const result: Record<string, Value> = Object.create(null);
		for (const p of n.properties) {
			if (!ts.isPropertyAssignment(p) || !propertyName(p.name))
				throw new Error('该配置包含暂不支持的对象结构');
			result[propertyName(p.name)] = read(p.initializer, source);
		}
		return result;
	}
	return n.getText(source);
}
function literal(n: ts.Expression): boolean {
	n = unwrap(n);
	return (
		ts.isStringLiteral(n) ||
		ts.isNoSubstitutionTemplateLiteral(n) ||
		ts.isNumericLiteral(n) ||
		[
			ts.SyntaxKind.TrueKeyword,
			ts.SyntaxKind.FalseKeyword,
			ts.SyntaxKind.NullKeyword,
		].includes(n.kind) ||
		(ts.isIdentifier(n) && n.text === 'undefined') ||
		(ts.isPrefixUnaryExpression(n) && ts.isNumericLiteral(n.operand)) ||
		(ts.isBinaryExpression(n) &&
			n.operatorToken.kind === ts.SyntaxKind.PlusToken &&
			literal(n.left) &&
			literal(n.right))
	);
}
export const options: Record<string, string[]> = {
	tone: ['warm', 'moon', 'rose', 'violet', 'mist'],
	mood: ['quiet', 'playful', 'poetic', 'hopeful', 'melancholy', 'daily'],
	icon: ['github', 'bilibili', 'email', 'x', 'steam', 'qq', 'wechat'],
	foil: Object.keys(FOIL_PRESETS),
};
function schema(
	n: ts.Expression,
	source: ts.SourceFile,
	section: string,
	key = '',
): Field {
	n = unwrap(n);
	if (
		(section === 'profiles' && key === 'avatar') ||
		(section === 'visuals' && key === 'image')
	)
		return { kind: 'readonly' };
	if (ts.isArrayLiteralExpression(n)) {
		let item: Field = { kind: 'string' };
		for (const e of n.elements) {
			const next = schema(e as ts.Expression, source, section);
			item =
				item.kind === 'object' && next.kind === 'object'
					? { ...item, fields: { ...item.fields, ...next.fields } }
					: next;
		}
		if (section === 'profiles' && item.fields)
			item.fields.enabled = { kind: 'boolean' };
		if (section === 'hero' && item.fields) {
			item.fields.weight = { kind: 'number' };
			item.fields.mood = { kind: 'string', options: options.mood };
		}
		if (section === 'home' && key === '' && item.fields)
			item.fields.enabled = { kind: 'boolean' };
		return {
			kind: 'array',
			item,
			locked:
				!n.elements.length ||
				['profiles', 'categories', 'series', 'contacts'].includes(section) ||
				(section === 'home' && key === ''),
		};
	}
	if (ts.isObjectLiteralExpression(n)) {
		const fields: Record<string, Field> = {};
		for (const p of n.properties)
			if (ts.isPropertyAssignment(p))
				fields[propertyName(p.name)] = schema(
					p.initializer,
					source,
					section,
					propertyName(p.name),
				);
		if (section === 'visuals' && fields.image) {
			fields.imagePosition ??= { kind: 'string' };
			fields.imageScale ??= { kind: 'number' };
		}
		return { kind: 'object', fields };
	}
	if (
		!literal(n) ||
		(key === 'id' &&
			['home', 'profiles', 'categories', 'series', 'contacts'].includes(
				section,
			))
	)
		return { kind: 'readonly' };
	const value = read(n, source);
	if (key === 'tone' && section !== 'profiles') return { kind: 'readonly' };
	if (key === 'category') return { kind: 'readonly' };
	if (key === 'compactMediaQuery' || (section === 'home' && key === 'type'))
		return { kind: 'readonly' };
	if (section === 'contacts' && key === 'icon') return { kind: 'readonly' };
	if (section === 'article' && typeof value !== 'string')
		return { kind: 'readonly' };
	return {
		kind: value === null ? 'string' : typeof value,
		...(options[key] ? { options: options[key] } : {}),
	};
}

export function parseConfig(text: string, section: Section) {
	const diagnostics = ts.transpileModule(text, {
		fileName: section[2],
		reportDiagnostics: true,
	}).diagnostics;
	if (diagnostics?.some((d) => d.category === ts.DiagnosticCategory.Error))
		throw new Error('配置存在语法错误，请先修复源文件');
	const source = ts.createSourceFile(
		section[2],
		text,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	let node: ts.Expression | undefined;
	for (const statement of source.statements)
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations)
				if (
					ts.isIdentifier(declaration.name) &&
					declaration.name.text === section[3]
				)
					node = declaration.initializer;
		}
	if (!node) throw new Error('未找到配置声明，请修复源文件后重新读取');
	return {
		source,
		node: unwrap(node),
		value: read(node, source),
		schema: schema(node, source, section[0]),
	};
}

function validate(value: Value, old: Value, field: Field, label = ''): void {
	if (same(value, old)) return;
	if (field.kind === 'readonly') {
		if (!same(value, old)) throw new Error(`${label} 是受保护的派生值或标识`);
		return;
	}
	if (field.kind === 'array') {
		if (!Array.isArray(value) || !value.length || value.length > 500)
			throw new Error(`${label} 至少保留一项，最多 500 项`);
		const before = old as Value[];
		if (
			field.locked &&
			(value.length !== before.length ||
				value.some(
					(v, i) =>
						record(v) &&
						(!record(before[i]) ||
							v.id !== (before[i] as Record<string, Value>).id),
				))
		)
			throw new Error(`${label} 暂不支持新增、删除或移动现有标识`);
		value.forEach((v, i) => {
			const prior =
				record(v) && v.id
					? before.find((x) => record(x) && x.id === v.id)
					: before[i];
			validate(v, prior ?? before[0], field.item!, `${label}[${i + 1}]`);
		});
		const ids = value
			.filter(record)
			.map((v) => v.id)
			.filter(Boolean);
		if (new Set(ids).size !== ids.length) throw new Error('ID 不能重复');
		return;
	}
	if (field.kind === 'object') {
		if (!record(value)) throw new Error(`${label} 不是对象`);
		for (const key of Object.keys(value)) {
			if (!Object.hasOwn(field.fields!, key))
				throw new Error(`不允许增加 ${key}`);
			validate(
				value[key],
				record(old) ? (old[key] ?? null) : null,
				field.fields![key],
				`${label}.${key}`,
			);
		}
		for (const key of Object.keys(record(old) ? old : {}))
			if (!Object.hasOwn(value, key)) throw new Error(`不能移除字段 ${key}`);
		return;
	}
	if (typeof value !== field.kind) throw new Error(`${label} 类型错误`);
	if (
		typeof value === 'number' &&
		(!Number.isFinite(value) || value < 0 || value > 1e6)
	)
		throw new Error(`${label} 数值无效`);
	if (/\.imageScale$/.test(label) && (Number(value) < 1 || Number(value) > 2))
		throw new Error('图片缩放限制在 1–2 之间');
	if (typeof value === 'string') {
		if (
			value.length > 40000 ||
			(typeof old === 'string' && old.trim() && !value.trim())
		)
			throw new Error(`${label} 不能为空或过长`);
		if (field.options && !field.options.includes(value))
			throw new Error(`${label} 不在允许选项中`);
		const placeholders =
			typeof old === 'string' ? (old.match(/\{\w+\}/g) ?? []) : [];
		if (placeholders.some((p) => !value.includes(p)))
			throw new Error(`${label} 必须保留占位符 ${placeholders.join('、')}`);
		if (
			/\.(href|url)$/.test(label) &&
			value &&
			(!/^(?:\/(?!\/)|https:\/\/|mailto:)/.test(value) ||
				/[\\\s\u0000-\u001f]/.test(value))
		)
			throw new Error(`${label} 只接受站内路径、HTTPS 或 mailto 链接`);
		if (/\.id$/.test(label) && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))
			throw new Error('ID 只能使用小写英文、数字和连接号');
		if (
			/\.imagePosition$/.test(label) &&
			!/^(?:(?:left|right|top|bottom|center|\d{1,3}(?:\.\d+)?%)\s?){1,2}$/.test(
				value,
			)
		)
			throw new Error('裁切位置应使用 center top 或百分比');
	}
}

/** Edit only changed literals; unchanged expressions, comments and type annotations stay byte-for-byte. */
function render(n: ts.Expression, value: Value, source: ts.SourceFile): string {
	n = unwrap(n);
	if (same(read(n, source), value)) return n.getText(source);
	const edits: { start: number; end: number; text: string }[] = [];
	if (ts.isObjectLiteralExpression(n) && record(value)) {
		const known = new Set<string>();
		for (const p of n.properties)
			if (ts.isPropertyAssignment(p)) {
				const key = propertyName(p.name);
				known.add(key);
				if (!same(read(p.initializer, source), value[key]))
					edits.push({
						start: p.initializer.getStart(source),
						end: p.initializer.end,
						text: render(p.initializer, value[key], source),
					});
			}
		const added = Object.keys(value).filter((k) => !known.has(k));
		if (added.length) {
			const pos = n.properties.end;
			edits.push({
				start: pos,
				end: pos,
				text: `${n.properties.hasTrailingComma || !n.properties.length ? '' : ','}\n${added.map((k) => `${JSON.stringify(k)}: ${JSON.stringify(value[k])},`).join('\n')}`,
			});
		}
	} else if (ts.isArrayLiteralExpression(n) && Array.isArray(value)) {
		const before = read(n, source) as Value[];
		if (value.length === n.elements.length) {
			n.elements.forEach((e, i) =>
				edits.push({
					start: e.getStart(source),
					end: e.end,
					text: render(e as ts.Expression, value[i], source),
				}),
			);
		} else {
			// Do not discard author comments when changing list structure.
			const scanner = ts.createScanner(
				ts.ScriptTarget.Latest,
				false,
				ts.LanguageVariant.Standard,
				n.getText(source),
			);
			for (
				let token = scanner.scan();
				token !== ts.SyntaxKind.EndOfFileToken;
				token = scanner.scan()
			)
				if (
					[
						ts.SyntaxKind.SingleLineCommentTrivia,
						ts.SyntaxKind.MultiLineCommentTrivia,
					].includes(token)
				)
					throw new Error(
						'此列表含作者注释，请在源码中增删，后台仍可修改现有值',
					);
			return (
				'[\n' +
				value
					.map((v) => {
						const index =
							record(v) && v.id
								? before.findIndex((old) => record(old) && old.id === v.id)
								: before.findIndex((old) => same(v, old));
						return index >= 0
							? render(n.elements[index] as ts.Expression, v, source)
							: JSON.stringify(v, null, 2);
					})
					.join(',\n') +
				',\n]'
			);
		}
	} else {
		if (!literal(n)) throw new Error('不能修改执行表达式');
		return JSON.stringify(value);
	}
	let text = n.getText(source),
		start = n.getStart(source);
	for (const edit of edits.sort((a, b) => b.start - a.start))
		text =
			text.slice(0, edit.start - start) +
			edit.text +
			text.slice(edit.end - start);
	return text;
}

export function updateConfig(
	text: string,
	section: Section,
	value: Value,
): string {
	const parsed = parseConfig(text, section);
	validate(value, parsed.value, parsed.schema);
	if (['hero', 'tabs'].includes(section[0]) && !(value as Value[]).length)
		throw new Error('至少保留一句问候语');
	if (section[0] === 'site') {
		const image = (value as Record<string, Value>).shareImage as Record<
			string,
			Value
		>;
		if (
			!Number.isInteger(image.width) ||
			!Number.isInteger(image.height) ||
			Number(image.width) < 1 ||
			Number(image.height) < 1
		)
			throw new Error('分享图尺寸必须为正整数');
		if (
			typeof image.type !== 'string' ||
			!/^image\/(png|jpeg|webp|avif|gif)$/.test(image.type)
		)
			throw new Error('分享图类型无效');
	}
	if (section[0] === 'hero') {
		const rows = value as Record<string, Value>[];
		if (
			rows.some((v) => Number(v.dayAffinity) > 1) ||
			!rows.some((v) => Number(v.weight ?? 1) > 0)
		)
			throw new Error('昼夜偏好需在 0–1 之间，且至少保留一个正权重句子');
	}
	if (
		section[0] === 'profiles' &&
		!(value as Record<string, Value>[]).some(
			(v) => v.enabled !== false && Number(v.weight ?? 1) > 0,
		)
	)
		throw new Error('至少保留一套启用且权重大于零的头像');
	const result =
		text.slice(0, parsed.node.getStart(parsed.source)) +
		render(parsed.node, value, parsed.source) +
		text.slice(parsed.node.end);
	const check = parseConfig(result, section);
	if (!same(check.value, value)) throw new Error('配置往返校验失败，没有保存');
	return result;
}
