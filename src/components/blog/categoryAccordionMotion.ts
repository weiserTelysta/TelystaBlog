export const RAIL_WHEEL_SENSITIVITY = 0.7;
export const RAIL_MAX_EVENT_TRAVEL_RATIO = 0.35;
export const RAIL_MAX_TARGET_LEAD_RATIO = 0.8;
export const RAIL_SNAP_DISTANCE_RATIO = 0.18;

const WHEEL_LINE_HEIGHT_PX = 16;
const RAIL_MIN_MOTION_DURATION_MS = 120;
const RAIL_MAX_MOTION_DURATION_MS = 180;

export type RailWheelMetrics = {
	scrollLeft: number;
	targetScrollLeft: number;
	maxScrollLeft: number;
	cardSpan: number;
};

export function normalizeWheelDelta(
	delta: number,
	deltaMode: number,
	viewportWidth: number,
): number {
	if (!Number.isFinite(delta) || delta === 0) {
		return 0;
	}

	if (deltaMode === 1) {
		return delta * WHEEL_LINE_HEIGHT_PX;
	}

	if (deltaMode === 2) {
		return Number.isFinite(viewportWidth) && viewportWidth > 0
			? delta * viewportWidth
			: 0;
	}

	return deltaMode === 0 ? delta : 0;
}

export function getBoundedRailTarget(metrics: RailWheelMetrics, delta: number): number {
	const maxScrollLeft = toNonNegativeFinite(metrics.maxScrollLeft);
	const scrollLeft = clamp(toFinite(metrics.scrollLeft), 0, maxScrollLeft);
	const targetScrollLeft = clamp(
		toFinite(metrics.targetScrollLeft, scrollLeft),
		0,
		maxScrollLeft,
	);
	const cardSpan = Math.max(1, toFinite(metrics.cardSpan, 1));

	if (!Number.isFinite(delta) || delta === 0) {
		return targetScrollLeft;
	}

	const eventTravel = clamp(
		delta * RAIL_WHEEL_SENSITIVITY,
		-cardSpan * RAIL_MAX_EVENT_TRAVEL_RATIO,
		cardSpan * RAIL_MAX_EVENT_TRAVEL_RATIO,
	);
	const existingLead = targetScrollLeft - scrollLeft;
	const reversesDirection =
		Math.sign(existingLead) !== 0 && Math.sign(existingLead) !== Math.sign(eventTravel);
	const leadStart = reversesDirection ? 0 : existingLead;
	const boundedLead = clamp(
		leadStart + eventTravel,
		-cardSpan * RAIL_MAX_TARGET_LEAD_RATIO,
		cardSpan * RAIL_MAX_TARGET_LEAD_RATIO,
	);

	return clamp(scrollLeft + boundedLead, 0, maxScrollLeft);
}

export function getNearestRailSnapTarget(
	targetScrollLeft: number,
	cardTargets: readonly number[],
	maxDistance: number,
	maxScrollLeft: number,
): number | null {
	if (
		!Number.isFinite(targetScrollLeft) ||
		!Number.isFinite(maxDistance) ||
		maxDistance < 0 ||
		cardTargets.length === 0
	) {
		return null;
	}

	const boundedMaxScrollLeft = toNonNegativeFinite(maxScrollLeft);
	let nearestTarget: number | null = null;
	let nearestDistance = Number.POSITIVE_INFINITY;

	for (const candidate of cardTargets) {
		if (!Number.isFinite(candidate)) {
			continue;
		}

		const boundedCandidate = clamp(candidate, 0, boundedMaxScrollLeft);
		const distance = Math.abs(boundedCandidate - targetScrollLeft);

		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestTarget = boundedCandidate;
		}
	}

	return nearestTarget !== null && nearestDistance <= maxDistance ? nearestTarget : null;
}

export function getRailMotionDuration(distance: number, cardSpan: number): number {
	const safeDistance = Math.abs(toFinite(distance));
	const safeCardSpan = Math.max(1, toFinite(cardSpan, 1));
	const progress = clamp(safeDistance / safeCardSpan, 0, 1);

	return (
		RAIL_MIN_MOTION_DURATION_MS +
		(RAIL_MAX_MOTION_DURATION_MS - RAIL_MIN_MOTION_DURATION_MS) * progress
	);
}

export function easeOutRailMotion(progress: number): number {
	const boundedProgress = clamp(toFinite(progress), 0, 1);
	return 1 - (1 - boundedProgress) ** 3;
}

function toFinite(value: number, fallback = 0): number {
	return Number.isFinite(value) ? value : fallback;
}

function toNonNegativeFinite(value: number): number {
	return Math.max(0, toFinite(value));
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
