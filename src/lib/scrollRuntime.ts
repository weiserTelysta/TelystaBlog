type ScrollTarget = number | string | HTMLElement;

export type ScrollController = {
	scrollTo: (target: ScrollTarget, options?: { offset?: number }) => void;
	start: () => void;
	stop: () => void;
};

let activeController: ScrollController | null = null;

export function setScrollController(controller: ScrollController) {
	activeController = controller;
}

export function clearScrollController(controller: ScrollController) {
	if (activeController === controller) {
		activeController = null;
	}
}

export function isSmoothScrollReady() {
	return activeController !== null;
}

export function startSmoothScroll() {
	activeController?.start();
}

export function stopSmoothScroll() {
	activeController?.stop();
}

export function scrollToTop() {
	if (activeController) {
		activeController.scrollTo(0);
		return;
	}

	window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function scrollToTarget(target: ScrollTarget, options?: { offset?: number }) {
	if (activeController) {
		activeController.scrollTo(target, options);
		return;
	}

	if (typeof target === 'number') {
		window.scrollTo({ top: target + (options?.offset ?? 0), behavior: 'smooth' });
		return;
	}

	const element = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;

	if (!element) {
		return;
	}

	const top = element.getBoundingClientRect().top + window.scrollY + (options?.offset ?? 0);
	window.scrollTo({ top, behavior: 'smooth' });
}
