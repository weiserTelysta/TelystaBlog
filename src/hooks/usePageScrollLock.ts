import { useEffect } from 'react';
import { unlockPageScroll, lockPageScroll } from '../lib/scrollRuntime';

export function usePageScrollLock(active: boolean) {
	useEffect(() => {
		if (!active) {
			return;
		}

		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		lockPageScroll();

		return () => {
			document.body.style.overflow = originalOverflow;
			unlockPageScroll();
		};
	}, [active]);
}
