import { HOME_FIRST_STAR_DATE } from '../config/pages/home';

const firstStar = Date.parse(`${HOME_FIRST_STAR_DATE}T00:00:00+08:00`);
const millisecondsPerDay = 86_400_000;
const chineseNumbers = new Intl.NumberFormat('zh-CN');

export function firstStarAge(now: number) {
	const elapsed = now - firstStar;
	const nights = Math.max(0, Math.floor(elapsed / millisecondsPerDay));
	const remainder = ((elapsed % millisecondsPerDay) + millisecondsPerDay) % millisecondsPerDay;
	return { nights, untilNextNight: millisecondsPerDay - remainder };
}

export function formatNights(nights: number) {
	return chineseNumbers.format(nights);
}
