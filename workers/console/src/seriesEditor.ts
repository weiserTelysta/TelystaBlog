import { BLOG_CATEGORIES } from '../../../src/config/content/blogCategories';
import { BLOG_SERIES, type BlogSeries } from '../../../src/config/content/blogSeries';
import { configSections, replaceSeriesArray } from './configEditor';
import type { DocumentRecord } from './documentEditor';
import { HttpError } from './http';

const sourcePath = 'src/config/content/blogSeries.ts';
const coverOrigin = 'https://assets.telysta.com';
const maxCoverBytes = 64 * 1024;

export function seriesRecord(env: ConsoleEnv) {
	return env.DB.prepare("SELECT * FROM documents WHERE kind='config' AND source_path=?1")
		.bind(sourcePath).first<DocumentRecord>();
}

export function readSeries(record: DocumentRecord | null): readonly BlogSeries[] {
	if (!record) return BLOG_SERIES;
	const section = configSections(record.source, sourcePath).find(item => item.name === 'BLOG_SERIES');
	return (section?.fields.children || []).map(row => {
		const series = Object.fromEntries((row.children || []).map(field => [field.key, field.value])) as BlogSeries;
		const artworkId = series.artworkId ?? BLOG_SERIES.find(item => item.id === series.id)?.artworkId;
		return artworkId ? { ...series, artworkId } : series;
	});
}

function shortText(value: unknown, limit: number) {
	if (typeof value !== 'string' || !value.trim() || value.length > limit || value.includes('\0')) {
		throw new HttpError(400, '请填写系列的中英文名称和简介。', 'SERIES_TEXT_INVALID');
	}
	return value.trim();
}

function readCover(value: unknown) {
	if (typeof value !== 'string' || value.length > Math.ceil(maxCoverBytes / 3) * 4 + 23 ||
		!/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) {
		throw new HttpError(415, '封面必须是 64 KB 以内的 WebP。', 'SERIES_COVER_INVALID');
	}
	let image: Uint8Array;
	try {
		image = Uint8Array.from(atob(value.slice(23)), char => char.charCodeAt(0));
	} catch {
		throw new HttpError(415, '封面编码无效。', 'SERIES_COVER_INVALID');
	}
	if (image.length > maxCoverBytes || !isCoverWebP(image)) {
		throw new HttpError(415, '封面尺寸必须是 352 × 440 的 WebP。', 'SERIES_COVER_INVALID');
	}
	return image;
}

function isCoverWebP(image: Uint8Array) {
	const decode = new TextDecoder();
	const fourCC = (offset: number) => decode.decode(image.subarray(offset, offset + 4));
	const view = new DataView(image.buffer);
	if (image.length < 25 || fourCC(0) !== 'RIFF' || fourCC(8) !== 'WEBP' ||
		view.getUint32(4, true) !== image.length - 8) return false;
	let frame = false;
	let offset = 12;
	while (offset + 8 <= image.length) {
		const kind = fourCC(offset);
		const size = view.getUint32(offset + 4, true);
		const start = offset + 8;
		offset = start + size + (size & 1);
		if (offset > image.length || kind === 'ANIM' || kind === 'ANMF') return false;
		if (kind === 'VP8X') {
			if (size !== 10 || (image[start] & 2) ||
				(view.getUint32(start + 4, true) & 0xffffff) !== 351 ||
				(view.getUint32(start + 6, true) >>> 8) !== 439) return false;
		}
		if (kind === 'VP8 ' || kind === 'VP8L') {
			if (frame) return false;
			if (kind === 'VP8 ') {
				if (size < 10 || image[start + 3] !== 0x9d || image[start + 4] !== 1 || image[start + 5] !== 0x2a ||
					(view.getUint16(start + 6, true) & 0x3fff) !== 352 ||
					(view.getUint16(start + 8, true) & 0x3fff) !== 440) return false;
			} else {
				if (size < 5 || image[start] !== 0x2f) return false;
				const dimensions = view.getUint32(start + 1, true);
				if ((dimensions & 0x3fff) !== 351 || ((dimensions >>> 14) & 0x3fff) !== 439) return false;
			}
			frame = true;
		}
	}
	return frame && offset === image.length;
}

export async function editSeries(env: ConsoleEnv, record: DocumentRecord, input: Record<string, unknown>) {
	const series = readSeries(record);
	const id = input.id;
	if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 64) {
		throw new HttpError(400, '系列编号仅支持小写英文字母、数字和短横线。', 'SERIES_ID_INVALID');
	}
	const current = series.find(item => item.id === id);
	if (Boolean(current) === (input.create === true)) {
		throw new HttpError(409, '此系列编号已占用或系列不存在。', 'SERIES_ID_CONFLICT');
	}
	const category = BLOG_CATEGORIES.find(item => item.id === input.category)?.id;
	if (!category || (current && current.category !== category)) {
		throw new HttpError(400, '请选择有效的分类，已建立的系列保留原分类。', 'SERIES_CATEGORY_INVALID');
	}
	const next = {
		...current,
		id,
		category,
		title: shortText(input.title, 120),
		titleEn: shortText(input.titleEn, 120),
		description: shortText(input.description, 400),
		descriptionEn: shortText(input.descriptionEn, 400),
	};
	if (input.image !== undefined) {
		const image = readCover(input.image);
		const digest = await crypto.subtle.digest('SHA-256', image);
		const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
		const key = `series-covers/${hash}.webp`;
		await env.MEDIA_BUCKET.put(key, image, {
			httpMetadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' },
		});
		next.cover = `${coverOrigin}/${key}`;
	}
	const updated = current ? series.map(item => item.id === id ? next : item) : [...series, next];
	return replaceSeriesArray(record.source, updated);
}
