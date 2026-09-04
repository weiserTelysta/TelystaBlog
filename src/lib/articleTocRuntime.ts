import { ARTICLE_PAGE_CONFIG } from '../config/pages/article';
import { scrollToTarget } from './scrollRuntime';

type TocItem = {
	heading: HTMLElement;
	link: HTMLAnchorElement;
};

type TocState = {
	tocList: HTMLElement;
	contentElement: HTMLElement | null;
	items: TocItem[];
	activeLink: HTMLAnchorElement | null;
	frame: number;
	clickLockUntil: number;
	manualTargetSlug: string | null;
	manualTargetUntil: number;
	isInspectingToc: boolean;
	userIntentUntil: number;
	inspectionUntil: number;
	programmaticScrollUntil: number;
	scrollSettleTimer: number;
	revealRetryTimer: number;
	lastRevealAt: number;
	prefersReducedMotion: MediaQueryList;
	cleanup: () => void;
};

declare global {
	interface Window {
		__telystaArticleTocRuntimeBound?: boolean;
	}
}

const tocStates = new WeakMap<HTMLElement, TocState>();

const getHeaderOffset = () => {
	const value = getComputedStyle(document.documentElement)
		.getPropertyValue('--site-header-clearance')
		.trim();
	const parsed = Number.parseFloat(value);

	return Number.isFinite(parsed) ? parsed : 112;
};

const getHeadingTop = (heading: HTMLElement) => heading.getBoundingClientRect().top + window.scrollY;

const getReadingLine = () => window.scrollY + getHeaderOffset() + ARTICLE_PAGE_CONFIG.toc.behavior.readingLineOffset;

const getContentBottom = (state: TocState) => {
	if (!state.contentElement) {
		return document.documentElement.scrollHeight;
	}

	return state.contentElement.getBoundingClientRect().bottom + window.scrollY;
};

const isNearContentBottom = (state: TocState) => {
	const { bottomThreshold } = ARTICLE_PAGE_CONFIG.toc.behavior;
	const bottomDistance = getContentBottom(state) - (window.scrollY + window.innerHeight);

	return bottomDistance <= bottomThreshold;
};

const canReveal = (state: TocState) => {
	const now = window.performance.now();

	return !state.isInspectingToc && now > state.userIntentUntil && now > state.inspectionUntil && now > state.clickLockUntil;
};

const getHashSlug = () => {
	const hash = window.location.hash.slice(1);

	if (!hash) {
		return null;
	}

	try {
		return decodeURIComponent(hash);
	} catch {
		return hash;
	}
};

const getLinkScrollBounds = (state: TocState, link: HTMLAnchorElement) => {
	const listRect = state.tocList.getBoundingClientRect();
	const linkRect = link.getBoundingClientRect();
	const top = linkRect.top - listRect.top + state.tocList.scrollTop;

	return {
		top,
		bottom: top + linkRect.height,
	};
};

const syncTocScrollState = (tocList: HTMLElement) => {
	const isScrollable = tocList.scrollHeight > tocList.clientHeight + 1;
	const isAtStart = tocList.scrollTop <= 1;
	const isAtEnd = tocList.scrollTop + tocList.clientHeight >= tocList.scrollHeight - 1;

	tocList.dataset.tocScrollable = String(isScrollable);
	tocList.dataset.tocAtStart = String(isAtStart);
	tocList.dataset.tocAtEnd = String(isAtEnd);
};

const clampScrollTop = (state: TocState, scrollTop: number) => {
	const maxScrollTop = Math.max(0, state.tocList.scrollHeight - state.tocList.clientHeight);

	return Math.min(Math.max(0, scrollTop), maxScrollTop);
};

const getTocScrollBehavior = (state: TocState, force: boolean): ScrollBehavior => (
	force || state.prefersReducedMotion.matches ? 'auto' : 'smooth'
);

