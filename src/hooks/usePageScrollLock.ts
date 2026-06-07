import { useEffect } from 'react';
import { startSmoothScroll, stopSmoothScroll } from '../lib/scrollRuntime';

export function usePageScrollLock(active: boolean) {
	useEffect(() => {
		if (!active) {
			return;
		}

		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		stopSmoothScroll();

		return () => {
			document.body.style.overflow = originalOverflow;
			startSmoothScroll();
		};
	}, [active]);
}
