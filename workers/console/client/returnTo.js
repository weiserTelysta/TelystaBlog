/** Only fixed public content routes can be returned to after signing in. No external redirects. */
export function commentReturnTo(value) {
 return typeof value==='string' && !/\s/.test(value) && /^\/(?:blog|ebooks)\/WEISER[a-f0-9]{12}\/#discussion$/.test(value) ? value : null;
}
