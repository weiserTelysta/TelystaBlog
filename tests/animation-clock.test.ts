import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnimationClock } from '../src/components/starfield/animationClock';

test('背景恢复时沿用暂停位置，后续帧继续推进而不追赶墙钟', () => {
	const clock = createAnimationClock();
	clock.tick(1000);
	assert.deepEqual(clock.tick(1033), { time: 33, delta: 33 });
	clock.resetFrame();
	assert.deepEqual(clock.tick(61033), { time: 33, delta: 0 });
	assert.deepEqual(clock.tick(61066), { time: 66, delta: 33 });
	clock.resetFrame();
	assert.equal(clock.tick(90000).time, 66);
	assert.equal(clock.tick(95000).delta, 50);
});
