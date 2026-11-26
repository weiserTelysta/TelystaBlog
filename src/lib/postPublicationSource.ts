/** Git stores Markdown with LF line endings even when input comes from Windows. */
export function normalizePublicationSource(source: string) {
	return source.replace(/\r\n/g, '\n');
}

export type PublishedPostAuthor = { name: string; username: string | null };

export function isPublishedPostAuthor(value: unknown): value is PublishedPostAuthor {
	if (!value || typeof value !== 'object') return false;
	const { name, username } = value as Record<string, unknown>;
	return typeof name === 'string' && !!name.trim() && [...name].length <= 40 &&
		!/[\p{Cc}\p{Cf}@]/u.test(name) &&
		(username === null || (typeof username === 'string' && /^[a-z][a-z0-9_-]{2,23}$/.test(username)));
}