const revealLinkIfNeeded = (state: TocState, link: HTMLAnchorElement, force = false) => {
	if (state.tocList.offsetParent === null) {
		return;
	}

	const {
		comfortAnchor,
		comfortBottom,
		comfortTop,
		maxRevealStep,
		programmaticScrollMs,
		revealAnchor,
		revealCooldownMs,
		revealMargin,
	} = ARTICLE_PAGE_CONFIG.toc.behavior;
	const now = window.performance.now();
	const { top: linkTop, bottom: linkBottom } = getLinkScrollBounds(state, link);
	const viewTop = state.tocList.scrollTop;
	const viewBottom = viewTop + state.tocList.clientHeight;
	const linkCenter = (linkTop + linkBottom) / 2;
	const comfortTopLine = viewTop + state.tocList.clientHeight * comfortTop;
	const comfortBottomLine = viewTop + state.tocList.clientHeight * comfortBottom;
	const isComfortable = linkCenter >= comfortTopLine && linkCenter <= comfortBottomLine;
	const isVisible = linkTop >= viewTop + revealMargin && linkBottom <= viewBottom - revealMargin;
	const shouldStayPut = isComfortable && isVisible;

	if (!force && (shouldStayPut || !canReveal(state) || now - state.lastRevealAt < revealCooldownMs)) {
		return;
	}

	const maxScrollTop = Math.max(0, state.tocList.scrollHeight - state.tocList.clientHeight);
	const anchor = force ? revealAnchor : comfortAnchor;
	const anchoredScrollTop = Math.max(0, linkTop - state.tocList.clientHeight * anchor);
	const shouldUseEndAlignment = force && linkBottom > maxScrollTop + state.tocList.clientHeight - revealMargin;
	const targetScrollTop = shouldUseEndAlignment ? maxScrollTop : clampScrollTop(state, anchoredScrollTop);
	const scrollDelta = targetScrollTop - state.tocList.scrollTop;
	const nextScrollTop = !force && Math.abs(scrollDelta) > maxRevealStep
		? clampScrollTop(state, state.tocList.scrollTop + Math.sign(scrollDelta) * maxRevealStep)
		: targetScrollTop;

	if (Math.abs(state.tocList.scrollTop - nextScrollTop) < 1) {
		return;
	}

	state.lastRevealAt = now;
	state.programmaticScrollUntil = now + programmaticScrollMs;
	state.tocList.scrollTo({
		top: nextScrollTop,
		behavior: getTocScrollBehavior(state, force),
	});
	syncTocScrollState(state.tocList);
};

const setActiveLink = (state: TocState, nextLink: HTMLAnchorElement) => {
	if (state.activeLink === nextLink) {
		return;
	}

	state.activeLink?.classList.remove('is-active');
	state.activeLink?.removeAttribute('aria-current');
	nextLink.classList.add('is-active');
	nextLink.setAttribute('aria-current', 'location');
	state.activeLink = nextLink;
};

const findCurrentItem = (state: TocState) => {
	const readingLine = getReadingLine();
	let current = state.items[0];

	for (const item of state.items) {
		if (getHeadingTop(item.heading) <= readingLine) {
			current = item;
			continue;
		}

		break;
	}

	if (isNearContentBottom(state)) {
		const contentBottom = getContentBottom(state);
		const bottomLine = Math.min(
			contentBottom,
			window.scrollY + window.innerHeight - ARTICLE_PAGE_CONFIG.toc.behavior.bottomThreshold,
		);

		for (const item of state.items) {
			if (getHeadingTop(item.heading) <= bottomLine) {
				current = item;
				continue;
			}

			break;
		}
	}

	return current;
};

const updateActiveLink = (state: TocState, forceReveal = false) => {
	state.frame = 0;

	const now = window.performance.now();

	if (state.manualTargetSlug && now < state.manualTargetUntil) {
		const manualItem = state.items.find((item) => item.link.dataset.tocLink === state.manualTargetSlug);

		if (manualItem) {
			setActiveLink(state, manualItem.link);
			revealLinkIfNeeded(state, manualItem.link, forceReveal);
		}

		return;
	}

	state.manualTargetSlug = null;
	const currentItem = findCurrentItem(state);
	setActiveLink(state, currentItem.link);
	revealLinkIfNeeded(state, currentItem.link, forceReveal);
};

