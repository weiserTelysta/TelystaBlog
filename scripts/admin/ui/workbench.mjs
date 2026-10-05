export function localDate(date = new Date()) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** YAML and filename dates can use unpadded months; compare calendar dates consistently. */
export function contentDate(value) {
	const match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?=$|T)/.exec(String(value ?? ''));
	return match
		? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
		: '';
}

export function imageReference(item, articlePath) {
	if (item.publicUrl?.startsWith('https://assets.telysta.com/'))
		return item.publicUrl;
	if (item.reference.startsWith('/'))
		return item.reference.split('/').map(encodeURIComponent).join('/');
	if (!item.reference.startsWith('src/')) return '';
	const from = articlePath.split('/').slice(0, -1),
		to = item.reference.split('/');
	while (from.length && to.length && from[0] === to[0]) {
		from.shift();
		to.shift();
	}
	return [...from.map(() => '..'), ...to.map(encodeURIComponent)].join('/');
}

/** Bounded LCS on the changed region; large edits use an explicit replacement. */
export function diffLines(previous, proposed) {
	const before = previous.replace(/\r\n/g, '\n').split('\n');
	const after = proposed.replace(/\r\n/g, '\n').split('\n');
	let start = 0,
		end = 0;
	while (
		start < before.length &&
		start < after.length &&
		before[start] === after[start]
	)
		start++;
	while (
		end < before.length - start &&
		end < after.length - start &&
		before[before.length - end - 1] === after[after.length - end - 1]
	)
		end++;
	if (start === before.length && start === after.length) return [];
	const a = before.slice(start, before.length - end),
		b = after.slice(start, after.length - end);
	const rows = [];
	let oldLine = start + 1,
		newLine = start + 1;
	const push = (kind, text) =>
		rows.push({
			kind,
			text,
			oldLine: kind === 'add' ? null : oldLine++,
			newLine: kind === 'remove' ? null : newLine++,
		});
	for (let i = Math.max(0, start - 2); i < start; i++)
		rows.push({
			kind: 'same',
			text: before[i],
			oldLine: i + 1,
			newLine: i + 1,
		});
	if ((a.length + 1) * (b.length + 1) > 250000) {
		a.forEach((line) => push('remove', line));
		b.forEach((line) => push('add', line));
	} else {
		const lengths = Array.from(
			{ length: a.length + 1 },
			() => new Uint32Array(b.length + 1),
		);
		for (let i = a.length - 1; i >= 0; i--)
			for (let j = b.length - 1; j >= 0; j--)
				lengths[i][j] =
					a[i] === b[j]
						? lengths[i + 1][j + 1] + 1
						: Math.max(lengths[i + 1][j], lengths[i][j + 1]);
		let i = 0,
			j = 0;
		while (i < a.length || j < b.length) {
			if (i < a.length && j < b.length && a[i] === b[j]) {
				push('same', a[i]);
				i++;
				j++;
			} else if (
				i < a.length &&
				(j === b.length || lengths[i + 1][j] >= lengths[i][j + 1])
			)
				push('remove', a[i++]);
			else push('add', b[j++]);
		}
	}
	for (let i = 0; i < Math.min(2, end); i++)
		push('same', before[before.length - end + i]);
	return rows;
}
