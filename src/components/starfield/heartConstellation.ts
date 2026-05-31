import { randomBetween } from './starfieldMath';

export type HeartConstellation = {
	active: boolean;
	startedAt: number;
	duration: number;
	nextCheckAt: number;
	points: Array<{ x: number; y: number; radius: number; phase: number }>;
};

export function createHeartPoints(width: number, height: number) {
	const points: HeartConstellation['points'] = [];
	const scale = Math.min(width, height) * 0.008;
	const centerX = width * randomBetween(0.34, 0.66);
	const centerY = height * randomBetween(0.32, 0.58);
	const count = Math.floor(randomBetween(36, 45));

	for (let index = 0; index < count; index += 1) {
		const t = (index / count) * Math.PI * 2;
		const x = 16 * Math.sin(t) ** 3;
		const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

		points.push({
			x: centerX + x * scale + randomBetween(-1.2, 1.2),
			y: centerY + y * scale + randomBetween(-1.2, 1.2),
			radius: randomBetween(0.5, 0.95),
			phase: Math.random() * Math.PI * 2,
		});
	}

	return points;
}
