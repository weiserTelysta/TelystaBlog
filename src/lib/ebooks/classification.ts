export type LibraryClassReference = {
	name: string;
	aliases?: string[];
	verification: 'reference-checked' | 'legacy-label';
	sources: string[];
};
export type LibraryClassificationRegistry = { version: number; classes: Record<string, LibraryClassReference> };

/** Reject an incomplete register before using it as the catalog's classification reference. */
export function parseLibraryClassificationRegistry(value: unknown): LibraryClassificationRegistry {
	const registry = value as LibraryClassificationRegistry | null;
	if (!registry || registry.version !== 1 || !registry.classes || typeof registry.classes !== 'object' || Array.isArray(registry.classes)) {
		throw new Error('分类登记表须包含 version: 1 和 classes 对象。');
	}
	for (const [code, reference] of Object.entries(registry.classes)) {
		if (!/^[A-Z]{1,2}\d*(?:[./]\d+)*$/.test(code) || !reference || typeof reference.name !== 'string' || !reference.name.trim()) {
			throw new Error(`分类登记无效：${code}。`);
		}
		if (!['reference-checked', 'legacy-label'].includes(reference.verification) || !Array.isArray(reference.sources)
			|| reference.sources.some(source => typeof source !== 'string' || !/^https?:\/\//.test(source))
			|| (reference.verification === 'reference-checked' && !reference.sources.length)) {
			throw new Error(`分类 ${code} 的核对状态或来源不完整。`);
		}
		if (reference.aliases !== undefined && (!Array.isArray(reference.aliases)
			|| reference.aliases.some(alias => typeof alias !== 'string' || !alias.trim()))) {
			throw new Error(`分类 ${code} 的别名须为非空名称数组。`);
		}
	}
	return registry;
}

/** Validate taxonomy labels without coupling classification to a file's storage path. */
export function ebookClassificationIssue(
	book: { clcCode?: unknown; clcName?: unknown },
	registry: LibraryClassificationRegistry,
): string | undefined {
	if (typeof book.clcCode !== 'string' || !book.clcCode) return '书籍缺少中图类号。';
	const reference = Object.hasOwn(registry.classes, book.clcCode) ? registry.classes[book.clcCode] : undefined;
	if (!reference) return `中图类号 ${book.clcCode} 尚未登记分类依据；请先复核并更新 data/library/clc-mappings.json。`;
	if (typeof book.clcName !== 'string' || ![reference.name, ...(reference.aliases ?? [])].includes(book.clcName)) {
		return `类号 ${book.clcCode} 与类名不一致，应为“${reference.name}”。`;
	}
	return undefined;
}
