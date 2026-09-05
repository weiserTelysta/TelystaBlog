const ENGLISH_MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
] as const;

// AP-style month forms keep article metadata compact without sacrificing readability.
const ARTICLE_MONTH_NAMES = [
	'Jan.',
	'Feb.',
	'March',
	'April',
	'May',
	'June',
	'July',
	'Aug.',
	'Sept.',
	'Oct.',
	'Nov.',
	'Dec.',
] as const;

export function formatPostDate(date: Date): string {
	return `${ENGLISH_MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatArticleDate(date: Date): string {
	return `${ARTICLE_MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

export function formatIndexDate(date: Date): string {
	return `${formatArticleDate(date)}, ${date.getFullYear()}`;
}

export function formatFullDate(date: Date): string {
	return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

export function formatPostMonth(month: number): string {
	return ENGLISH_MONTH_NAMES[month - 1] ?? String(month);
}

function padNumber(value: number): string {
	return String(value).padStart(2, '0');
}
