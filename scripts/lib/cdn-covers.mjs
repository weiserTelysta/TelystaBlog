import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';

export const coverIndexPath = 'src/generated/cdn-covers.json';
export const sha256 = (data) => createHash('sha256').update(data).digest('hex');

// Fail closed: refreshing the main manifest must never silently discard or stale a cover.
export async function mergeCovers(assets, index, readSource) {
	if (index.version !== 1) throw new Error('Unsupported cover index version');
	for (const [key, entry] of Object.entries(index.assets)) {
		const asset = assets[key];
		const source = asset?.original ?? asset?.display;
		if (!source || JSON.stringify(source) !== JSON.stringify(entry.source)) {
			throw new Error(`Cover source changed: ${key}. Run assets:covers again.`);
		}
		if (readSource && sha256(await readSource(key)) !== entry.sourceHash) {
			throw new Error(`Cover source content changed: ${key}. Run assets:covers again.`);
		}
		if (!/^covers\/.+\.[a-f0-9]{64}\.webp$/.test(entry.cover.path)) {
			throw new Error(`Invalid versioned cover path: ${key}`);
		}
		asset.cover = entry.cover;
	}
}

export async function readCoverIndex() {
	try { return JSON.parse(await fs.readFile(coverIndexPath, 'utf8')); }
	catch (error) { if (error.code === 'ENOENT') return { version: 1, assets: {} }; throw error; }
}
