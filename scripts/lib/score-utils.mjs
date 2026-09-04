import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const SCORE_SOURCE_DIRECTORY = path.join('src', 'content', 'scores');
export const SCORE_OUTPUT_DIRECTORY = path.join('src', 'generated', 'scores');

export function assertScoreId(value) {
	const id = value.trim();
	if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
		throw new Error(`Invalid score id "${value}". Use lowercase letters, digits, and hyphens.`);
	}
	return id;
}

export function scorePaths(rootDirectory, id) {
	const safeId = assertScoreId(id);
	return {
		source: path.join(rootDirectory, SCORE_SOURCE_DIRECTORY, `${safeId}.jly`),
		svg: path.join(rootDirectory, SCORE_OUTPUT_DIRECTORY, `${safeId}.svg`),
		metadata: path.join(rootDirectory, SCORE_OUTPUT_DIRECTORY, `${safeId}.json`),
	};
}

export function scoreSourceHash(source) {
	return createHash('sha256').update(source).digest('hex');
}

export function parseScoreSource(source) {
	const lines = source.replace(/\r\n?/g, '\n').split('\n');
	const headers = new Map();
	const music = [];
	const lyrics = [];
	let inMusic = false;

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.startsWith('%')) continue;

		const header = line.match(/^([A-Za-z][A-Za-z0-9]*)=(.*)$/);
		if (header) {
			headers.set(header[1], header[2].trim());
			continue;
		}

		if (/^H:\s*/.test(line)) {
			lyrics.push(line.replace(/^H:\s*/, ''));
			continue;
		}

		if (/^\d+\/\d+(?:,\d+)?$/.test(line)) {
			headers.set('meter', line.split(',')[0]);
			inMusic = true;
			continue;
		}

		if (/^(?:NoBarNums|NoIndent|RaggedLast|OnePage)$/.test(line)) {
			continue;
		}

		if (inMusic) music.push(line);
	}

	return {
		title: headers.get('title') ?? '未命名简谱',
		subtitle: headers.get('subtitle') ?? '',
		poet: headers.get('poet') ?? '',
		composer: headers.get('composer') ?? '',
		copyright: headers.get('copyright') ?? '',
		key: headers.get('1') ?? '',
		meter: headers.get('meter') ?? '',
		music: music.join('\n'),
		lyrics,
	};
}

export async function readGeneratedScore(rootDirectory, id) {
	const paths = scorePaths(rootDirectory, id);
	const [source, svg, metadataText] = await Promise.all([
		readFile(paths.source, 'utf8'),
		readFile(paths.svg, 'utf8'),
		readFile(paths.metadata, 'utf8'),
	]);
	const metadata = JSON.parse(metadataText);
	const expectedHash = scoreSourceHash(source);

	if (metadata.sourceSha256 !== expectedHash) {
		throw new Error(
			`Score "${id}" is stale. Run: npm run score:render -- ${id}`,
		);
	}

	return { source, svg, metadata, parsed: parseScoreSource(source), paths };
}
