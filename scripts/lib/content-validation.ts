import fs from 'node:fs';
import path from 'node:path';
import { LineCounter, parseDocument } from 'yaml';
import { BLOG_SERIES_IDS } from '../../src/config/content/blogSeries';

const RESOURCE_IMAGE_DIRECTORIES = [
	'src/assets/images/resources/',
	'src/assets/images/illustration/',
] as const;
const RESOURCE_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);

export type ContentKind = 'post' | 'resource';
export type ValidationSeverity = 'error' | 'warning';

export type ValidationIssue = {
	severity: ValidationSeverity;
	code: string;
	filePath: string;
	message: string;
	line?: number;
};

export type ContentDocument = {
	kind: ContentKind;
	filePath: string;
	relativePath: string;
	frontmatter: Record<string, unknown>;
	body: string;
	bodyStartLine: number;
	parseIssues: ValidationIssue[];
};

export type ContentValidationResult = {
	documents: ContentDocument[];
	issues: ValidationIssue[];
	errorCount: number;
	warningCount: number;
};

export function loadContentDocuments(rootDir: string): ContentDocument[] {
	const groups: Array<{ kind: ContentKind; directory: string }> = [
		{
			kind: 'post',
			directory: path.join(rootDir, 'src', 'content', 'weiser-posts'),
		},
		{
			kind: 'resource',
			directory: path.join(rootDir, 'src', 'content', 'resources'),
		},
	];
	const documents: ContentDocument[] = [];

	for (const group of groups) {
		if (!fs.existsSync(group.directory)) {
			continue;
		}

		for (const filePath of findMarkdownFiles(group.directory)) {
			const source = fs.readFileSync(filePath, 'utf8');
			documents.push(parseContentDocument(filePath, source, group.kind, rootDir));
		}
	}

	return documents.sort((current, next) =>
		current.relativePath.localeCompare(next.relativePath),
	);
}

export function parseContentDocument(
	filePath: string,
	source: string,
	kind: ContentKind,
	rootDir: string,
): ContentDocument {
	const normalizedSource = source.replace(/\r\n/g, '\n');
	const relativePath = toRelativePath(rootDir, filePath);
	const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(normalizedSource);

	if (!match) {
		return {
			kind,
			filePath,
			relativePath,
			frontmatter: {},
			body: normalizedSource,
			bodyStartLine: 1,
			parseIssues: [
				createIssue('error', 'frontmatter-missing', relativePath, '缺少有效的 YAML frontmatter。', 1),
			],
		};
	}

	const lineCounter = new LineCounter();
	const yamlDocument = parseDocument(match[1], {
		lineCounter,
		prettyErrors: false,
		uniqueKeys: true,
	});
	const parseIssues = yamlDocument.errors.map((error) => {
		const position = error.pos[0] ?? 0;
		const line = lineCounter.linePos(position).line + 1;
		return createIssue('error', 'frontmatter-invalid', relativePath, error.message, line);
	});
	const value = parseIssues.length === 0 ? yamlDocument.toJS() : {};
	const frontmatter = isRecord(value) ? value : {};
	const body = normalizedSource.slice(match[0].length);
	const bodyStartLine = match[0].split('\n').length;

	return {
		kind,
		filePath,
		relativePath,
		frontmatter,
		body,
		bodyStartLine,
		parseIssues,
	};
}