const requestActiveLinkUpdate = (state: TocState) => {
	if (state.frame) {
		return;
	}

	state.frame = window.requestAnimationFrame(() => updateActiveLink(state));
};

const markUserIntent = (state: TocState) => {
	state.userIntentUntil = window.performance.now() + ARTICLE_PAGE_CONFIG.toc.behavior.userIntentMs;
};

const markInspection = (state: TocState, duration: number = ARTICLE_PAGE_CONFIG.toc.behavior.userIntentMs) => {
	state.inspectionUntil = window.performance.now() + duration;
};

const scheduleSettledReveal = (state: TocState) => {
	window.clearTimeout(state.scrollSettleTimer);
	state.scrollSettleTimer = window.setTimeout(() => {
		if (state.activeLink) {
			revealLinkIfNeeded(state, state.activeLink);
		}
	}, ARTICLE_PAGE_CONFIG.toc.behavior.scrollSettleMs);
};

const scheduleRevealRetry = (state: TocState) => {
	window.clearTimeout(state.revealRetryTimer);
	state.revealRetryTimer = window.setTimeout(() => {
		syncTocScrollState(state.tocList);

		if (state.activeLink) {
			revealLinkIfNeeded(state, state.activeLink);
		}
	}, ARTICLE_PAGE_CONFIG.toc.behavior.userIntentMs + ARTICLE_PAGE_CONFIG.toc.behavior.scrollSettleMs);
};

const collectItems = (tocList: HTMLElement) => {
	const links = Array.from(tocList.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));

	return links
		.map((link) => {
			const slug = link.dataset.tocLink;
			const heading = slug ? document.getElementById(slug) : null;

			return heading ? { heading, link } : null;
		})
		.filter((item): item is TocItem => item !== null);
};

