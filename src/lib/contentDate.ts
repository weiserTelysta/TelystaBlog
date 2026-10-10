/** Calendar dates are UTC so local preview and CI produce the same archive. */
export function parseContentDate(value: unknown): Date | undefined {
	if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number') return;
	const input = typeof value === 'string' ? value.trim() : value;
	if (typeof input === 'string') {
		const calendar = /^(\d{4})-(\d{1,2})-(\d{1,2})(?=$|[T ])/u.exec(input);
		if (calendar) {
			const canonical = `${calendar[1]}-${calendar[2].padStart(2, '0')}-${calendar[3].padStart(2, '0')}`;
			const day = new Date(`${canonical}T00:00:00.000Z`);
			if (!Number.isFinite(day.valueOf()) || day.toISOString().slice(0, 10) !== canonical) return;
			if (calendar[0].length === input.length) return day;
		}
	}
	const date = new Date(input);
	return Number.isFinite(date.valueOf()) ? date : undefined;
}