export function validatePostDocuments(
	documents: ContentDocument[],
	rootDir: string,
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const seriesOrders = new Map<string, ContentDocument>();

	for (const document of documents.filter((item) => item.kind === 'post')) {
		if (document.parseIssues.length > 0) {
			continue;
		}

		const { frontmatter } = document;
		const series = readString(frontmatter.series);
		const seriesOrder = readNumber(frontmatter.seriesOrder);

		if (series && !BLOG_SERIES_IDS.includes(series as (typeof BLOG_SERIES_IDS)[number])) {
			issues.push(
				createIssue('error', 'series-unknown', document.relativePath, `未知系列：${series}`),
			);
		}

		if (Boolean(series) !== (seriesOrder !== undefined)) {
			issues.push(
				createIssue(
					'error',
					'series-pair',
					document.relativePath,
					'series 与 seriesOrder 必须同时出现。',
				),
			);
		}

		if (series && seriesOrder !== undefined) {
			const key = `${series}::${seriesOrder}`;
			const previous = seriesOrders.get(key);

			if (previous) {
				issues.push(
					createIssue(
						'error',
						'series-order-duplicate',
						document.relativePath,
						`系列 ${series} 的顺序 ${seriesOrder} 已被 ${previous.relativePath} 使用。`,
					),
				);
			} else {
				seriesOrders.set(key, document);
			}
		}

		issues.push(...validateDates(document));

		if (frontmatter.cover !== undefined) {
			const cover = readString(frontmatter.cover);

			if (!cover) {
				issues.push(
					createIssue(
						'error',
						'post-cover-empty',
						document.relativePath,
						'文章 cover 不能是空字符串；没有封面时请删除该字段。',
					),
				);
			} else {
				const coverIssue = validateLocalPath(
					cover,
					document.filePath,
					rootDir,
					'文章 cover 路径',
				);

				if (coverIssue) {
					issues.push(coverIssue);
				}
			}
		}

		const description = readString(frontmatter.description);
		const draft = frontmatter.draft === true;

		if (!draft && isPlaceholderDescription(description)) {
			issues.push(
				createIssue(
					'error',
					'published-placeholder-description',
					document.relativePath,
					'公开文章不能继续使用占位摘要。',
				),
			);
		}

		issues.push(...validateMarkdownBody(document, rootDir));
	}

	return issues;
}

export function validateResourceDocuments(
	documents: ContentDocument[],
	rootDir: string,
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const resourceIds = new Map<string, ContentDocument>();

	for (const document of documents.filter((item) => item.kind === 'resource')) {
		if (document.parseIssues.length > 0) {
			continue;
		}

		const { frontmatter } = document;
		const id = readString(frontmatter.id);

		if (id) {
			const previous = resourceIds.get(id);

			if (previous) {
				issues.push(
					createIssue(
						'error',
						'resource-id-duplicate',
						document.relativePath,
						`资源 id ${id} 已被 ${previous.relativePath} 使用。`,
					),
				);
			} else {
				resourceIds.set(id, document);
			}
		}

		issues.push(...validateDates(document));

		for (const field of ['image', 'cover', 'preview'] as const) {
			const reference = readString(frontmatter[field]);
			const issue = reference
				? validateResourceImagePath(
					reference,
					document.filePath,
					rootDir,
					`${field} 路径`,
				)
				: undefined;

			if (issue) {
				issues.push(issue);
			}
		}

		if (Array.isArray(frontmatter.gallery)) {
			frontmatter.gallery.forEach((item, index) => {
				if (!isRecord(item)) {
					return;
				}

				const reference = readString(item.src);
				const issue = reference
					? validateResourceImagePath(
						reference,
						document.filePath,
						rootDir,
						`gallery[${index}].src 路径`,
					)
					: undefined;

				if (issue) {
					issues.push(issue);
				}
			});
		}

		if (Array.isArray(frontmatter.actions)) {
			frontmatter.actions.forEach((item, index) => {
				if (!isRecord(item) || readString(item.type) !== 'download' || item.disabled === true) {
					return;
				}

				const reference = readString(item.href);
				const issue = reference
					? validateResourceImagePath(
						reference,
						document.filePath,
						rootDir,
						`actions[${index}].href 路径`,
						undefined,
						true,
					)
					: undefined;

				if (issue) {
					issues.push(issue);
				}
			});
		}

		issues.push(...validateMarkdownBody(document, rootDir));
	}

	return issues;
}

export function validateMarkdownBody(
	document: ContentDocument,
	rootDir: string,
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const searchableBody = stripCode(document.body);
	const levelOneHeadingPattern = /^ {0,3}#(?!#)\s+\S.*$/gm;

	for (const match of searchableBody.matchAll(levelOneHeadingPattern)) {
		issues.push(
			createIssue(
				'error',
				'markdown-body-h1',
				document.relativePath,
				'正文不能包含一级标题；页面标题已由文章布局生成，请从二级标题开始。',
				getLineNumber(document, match.index ?? 0),
			),
		);
	}

	const imagePattern = /!\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^)]*["'])?\)/g;

	for (const match of searchableBody.matchAll(imagePattern)) {
		const rawReference = match[1];
		const reference = rawReference.startsWith('<')
			? rawReference.slice(1, -1)
			: rawReference;
		const issue = validateLocalPath(
			reference,
			document.filePath,
			rootDir,
			'Markdown 图片路径',
			getLineNumber(document, match.index ?? 0),
		);

		if (issue) {
			issues.push(issue);
		}
	}

	const dollarPattern = /(?<!\\)\$([^$\n]+?)(?<!\\)\$/gu;

	for (const match of searchableBody.matchAll(dollarPattern)) {
		if (/\p{Script=Han}/u.test(match[1])) {
			issues.push(
				createIssue(
					'error',
					'ambiguous-dollar-math',
					document.relativePath,
					'美元符号包围了中文句子，可能被 KaTeX 误识别；金额请写成“美元”或转义 $。',
					getLineNumber(document, match.index ?? 0),
				),
			);
		}
	}

	return issues;
}

