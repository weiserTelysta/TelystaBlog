import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
	SCORE_SOURCE_DIRECTORY,
	assertScoreId,
	parseScoreSource,
	readGeneratedScore,
	scorePaths,
	scoreSourceHash,
} from './lib/score-utils.mjs';

const rootDirectory = process.cwd();
const argumentsWithoutSeparator = process.argv.slice(2).filter((value) => value !== '--');
const checkOnly = argumentsWithoutSeparator.includes('--check');
const requestedIds = argumentsWithoutSeparator.filter((value) => !value.startsWith('--'));

async function listScoreIds() {
	const sourceDirectory = path.join(rootDirectory, SCORE_SOURCE_DIRECTORY);
	const entries = await readdir(sourceDirectory, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile() && entry.name.endsWith('.jly'))
		.map((entry) => entry.name.slice(0, -4))
		.sort();
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: rootDirectory,
		encoding: 'utf8',
		maxBuffer: 32 * 1024 * 1024,
		windowsHide: true,
		...options,
	});

	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(
			[result.stderr, result.stdout].filter(Boolean).join('\n').trim() ||
				`${command} exited with code ${result.status}`,
		);
	}
	return result;
}

function findCommand(environmentName, fallback) {
	return process.env[environmentName]?.trim() || fallback;
}

function normalizeSvg(svg) {
	return svg
		.replace(/^<\?xml[^>]*>\s*/u, '')
		.replace(/^<!DOCTYPE[^>]*(?:\[[\s\S]*?\]\s*)?>\s*/u, '')
		.replace(/\swidth="[^"]*"/u, '')
		.replace(/\sheight="[^"]*"/u, '')
		.replace('<svg ', '<svg preserveAspectRatio="xMidYMin meet" ')
		.trim()
		.concat('\n');
}

async function renderScore(id) {
	const paths = scorePaths(rootDirectory, id);
	const source = await readFile(paths.source, 'utf8');
	const parsed = parseScoreSource(source);
	const temporaryDirectory = path.join(rootDirectory, '.tmp', 'scores');
	const temporaryLilypond = path.join(temporaryDirectory, `${id}.ly`);
	const temporaryOutputBase = path.join(temporaryDirectory, id);
	await mkdir(temporaryDirectory, { recursive: true });
	await mkdir(path.dirname(paths.svg), { recursive: true });

	const python = findCommand('PYTHON_BIN', 'python');
	const localJianpu = path.join(rootDirectory, '.tmp', 'jianpu-ly');
	const localLilypond = path.join(
		rootDirectory,
		'.tmp',
		'lilypond-2.24.4',
		'bin',
		process.platform === 'win32' ? 'lilypond.exe' : 'lilypond',
	);
	const lilypond = findCommand(
		'LILYPOND_BIN',
		existsSync(localLilypond) ? localLilypond : 'lilypond',
	);
	const toolEnvironment = { ...process.env };
	if (existsSync(localJianpu)) {
		toolEnvironment.PYTHONPATH = [localJianpu, toolEnvironment.PYTHONPATH]
			.filter(Boolean)
			.join(path.delimiter);
	}
	if (existsSync(localLilypond)) {
		toolEnvironment.PATH = [path.dirname(localLilypond), toolEnvironment.PATH]
			.filter(Boolean)
			.join(path.delimiter);
	}
	let converted;
	try {
		converted = run(python, ['-m', 'jianpu_ly', paths.source], {
			env: toolEnvironment,
		});
	} catch (error) {
		throw new Error(
			`Unable to run jianpu-ly. Install it with "python -m pip install jianpu-ly==1.889".\n${error.message}`,
		);
	}
	await writeFile(temporaryLilypond, converted.stdout, 'utf8');

	try {
		run(lilypond, [
			'-dbackend=svg',
			'-dcrop',
			'-dno-point-and-click',
			'-o',
			temporaryOutputBase,
			temporaryLilypond,
		], { env: toolEnvironment });
	} catch (error) {
		throw new Error(
			`Unable to run LilyPond. Set LILYPOND_BIN to the LilyPond executable.\n${error.message}`,
		);
	}

	const renderedPath = `${temporaryOutputBase}.cropped.svg`;
	const svg = normalizeSvg(await readFile(renderedPath, 'utf8'));
	const metadata = {
		schemaVersion: 1,
		id,
		title: parsed.title,
		source: path.relative(rootDirectory, paths.source).replaceAll('\\', '/'),
		sourceSha256: scoreSourceHash(source),
		renderer: {
			jianpuLy: '1.889',
			lilypond: '2.24.x',
		},
	};

	await writeFile(paths.svg, svg, 'utf8');
	await writeFile(paths.metadata, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
	console.log(`Rendered score: ${id}`);
}

async function checkScore(id) {
	await readGeneratedScore(rootDirectory, id);
	console.log(`Score is current: ${id}`);
}

const ids = (requestedIds.length ? requestedIds : await listScoreIds()).map(assertScoreId);
if (!ids.length) {
	console.log('No score sources found.');
	process.exit(0);
}

try {
	for (const id of ids) {
		if (checkOnly) await checkScore(id);
		else await renderScore(id);
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
