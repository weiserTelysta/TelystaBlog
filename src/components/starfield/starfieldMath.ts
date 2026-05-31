import { BASE_COLORS, BREATH_DURATION, CYCLE_DURATION, LONG_METEOR_COLORS, SPECIAL_COLORS } from './starfieldConfig';

export function randomBetween(min: number, max: number) {
	return min + Math.random() * (max - min);
}

export function wrap(value: number, max: number) {
	return ((value % max) + max) % max;
}

export function easeInOut(value: number) {
	const clamped = Math.max(0, Math.min(1, value));
	return clamped * clamped * (3 - 2 * clamped);
}

export function smoothPulse(progress: number) {
	if (progress <= 0 || progress >= 1) return 0;
	if (progress < 0.24) return easeInOut(progress / 0.24);
	if (progress > 0.76) return easeInOut((1 - progress) / 0.24);
	return 1;
}

export function getCycleGlow(time: number) {
	const progress = (time % CYCLE_DURATION) / CYCLE_DURATION;
	const distanceFromPeak = Math.abs(progress - 0.58);
	const window = 0.115;

	if (distanceFromPeak > window) return 0;

	const normalized = 1 - distanceFromPeak / window;
	return easeInOut(normalized) * 0.9;
}

export function getBreathBrightness(time: number) {
	const progress = (time % BREATH_DURATION) / BREATH_DURATION;
	const wave = Math.sin(progress * Math.PI * 2);

	if (wave < 0) {
		return 1 + wave * 0.07;
	}

	return 1 + wave * 0.03;
}

export function pickColor(special: boolean) {
	const colors = special ? SPECIAL_COLORS : BASE_COLORS;
	return colors[Math.floor(Math.random() * colors.length)];
}

export function pickLongMeteorColor() {
	return LONG_METEOR_COLORS[Math.floor(Math.random() * LONG_METEOR_COLORS.length)];
}
