import { LIBRARY_FILE_ORIGIN } from '../../config/library';
import type { Ebook } from './ebooks';

export type LibraryBook = Pick<Ebook, 'id' | 'title' | 'authors' | 'authorStatus' | 'clcCode' | 'clcName' | 'categoryOnly' | 'access' | 'cover' | 'files' | 'href'> & Partial<Pick<Ebook, 'translator' | 'publisher' | 'publicationYear' | 'description' | 'notes'>>;
let unlocked = false;
let statusPromise: Promise<boolean> | undefined;
let catalogPromise: Promise<LibraryBook[]> | undefined;
export function isLibraryUnlocked() { return unlocked; }
function setUnlocked(value: boolean) {
	const changed = value !== unlocked; unlocked = value; catalogPromise = undefined;
	if (changed) window.dispatchEvent(new CustomEvent('library-access-change', { detail: { authenticated: value } }));
	try { localStorage.setItem('telysta.library.state', value ? 'unlocked' : 'locked'); } catch { /* State hint only, never a credential. */ }
}
export function checkLibrarySession() {
	return statusPromise ||= fetch(`${LIBRARY_FILE_ORIGIN}/api/session`, { credentials: 'include', cache: 'no-store' }).then(async response => {
		if (!response.ok) { setUnlocked(false); return false; }
		const data = await response.json(); setUnlocked(data.authenticated === true); return unlocked;
	}).catch(() => { setUnlocked(false); return false; }).finally(() => { statusPromise = undefined; });
}
export function getLibraryCatalog(force = false) {
	if (force) catalogPromise = undefined;
	return catalogPromise ||= fetch(unlocked ? `${LIBRARY_FILE_ORIGIN}/api/catalog` : '/ebooks/search-index.json', { credentials: unlocked ? 'include' : 'same-origin', cache: unlocked ? 'no-store' : 'default' }).then(async response => {
		if (!response.ok) throw new Error('书目暂时无法加载。');
		return await response.json() as LibraryBook[];
	}).catch(error => { catalogPromise = undefined; throw error; });
}
export function initLibraryAccess() {
 if (document.documentElement.dataset.libraryAccountReady) return;
 document.documentElement.dataset.libraryAccountReady = 'true';
 window.addEventListener('storage', event => { if (event.key === 'telysta.account.event') void checkLibrarySession(); });
 window.setInterval(() => { if (unlocked && !document.hidden) void checkLibrarySession(); }, 30000);
 window.addEventListener('pageshow', () => { void checkLibrarySession(); });
 document.addEventListener('visibilitychange', () => { if (!document.hidden) void checkLibrarySession(); });
 if (document.querySelector('[data-ebook-shelf], [data-library-book], [data-library-reader]')) void checkLibrarySession();
}
