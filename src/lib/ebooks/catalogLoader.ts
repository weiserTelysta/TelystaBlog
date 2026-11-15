import type { Loader } from 'astro/loaders';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readEbookCatalogFiles } from './catalogFiles';

export function ebookCatalogLoader(): Loader {
	let removeWatcher: (() => void) | undefined;
	return {
		name: 'telysta-json-ebook-catalog',
		async load(context) {
			removeWatcher?.();
			const root = fileURLToPath(context.config.root);
			const directory = path.join(root, 'src/content/ebooks/catalog');
			async function sync() {
				const entries = [];
				for (const file of readEbookCatalogFiles(root, process.env.TELYSTA_EBOOK_FIXTURES_ONLY === '1')) {
					for (const book of file.books) {
						const data = await context.parseData({ id: book.id, data: book, filePath: file.filePath });
						entries.push({ id: book.id, data, filePath: path.relative(root, file.filePath).split(path.sep).join('/'), digest: context.generateDigest(data) });
					}
				}
				context.store.clear();
				for (const entry of entries) context.store.set(entry);
			}
			await sync();
			if (context.watcher) {
				let pending = Promise.resolve();
				const onChange = (event: string, file: string) => {
					const relative = path.relative(directory, file);
					if (!['add', 'change', 'unlink'].includes(event) || relative.startsWith('..') || path.isAbsolute(relative) || !relative.endsWith('.json')) return;
					pending = pending.then(sync).catch(error => context.logger.error(String(error)));
				};
				context.watcher.add(directory);
				context.watcher.on('all', onChange);
				removeWatcher = () => { context.watcher?.off('all', onChange); };
			}
		},
	};
}