function validateResourceImagePath(
	reference: string,
	sourceFile: string,
	rootDir: string,
	label: string,
	line?: number,
	allowExternalHttps = false,
): ValidationIssue | undefined {
	const relativeSource = toRelativePath(rootDir, sourceFile);

	if (/^https:\/\//i.test(reference)) {
		return allowExternalHttps
			? undefined
			: createIssue(
				'error',
				'resource-image-external',
				relativeSource,
				`${label}必须使用项目内的资源图片：${reference}`,
				line,
			);
	}

	if (isExternalReference(reference)) {
		return createIssue(
			'error',
			'resource-image-external',
			relativeSource,
			`${label}不是受支持的本地资源路径：${reference}`,
			line,
		);
	}

	const normalizedReference = stripQueryAndHash(safeDecodeUri(reference))
		.replace(/\\/g, '/')
		.replace(/^\/+/, '');

	if (!RESOURCE_IMAGE_DIRECTORIES.some((directory) => normalizedReference.startsWith(directory))) {
		return createIssue(
			'error',
			'resource-image-location',
			relativeSource,
			`${label}必须位于 ${RESOURCE_IMAGE_DIRECTORIES.join(' 或 ')}：${reference}`,
			line,
		);
	}

	if (!RESOURCE_IMAGE_EXTENSIONS.has(path.extname(normalizedReference).toLocaleLowerCase('en-US'))) {
		return createIssue(
			'error',
			'resource-image-format',
			relativeSource,
			`${label}不是运行时支持的图片格式：${reference}`,
			line,
		);
	}

	return validateLocalPath(normalizedReference, sourceFile, rootDir, label, line);
}

export function validateLocalPath(
	reference: string,
	sourceFile: string,
	rootDir: string,
	label = '本地路径',
	line?: number,
): ValidationIssue | undefined {
	if (isExternalReference(reference)) {
		return undefined;
	}

	const normalizedReference = stripQueryAndHash(safeDecodeUri(reference));
	let absolutePath: string;

	if (normalizedReference.startsWith('/')) {
		absolutePath = path.join(rootDir, 'public', normalizedReference.slice(1));
	} else if (/^(src|public)[\\/]/.test(normalizedReference)) {
		absolutePath = path.join(rootDir, normalizedReference);
	} else {
		absolutePath = path.resolve(path.dirname(sourceFile), normalizedReference);
	}

	const relativeToRoot = path.relative(rootDir, absolutePath);
	const relativeSource = toRelativePath(rootDir, sourceFile);

	if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
		return createIssue(
			'error',
			'local-path-outside-project',
			relativeSource,
			`${label}超出项目目录：${reference}`,
			line,
		);
	}

	if (!fs.existsSync(absolutePath)) {
		return createIssue(
			'error',
			'local-path-missing',
			relativeSource,
			`${label}不存在：${reference}`,
			line,
		);
	}

	if (!hasExactPathCase(rootDir, absolutePath)) {
		return createIssue(
			'error',
			'local-path-case',
			relativeSource,
			`${label}大小写与磁盘不一致：${reference}`,
			line,
		);
	}

	return undefined;
}

export function runContentValidation(rootDir: string): ContentValidationResult {
	const documents = loadContentDocuments(rootDir);
	const issues = [
		...documents.flatMap((document) => document.parseIssues),
		...validatePostDocuments(documents, rootDir),
		...validateResourceDocuments(documents, rootDir),
	].sort(compareIssues);

	return {
		documents,
		issues,
		errorCount: issues.filter((issue) => issue.severity === 'error').length,
		warningCount: issues.filter((issue) => issue.severity === 'warning').length,
	};
}

