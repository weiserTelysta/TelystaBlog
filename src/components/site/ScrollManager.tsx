import { useEffect } from 'react';
import Lenis from 'lenis';
import { SCROLL_CONFIG } from '../../lib/scrollConfig';
import {
	clearScrollController,
	setScrollController,
	type ScrollController,
} from '../../lib/scrollRuntime';

function shouldKeepNativeScroll(node: Element | null) {
	if (!node) {
		return false;
	}

	return SCROLL_CONFIG.preventSelectors.some((selector) => node.closest(selector));
}

export default function ScrollManager() {
	useEffect(() => {
		if (!SCROLL_CONFIG.enabled) {
			return;
		}

		const reducedMotion = window.matchMedia(SCROLL_CONFIG.reducedMotionQuery);
		let lenis: Lenis | null = null;
		let controller: ScrollController | null = null;

		const destroyLenis = () => {
			if (controller) {
				clearScrollController(controller);
				controller = null;
			}

			lenis?.destroy();
			lenis = null;
		};

		const createLenis = () => {
			if (lenis || reducedMotion.matches) {
				return;
			}

			try {
				lenis = new Lenis({
					...SCROLL_CONFIG.options,
					prevent: shouldKeepNativeScroll,
				});
			} catch {
				return;
			}

			controller = {
				scrollTo: (target: number | string | HTMLElement, options?: { offset?: number }) => {
					lenis?.scrollTo(target, options);
				},
				start: () => {
					lenis?.start();
				},
				stop: () => {
					lenis?.stop();
				},
			};

			setScrollController(controller);
		};

		const syncMotionPreference = () => {
			if (reducedMotion.matches) {
				destroyLenis();
				return;
			}

			createLenis();
		};

		syncMotionPreference();
		reducedMotion.addEventListener('change', syncMotionPreference);

		return () => {
			reducedMotion.removeEventListener('change', syncMotionPreference);
			destroyLenis();
		};
	}, []);

	return null;
}
