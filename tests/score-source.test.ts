import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseScoreSource, readGeneratedScore } from '../scripts/lib/score-utils.mjs';

test('score metadata retains flat keys and dotted pickups without mixing them into music', () => {
	const score = parseScoreSource('title=慈光歌\r\n1=Ab\r\n3/4,4.\r\nq5 q1\' q2\' |\r\nH: 恳求慈光');
	assert.equal(score.key, 'Ab');
	assert.equal(score.meter, '3/4');
	assert.equal(score.music, "q5 q1' q2' |");
	assert.deepEqual(score.lyrics, ['恳求慈光']);
});

test('published score artifacts match their source and provide readable fallback metadata', async () => {
	for (const [id, key, meter] of [['guihui', 'Eb', '6/8'], ['jesus-source-of-life', 'C', '4/4'], ['lead-kindly-light', 'Ab', '3/4']]) {
		const score = await readGeneratedScore(process.cwd(), id);
		assert.equal(score.parsed.key, key);
		assert.equal(score.parsed.meter, meter);
		assert.ok(score.parsed.lyrics.length >= 2);
		assert.match(score.svg, /viewBox="[^"]+"/);
		assert.doesNotMatch(score.svg, /(?:NaN|Infinity)/);
	}
});

test('grouped Chinese syllables remain readable in the text score', () => {
	assert.deepEqual(parseScoreSource('H: 2. 主_愿在沙漠').lyrics, ['2. 主愿在沙漠']);
});
