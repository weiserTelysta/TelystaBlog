import { LIBRARY_FILE_ORIGIN } from '../../config/library';
import type { Ebook } from './ebooks';

export type LibraryBook = Pick<Ebook, 'id' | 'title' | 'authors' | 'authorStatus' | 'clcCode' | 'clcName' | 'categoryOnly' | 'access' | 'cover' | 'files' | 'href'> & Partial<Pick<Ebook, 'translator' | 'publisher' | 'publicationYear' | 'description' | 'notes'>>;
let unlocked = false;
let initialized = false;
let statusPromise: Promise<boolean> | undefined;
let catalogPromise: Promise<LibraryBook[]> | undefined;
export function isLibraryUnlocked() { return unlocked; }
function setUnlocked(value: boolean) {
	if (unlocked !== value) {
		unlocked = value;
		catalogPromise = undefined;
		window.dispatchEvent(new CustomEvent('library-access-change', { detail: { authenticated: value } }));
	}
	try { localStorage.setItem('telysta.library.state', value ? 'unlocked' : 'locked'); } catch { /* State hint only, never a credential. */ }
}
export function checkLibrarySession(refresh = false) {
	if (statusPromise && !refresh) return statusPromise;
	const request: Promise<boolean> = fetch(`${LIBRARY_FILE_ORIGIN}/api/session`, { credentials: 'include', cache: 'no-store' })
		.then(async response => response.ok && (await response.json()).authenticated === true)
		.catch(() => false)
		.then(value => {
			if (statusPromise !== request) return statusPromise ?? unlocked;
			setUnlocked(value);
			return value;
		})
		.finally(() => { if (statusPromise === request) statusPromise = undefined; });
	statusPromise = request;
	return request;
}
export function getLibraryCatalog() {
	if (catalogPromise) return catalogPromise;
	const request = fetch(unlocked ? `${LIBRARY_FILE_ORIGIN}/api/catalog` : '/ebooks/search-index.json', { credentials: unlocked ? 'include' : 'same-origin', cache: unlocked ? 'no-store' : 'default' }).then(async response => {
		if (!response.ok) throw new Error('书目暂时无法加载。');
		return await response.json() as LibraryBook[];
	}).catch(error => {
		if (catalogPromise === request) catalogPromise = undefined;
		throw error;
	});
	catalogPromise = request;
	return request;
}
export function initLibraryAccess() {
	if (initialized) return;
	initialized = true;
	window.addEventListener('storage', event => { if (event.key === 'telysta.account.event') void checkLibrarySession(true); });
	window.setInterval(() => { if (unlocked && !document.hidden) void checkLibrarySession(); }, 30_000);
	window.addEventListener('pageshow', event => { if (event.persisted) void checkLibrarySession(); });
	document.addEventListener('visibilitychange', () => { if (!document.hidden) void checkLibrarySession(); });
}
