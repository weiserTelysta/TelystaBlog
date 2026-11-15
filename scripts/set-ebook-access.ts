import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEbookCatalog, readEbookCatalogFiles, serializeEbookCatalog, type CatalogBook } from '../src/lib/ebooks/catalogFiles';
import { ebookSchema } from '../src/lib/ebooks/ebookSchema';

function write(file: string, value: unknown, privateFile = false) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const temporary = file + '.tmp';
	fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', privateFile ? { mode: 0o600 } : undefined);
	fs.renameSync(temporary, file);
}
export function setEbookAccess(root: string, id: string, access: 'public' | 'protected') {
	const catalogs = readEbookCatalogFiles(root);
	const catalog = catalogs.find(file => file.books.some(book => book.id === id));
	if (!catalog) throw new Error(`未找到书目 ${id}`);
	const index = catalog.books.findIndex(book => book.id === id), current = catalog.books[index];
	const privateFile = path.join(root, '.library-private/catalog', catalog.category + '.json');
	const privateData = fs.existsSync(privateFile) ? parseEbookCatalog(privateFile, JSON.parse(fs.readFileSync(privateFile, 'utf8')), false) : { category: catalog.category, books: [] };
	const saved = privateData.books.find((book: { id: string }) => book.id === id);
	if (current.privateStub && !saved) throw new Error('私有完整书目缺失，保留当前记录，不生成空资料。');
	const source = current.privateStub ? saved : current;
	if (!source) throw new Error('私有完整书目缺失。');
	const full: CatalogBook = { ...source, access, privateStub: false };
	ebookSchema.parse(full);
	if (access === 'protected') {
		privateData.books = privateData.books.filter((book: { id: string }) => book.id !== id); privateData.books.push(full);
		write(privateFile, serializeEbookCatalog(catalog.category, privateData.books), true);
		catalog.books[index] = { id, title: '受保护书籍', access: 'protected', privateStub: true, clcCode: full.clcCode, clcName: full.clcName, authors: [], files: [], description: '', draft: full.draft ?? false };
	} else catalog.books[index] = full;
	write(catalog.filePath, serializeEbookCatalog(catalog.category, catalog.books));
	if (access === 'public' && saved) { privateData.books = privateData.books.filter((book: { id: string }) => book.id !== id); write(privateFile, serializeEbookCatalog(catalog.category, privateData.books), true); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const id = process.argv[process.argv.indexOf('--id') + 1], access = process.argv[process.argv.indexOf('--access') + 1];
	if (!process.argv.includes('--id') || !process.argv.includes('--access') || !['public', 'protected'].includes(access)) throw new Error('用法：npm run library:access -- --id WEISER... --access public|protected');
	setEbookAccess(process.cwd(), id, access as 'public' | 'protected');
	console.log(`已更新 ${id} 为 ${access}；尚未上传或部署。`);
}
