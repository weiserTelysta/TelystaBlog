import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'textarea:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(',');

export function useDialogFocusTrap(
	active: boolean,
	containerRef: RefObject<HTMLElement | null>,
	initialFocusRef?: RefObject<HTMLElement | null>,
) {
	useEffect(() => {
		if (!active) {
			return;
		}

		const container = containerRef.current;
		if (!container) {
			return;
		}

		const getFocusableElements = () =>
			Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
				(element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
			);

		const focusInitialElement = () => {
			const initialElement = initialFocusRef?.current ?? getFocusableElements()[0];
			initialElement?.focus();
		};

		const animationFrame = window.requestAnimationFrame(focusInitialElement);

		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key !== 'Tab') {
				return;
			}

			const focusableElements = getFocusableElements();
			if (focusableElements.length === 0) {
				event.preventDefault();
				return;
			}

			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];
			const activeElement = document.activeElement;

			if (event.shiftKey && activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();
				return;
			}

			if (!event.shiftKey && activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		};

		document.addEventListener('keydown', handleKeydown);

		return () => {
			window.cancelAnimationFrame(animationFrame);
			document.removeEventListener('keydown', handleKeydown);
		};
	}, [active, containerRef, initialFocusRef]);
}
