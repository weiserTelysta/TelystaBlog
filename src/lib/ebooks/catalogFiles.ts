import fs from 'node:fs';
import path from 'node:path';
import { LIBRARY_CLASSES } from '../../config/library';

export type CatalogBook = Record<string, unknown> & { id: string };
export type CatalogFile = { filePath: string; category: string; name: string; books: CatalogBook[] };

export function parseEbookCatalog(filePath: string, value: unknown, publicSource = true): CatalogFile {
	const data = value as Record<string, unknown>;
	if (!data || typeof data.category !== 'string' || !LIBRARY_CLASSES[data.category]) throw new Error(`${filePath}: 无效的中图法大类。`);
	let rawBooks: unknown[];
	if (Array.isArray(data.booklists)) {
		const codes = new Set<string>();
		rawBooks = data.booklists.flatMap(group => {
			if (!group || typeof group.clcCode !== 'string' || !group.clcCode.startsWith(data.category as string) || typeof group.clcName !== 'string' || !group.clcName.trim() || !Array.isArray(group.books)) throw new Error(`${filePath}: Booklist须包含clcCode、clcName和books。`);
			if (codes.has(group.clcCode)) throw new Error(`${filePath}: 重复Booklist类号 ${group.clcCode}`);
			codes.add(group.clcCode);
			return group.books.map((book: Record<string, unknown>) => {
				if (!book || typeof book !== 'object' || (book.clcCode && book.clcCode !== group.clcCode)) throw new Error(`${filePath}: 书籍类号与所在Booklist不一致。`);
				return { ...book, clcCode: group.clcCode, clcName: book.clcName || group.clcName };
			});
		});
	} else if (Array.isArray(data.books)) rawBooks = data.books;
	else throw new Error(`${filePath}: 缺少booklists数组。`);
	for (const raw of rawBooks) {
		const book = raw as Record<string, unknown>;
		if (!book || typeof book !== 'object' || typeof book.id !== 'string') throw new Error(`${filePath}: 每本书须有固定id。`);
		if (publicSource && book.access === 'protected' && book.privateStub !== true) throw new Error(`${filePath}: ${book.id} 的完整资料应通过 library:access 存入本地私有目录。`);
		if (typeof book.clcCode === 'string' && !book.clcCode.startsWith(data.category)) throw new Error(`${filePath}: ${book.id} 的类号不属于该大类。`);
	}
	return { filePath, category: data.category, name: LIBRARY_CLASSES[data.category], books: rawBooks as CatalogBook[] };
}

export function serializeEbookCatalog(category: string, books: CatalogBook[]) {
	const groups = new Map<string, { clcCode: string; clcName: string; books: CatalogBook[] }>();
	for (const book of books) {
		const code = typeof book.clcCode === 'string' ? book.clcCode : category;
		const name = typeof book.clcName === 'string' ? book.clcName : LIBRARY_CLASSES[category];
		const group = groups.get(code) || { clcCode: code, clcName: name, books: [] };
		const record = { ...book }; delete record.clcCode;
		if (record.clcName === group.clcName) delete record.clcName;
		group.books.push(record); groups.set(code, group);
	}
	return { category, booklists: [...groups.values()].sort((a, b) => a.clcCode.localeCompare(b.clcCode, 'en', { numeric: true })) };
}

export function readEbookCatalogFiles(root: string, fixturesOnly = false): CatalogFile[] {
	const directory = path.join(root, 'src/content/ebooks/catalog');
	if (!fs.existsSync(directory)) return [];
	const names = fs.readdirSync(directory).filter(name => fixturesOnly ? name === '__browser_fixture.json' : /^[A-Z]\.json$/.test(name)).sort();
	const ids = new Set<string>();
	return names.map(name => {
		const filePath = path.join(directory, name), catalog = parseEbookCatalog(filePath, JSON.parse(fs.readFileSync(filePath, 'utf8')));
		if (!fixturesOnly && name !== `${catalog.category}.json`) throw new Error(`${filePath}: 文件名须与大类一致。`);
		for (const book of catalog.books) { if (ids.has(book.id)) throw new Error(`${filePath}: 重复书目id ${book.id}`); ids.add(book.id); }
		return catalog;
	});
}