const initTocList = (tocList: HTMLElement) => {
	if (tocStates.has(tocList)) {
		return;
	}

	const items = collectItems(tocList);

	if (items.length === 0) {
		return;
	}

	const state: TocState = {
		tocList,
		contentElement: document.querySelector<HTMLElement>('[data-article-content]'),
		items,
		activeLink: null,
		frame: 0,
		clickLockUntil: 0,
		manualTargetSlug: null,
		manualTargetUntil: 0,
		isInspectingToc: false,
		userIntentUntil: 0,
		inspectionUntil: 0,
		programmaticScrollUntil: 0,
		scrollSettleTimer: 0,
		revealRetryTimer: 0,
		lastRevealAt: 0,
		prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
		cleanup: () => {},
	};

	const requestUpdate = () => {
		syncTocScrollState(tocList);
		requestActiveLinkUpdate(state);
		scheduleSettledReveal(state);
	};
	const registerUserIntent = () => {
		if (window.performance.now() < state.programmaticScrollUntil) {
			syncTocScrollState(tocList);
			return;
		}

		markUserIntent(state);
		syncTocScrollState(tocList);
		scheduleRevealRetry(state);
	};
	const syncTocOnly = () => {
		syncTocScrollState(tocList);
	};
	const disclosure = tocList.closest<HTMLDetailsElement>('details');
	const handleDisclosureToggle = () => {
		if (disclosure?.open) {
			state.isInspectingToc = false;
			state.userIntentUntil = 0;
			state.inspectionUntil = 0;
			window.clearTimeout(state.scrollSettleTimer);
			window.clearTimeout(state.revealRetryTimer);

			if (state.frame) {
				window.cancelAnimationFrame(state.frame);
				state.frame = 0;
			}

			state.frame = window.requestAnimationFrame(() => {
				syncTocScrollState(tocList);
				updateActiveLink(state, true);
			});
		}
	};
	const handleMouseEnter = () => {
		state.isInspectingToc = true;
		window.clearTimeout(state.revealRetryTimer);
		syncTocScrollState(tocList);
	};
	const handleMouseLeave = () => {
		state.isInspectingToc = false;
		markInspection(state, ARTICLE_PAGE_CONFIG.toc.behavior.inspectionLeaveMs);
		scheduleRevealRetry(state);
	};

	const handleClick = (event: Event) => {
		const link = event.currentTarget as HTMLAnchorElement;
		const slug = link.dataset.tocLink;
		const heading = slug ? document.getElementById(slug) : null;

		if (!slug || !heading) {
			return;
		}

		event.preventDefault();
		window.history.replaceState(null, '', `#${slug}`);
		state.clickLockUntil = window.performance.now() + ARTICLE_PAGE_CONFIG.toc.behavior.clickLockMs;
		state.manualTargetSlug = slug;
		state.manualTargetUntil = state.clickLockUntil;
		setActiveLink(state, link);
		revealLinkIfNeeded(state, link, true);
		scrollToTarget(heading, { offset: -getHeaderOffset() });
		window.setTimeout(requestUpdate, ARTICLE_PAGE_CONFIG.toc.behavior.clickLockMs + ARTICLE_PAGE_CONFIG.toc.behavior.scrollSettleMs);
	};

	items.forEach(({ link }) => {
		link.addEventListener('click', handleClick);
	});
	tocList.addEventListener('wheel', registerUserIntent, { passive: true });
	tocList.addEventListener('touchstart', registerUserIntent, { passive: true });
	tocList.addEventListener('pointerdown', registerUserIntent);
	tocList.addEventListener('scroll', syncTocOnly, { passive: true });
	tocList.addEventListener('mouseenter', handleMouseEnter);
	tocList.addEventListener('mouseleave', handleMouseLeave);
	disclosure?.addEventListener('toggle', handleDisclosureToggle);
	window.addEventListener('scroll', requestUpdate, { passive: true });
	window.addEventListener('resize', requestUpdate);

	state.cleanup = () => {
		items.forEach(({ link }) => {
			link.removeEventListener('click', handleClick);
		});
		tocList.removeEventListener('wheel', registerUserIntent);
		tocList.removeEventListener('touchstart', registerUserIntent);
		tocList.removeEventListener('pointerdown', registerUserIntent);
		tocList.removeEventListener('scroll', syncTocOnly);
		tocList.removeEventListener('mouseenter', handleMouseEnter);
		tocList.removeEventListener('mouseleave', handleMouseLeave);
		disclosure?.removeEventListener('toggle', handleDisclosureToggle);
		window.removeEventListener('scroll', requestUpdate);
		window.removeEventListener('resize', requestUpdate);

		if (state.frame) {
			window.cancelAnimationFrame(state.frame);
		}

		window.clearTimeout(state.scrollSettleTimer);
		window.clearTimeout(state.revealRetryTimer);
		tocStates.delete(tocList);
	};

	tocStates.set(tocList, state);
	syncTocScrollState(tocList);

	const hashSlug = getHashSlug();
	const hashItem = hashSlug ? items.find((item) => item.link.dataset.tocLink === hashSlug) : null;

	if (hashItem) {
		setActiveLink(state, hashItem.link);
		revealLinkIfNeeded(state, hashItem.link, true);
	} else {
		updateActiveLink(state, true);
	}
};

export const initArticleTocRuntime = () => {
	const tocLists = Array.from(document.querySelectorAll<HTMLElement>('[data-article-toc-list]'));

	tocLists.forEach(initTocList);
};

export const bindArticleTocRuntime = () => {
	if (window.__telystaArticleTocRuntimeBound) {
		return;
	}

	window.__telystaArticleTocRuntimeBound = true;
	document.addEventListener('astro:page-load', initArticleTocRuntime);
	document.addEventListener('astro:before-swap', () => {
		const tocLists = Array.from(document.querySelectorAll<HTMLElement>('[data-article-toc-list]'));

		tocLists.forEach((tocList) => tocStates.get(tocList)?.cleanup());
	});
};
