import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { HOME_PROFILES } from '../src/config/pages/homeProfiles';

const { values } = parseArgs({ options: { source: { type: 'string' }, cdn: { type: 'boolean' } } });
if (!values.source && !values.cdn) throw new Error('Use --source <local avatars directory> or --cdn');
await fs.mkdir('public/favicons', { recursive: true });
for (const profile of HOME_PROFILES.filter(profile => profile.enabled !== false)) {
	const filename = decodeURIComponent(new URL(profile.avatar.src).pathname.split('/').at(-1)!);
	let source: string | Buffer;
	if (values.source) source = path.join(values.source, filename);
	else {
		const response = await fetch(profile.avatar.src, { signal: AbortSignal.timeout(30000) });
		if (!response.ok) throw new Error(`Avatar download failed: ${profile.id} (${response.status})`);
		source = Buffer.from(await response.arrayBuffer());
	}
	for (const size of [32, 48]) {
		await sharp(source).resize(size, size, { fit: 'cover' }).png().toFile(`public/favicons/${profile.id}-${size}.png`);
	}
}
console.log(`Generated 32/48px local favicons for ${HOME_PROFILES.length} profiles.`);
