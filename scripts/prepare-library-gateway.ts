import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseEbookCatalog, readEbookCatalogFiles } from '../src/lib/ebooks/catalogFiles';
import { ebookHref, ebookSchema } from '../src/lib/ebooks/ebookSchema';

const root = process.cwd();
const scopeArgument = process.argv.indexOf('--scope');
if (scopeArgument < 0 || !process.argv[scopeArgument + 1]) throw new Error('请用 --scope <已核验的全量发布ID数组JSON> 明确网关发布范围。');
const ids: unknown = JSON.parse(fs.readFileSync(process.argv[scopeArgument + 1], 'utf8'));
if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string' || !/^WEISER[a-f0-9]{12}$/.test(id)) || new Set(ids).size !== ids.length) throw new Error('发布范围必须是不为空、无重复的有效书籍ID数组。');
const scope = new Set<string>(ids);
const books = readEbookCatalogFiles(root).flatMap(file => file.books.filter(record => !scope || scope.has(record.id)).map(record => {
	let full = record;
	if (record.privateStub) {
		const privateFile = path.join(root, '.library-private/catalog', file.category + '.json');
		if (!fs.existsSync(privateFile)) throw new Error(`缺少本地私有书目 ${record.id}；停止生成，不改变远端。`);
		const privateData = parseEbookCatalog(privateFile, JSON.parse(fs.readFileSync(privateFile, 'utf8')), false);
		const saved = privateData.books.find((book: { id: string }) => book.id === record.id);
		if (!saved || saved.access !== 'protected' || saved.privateStub) throw new Error(`私有书目不匹配 ${record.id}`);
		full = saved;
	}
	const parsed = ebookSchema.parse(full);
	if (parsed.draft) return null;
	return { ...parsed, href: ebookHref(parsed.id) };
})).filter(book => book !== null);
if (scope && (books.length !== scope.size || books.some(book => !scope.has(book.id)))) throw new Error('部署范围与核验书目不一致，停止生成。');
const data = JSON.stringify(books), digest = createHash('sha256').update(data).digest('hex');
const directory = path.join(root, '.tmp/library-gateway'); fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'catalog.json'), data, { mode: 0o600 });
const bundleDirectory = path.join(root, '.library-private/gateway'); fs.mkdirSync(bundleDirectory, { recursive: true });
fs.writeFileSync(path.join(bundleDirectory, 'catalog.json'), data, { mode: 0o600 });
fs.writeFileSync(path.join(root, 'workers/library-gateway/src/catalog.generated.json'), data, { mode: 0o600 });
fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({ key: `gateway/catalog-${digest}.json`, sha256: digest, books: books.length, protected: books.filter(book => book.access === 'protected').length }, null, 2) + '\n');
console.log(JSON.stringify({ books: books.length, protected: books.filter(book => book.access === 'protected').length, key: `gateway/catalog-${digest}.json` }));
