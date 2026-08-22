import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	RAIL_MAX_TARGET_LEAD_RATIO,
	RAIL_SNAP_DISTANCE_RATIO,
	easeOutRailMotion,
	getBoundedRailTarget,
	getNearestRailSnapTarget,
	getRailMotionDuration,
	normalizeWheelDelta,
} from '../src/components/blog/categoryAccordionMotion';

test('normalizes pixel, line, and page wheel deltas', () => {
	assert.equal(normalizeWheelDelta(24, 0, 800), 24);
	assert.equal(normalizeWheelDelta(3, 1, 800), 48);
	assert.equal(normalizeWheelDelta(1, 2, 800), 800);
	assert.equal(normalizeWheelDelta(Number.NaN, 0, 800), 0);
	assert.equal(normalizeWheelDelta(1, 2, 0), 0);
	assert.equal(normalizeWheelDelta(1, 99, 800), 0);
});

test('caps a large wheel event to a fraction of one card', () => {
	const target = getBoundedRailTarget(
		{ scrollLeft: 100, targetScrollLeft: 100, maxScrollLeft: 2000, cardSpan: 200 },
		10_000,
	);

	assert.equal(target, 170);
	assert.ok(target < 2000);
});

test('caps repeated input lead instead of accumulating an unbounded scroll debt', () => {
	const cardSpan = 200;
	let targetScrollLeft = 100;

	for (let index = 0; index < 20; index += 1) {
		targetScrollLeft = getBoundedRailTarget(
			{ scrollLeft: 100, targetScrollLeft, maxScrollLeft: 2000, cardSpan },
			120,
		);
	}

	assert.equal(targetScrollLeft, 100 + cardSpan * RAIL_MAX_TARGET_LEAD_RATIO);
});

test('rebases immediately when wheel direction reverses', () => {
	const target = getBoundedRailTarget(
		{ scrollLeft: 300, targetScrollLeft: 450, maxScrollLeft: 2000, cardSpan: 200 },
		-100,
	);

	assert.equal(target, 230);
});

test('clamps targets at both rail boundaries', () => {
	assert.equal(
		getBoundedRailTarget(
			{ scrollLeft: 10, targetScrollLeft: 10, maxScrollLeft: 500, cardSpan: 200 },
			-100,
		),
		0,
	);
	assert.equal(
		getBoundedRailTarget(
			{ scrollLeft: 490, targetScrollLeft: 490, maxScrollLeft: 500, cardSpan: 200 },
			100,
		),
		500,
	);
});

test('snaps only when a card target is within the configured threshold', () => {
	const threshold = 200 * RAIL_SNAP_DISTANCE_RATIO;

	assert.equal(getNearestRailSnapTarget(215, [0, 200, 400], threshold, 500), 200);
	assert.equal(getNearestRailSnapTarget(250, [0, 200, 400], threshold, 500), null);
	assert.equal(getNearestRailSnapTarget(10, [Number.NaN], threshold, 500), null);
});

test('keeps motion duration inside the 120 to 180 millisecond range', () => {
	assert.equal(getRailMotionDuration(0, 200), 120);
	assert.equal(getRailMotionDuration(200, 200), 180);
	assert.equal(getRailMotionDuration(2000, 200), 180);
	assert.ok(getRailMotionDuration(100, 200) > 120);
});

test('uses a bounded easing curve with exact endpoints', () => {
	assert.equal(easeOutRailMotion(0), 0);
	assert.equal(easeOutRailMotion(1), 1);
	assert.equal(easeOutRailMotion(-1), 0);
	assert.equal(easeOutRailMotion(2), 1);
	assert.ok(easeOutRailMotion(0.5) > 0.5);
});
