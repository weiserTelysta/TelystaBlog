import { HOME_GREETINGS, type HomeGreeting } from '../config/pages/homeGreetings';

const MIN_TIME_WEIGHT = 0.16;
const TIME_CURVE_POWER = 2.2;

export function getDayAffinityForHour(hour: number): number {
	const normalizedHour = normalizeHour(hour);
	const radians = ((normalizedHour - 13) / 24) * Math.PI * 2;

	return (Math.cos(radians) + 1) / 2;
}

export function getWeightedGreeting(hour: number, random: () => number = Math.random): HomeGreeting {
	const currentDayAffinity = getDayAffinityForHour(hour);
	const weightedGreetings = HOME_GREETINGS.map((greeting) => {
		const baseWeight = greeting.weight ?? 1;
		const distance = Math.abs(greeting.dayAffinity - currentDayAffinity);
		const timeMatch = MIN_TIME_WEIGHT + Math.pow(1 - distance, TIME_CURVE_POWER);

		return {
			greeting,
			weight: baseWeight * timeMatch,
		};
	});
	const totalWeight = weightedGreetings.reduce((total, item) => total + item.weight, 0);
	let roll = random() * totalWeight;

	for (const item of weightedGreetings) {
		roll -= item.weight;

		if (roll <= 0) {
			return item.greeting;
		}
	}

	return weightedGreetings.at(-1)?.greeting ?? HOME_GREETINGS[0];
}

function normalizeHour(hour: number): number {
	return ((hour % 24) + 24) % 24;
}