export function formatValidationReport(result: ContentValidationResult): string {
	const lines = result.issues.map((issue) => {
		const location = issue.line ? `${issue.filePath}:${issue.line}` : issue.filePath;
		return `[${issue.severity === 'error' ? '错误' : '警告'}] ${location} ${issue.message}`;
	});

	lines.push(
		`内容检查完成：${result.documents.length} 个文档，${result.errorCount} 个错误，${result.warningCount} 个警告。`,
	);

	return `${lines.join('\n')}\n`;
}

function validateDates(document: ContentDocument): ValidationIssue[] {
	const publishedAt = readDate(document.frontmatter.publishedAt);
	const updatedAt = readDate(document.frontmatter.updatedAt);
	const issues: ValidationIssue[] = [];

	if (document.frontmatter.publishedAt !== undefined && publishedAt === undefined) {
		issues.push(
			createIssue('error', 'published-date-invalid', document.relativePath, 'publishedAt 不是有效日期。'),
		);
	}

	if (document.frontmatter.updatedAt !== undefined && updatedAt === undefined) {
		issues.push(
			createIssue('error', 'updated-date-invalid', document.relativePath, 'updatedAt 不是有效日期。'),
		);
	}

	if (publishedAt !== undefined && updatedAt !== undefined && updatedAt < publishedAt) {
		issues.push(
			createIssue(
				'error',
				'updated-before-published',
				document.relativePath,
				'updatedAt 不能早于 publishedAt。',
			),
		);
	}

	return issues;
}

function findMarkdownFiles(directory: string): string[] {
	const files: string[] = [];

	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const absolutePath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...findMarkdownFiles(absolutePath));
		} else if (entry.isFile() && entry.name.toLocaleLowerCase('en-US').endsWith('.md')) {
			files.push(absolutePath);
		}
	}

	return files;
}

function stripCode(body: string): string {
	let insideFence = false;

	return body
		.split('\n')
		.map((line) => {
			if (/^\s*(```|~~~)/.test(line)) {
				insideFence = !insideFence;
				return '';
			}

			if (insideFence) {
				return '';
			}

			return line.replace(/`[^`]*`/g, '');
		})
		.join('\n');
}

function hasExactPathCase(rootDir: string, absolutePath: string): boolean {
	const relativePath = path.relative(rootDir, absolutePath);
	let currentPath = rootDir;

	for (const segment of relativePath.split(path.sep).filter(Boolean)) {
		const entries = fs.readdirSync(currentPath);

		if (!entries.includes(segment)) {
			return false;
		}

		currentPath = path.join(currentPath, segment);
	}

	return true;
}

function isExternalReference(reference: string): boolean {
	return /^(https?:|mailto:|data:|#)/i.test(reference);
}

function stripQueryAndHash(reference: string): string {
	return reference.split(/[?#]/, 1)[0] ?? reference;
}

function safeDecodeUri(reference: string): string {
	try {
		return decodeURI(reference);
	} catch {
		return reference;
	}
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}

	return undefined;
}

function readDate(value: unknown): number | undefined {
	if (value instanceof Date && Number.isFinite(value.getTime())) {
		return value.getTime();
	}

	if (typeof value !== 'string' && typeof value !== 'number') {
		return undefined;
	}

	const parsed = new Date(value).getTime();
	return Number.isFinite(parsed) ? parsed : undefined;
}

function isPlaceholderDescription(value: string | undefined): boolean {
	if (!value) {
		return true;
	}

	return /^(待补充|todo\b|tbd\b)/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getLineNumber(document: ContentDocument, bodyIndex: number): number {
	return document.bodyStartLine + document.body.slice(0, bodyIndex).split('\n').length - 1;
}

function createIssue(
	severity: ValidationSeverity,
	code: string,
	filePath: string,
	message: string,
	line?: number,
): ValidationIssue {
	return {
		severity,
		code,
		filePath,
		message,
		...(line !== undefined ? { line } : {}),
	};
}

function compareIssues(current: ValidationIssue, next: ValidationIssue): number {
	if (current.severity !== next.severity) {
		return current.severity === 'error' ? -1 : 1;
	}

	if (current.filePath !== next.filePath) {
		return current.filePath.localeCompare(next.filePath);
	}

	return (current.line ?? 0) - (next.line ?? 0);
}

function toRelativePath(rootDir: string, filePath: string): string {
	return path.relative(rootDir, filePath).replace(/\\/g, '/');
}
