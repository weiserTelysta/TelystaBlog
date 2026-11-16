export type ReaderProgress = {
	current: number;
	total: number;
	label: string;
	isFirst: boolean;
	isLast: boolean;
	href?: string;
};
export type ReaderOutlineItem = {
	label: string;
	href?: string;
	go: () => Promise<void>;
	children?: ReaderOutlineItem[];
};
export type ReaderView = {
	previous: () => Promise<void>;
	next: () => Promise<void>;
	smaller: () => Promise<void>;
	larger: () => Promise<void>;
	resize: () => void;
	destroy: () => void;
	goToPage?: (page: number) => Promise<void>;
};
export type ReaderCallbacks = {
	progress: (value: ReaderProgress) => void;
	outline: (items: ReaderOutlineItem[]) => void;
	navigate: (direction: 'previous' | 'next') => void;
	escape?: () => void;
};

/** A tap must not consume text selection, editable controls, links or dragging. */
export function bindReaderNavigation(
	target: Document | HTMLElement,
	callbacks: ReaderCallbacks,
	signal: AbortSignal,
	viewport?: HTMLElement
) {
	let down: { x: number; y: number; time: number } | undefined;
	let lastWheel = 0,
		wheelDelta = 0,
		wheelTurned = false;
	// EPUB documents live in another realm, so instanceof Document is false there.
	const isDocument = target.nodeType === 9;
	const doc = (isDocument ? target : target.ownerDocument) as Document;
	function interactive(node: EventTarget | null) {
		const element = node as Element | null;
		return (
			typeof element?.closest === 'function' &&
			!!element.closest(
				'a,button,input,textarea,select,summary,audio,video,[contenteditable]'
			)
		);
	}
	target.addEventListener(
		'keydown',
		(event) => {
			const key = event as KeyboardEvent;
			if (key.key === 'Escape') {
				callbacks.escape?.();
				return;
			}
			if (
				key.defaultPrevented ||
				key.altKey ||
				key.ctrlKey ||
				key.metaKey ||
				key.shiftKey ||
				interactive(key.target) ||
				doc.getSelection()?.toString()
			)
				return;
			const direction = ['ArrowLeft', 'PageUp'].includes(key.key)
				? 'previous'
				: ['ArrowRight', 'PageDown'].includes(key.key)
					? 'next'
					: undefined;
			if (direction) {
				key.preventDefault();
				callbacks.navigate(direction);
			}
		},
		{ signal }
	);
	target.addEventListener(
		'pointerdown',
		(event) => {
			const pointer = event as PointerEvent;
			down =
				pointer.isPrimary &&
				pointer.button === 0 &&
				!pointer.altKey &&
				!pointer.ctrlKey &&
				!pointer.metaKey &&
				!pointer.shiftKey &&
				!interactive(pointer.target) &&
				!doc.getSelection()?.toString()
					? { x: pointer.clientX, y: pointer.clientY, time: performance.now() }
					: undefined;
		},
		{ signal }
	);
	target.addEventListener(
		'pointerup',
		(event) => {
			const pointer = event as PointerEvent,
				start = down;
			down = undefined;
			if (
				!start ||
				interactive(pointer.target) ||
				pointer.defaultPrevented ||
				performance.now() - start.time > 500 ||
				Math.hypot(pointer.clientX - start.x, pointer.clientY - start.y) > 8 ||
				doc.getSelection()?.toString()
			)
				return;
			const box =
				viewport?.getBoundingClientRect() ||
				(isDocument
					? { left: 0, width: doc.documentElement.clientWidth }
					: (target as HTMLElement).getBoundingClientRect());
			// EPUB.js expands its iframe to the chapter's full column width. Map
			// local event coordinates into the visible stage, not that hidden width.
			const frameLeft =
				viewport && isDocument
					? doc.defaultView?.frameElement?.getBoundingClientRect().left || 0
					: 0;
			const fraction = (pointer.clientX + frameLeft - box.left) / box.width;
			if (fraction < 0.5) callbacks.navigate('previous');
			else if (fraction > 0.5) callbacks.navigate('next');
		},
		{ signal }
	);
	target.addEventListener(
		'pointercancel',
		() => {
			down = undefined;
		},
		{ signal }
	);
	target.addEventListener(
		'wheel',
		(event) => {
			const wheel = event as WheelEvent;
			if (
				wheel.defaultPrevented ||
				wheel.ctrlKey ||
				wheel.metaKey ||
				wheel.altKey ||
				interactive(wheel.target) ||
				doc.getSelection()?.toString()
			)
				return;
			// Let an overflowing table/code area scroll before treating a wheel as a page turn.
			for (
				let element = wheel.target as Element | null;
				element && element !== doc.body && element !== target;
				element = element.parentElement
			) {
				const style = doc.defaultView!.getComputedStyle(element),
					node = element as HTMLElement;
				if (
					/(auto|scroll)/.test(style.overflowY) &&
					node.scrollHeight > node.clientHeight + 2 &&
					(wheel.deltaY > 0
						? node.scrollTop + node.clientHeight < node.scrollHeight - 1
						: node.scrollTop > 0)
				)
					return;
			}
			const now = performance.now();
			if (now - lastWheel > 180) {
				wheelDelta = 0;
				wheelTurned = false;
			}
			lastWheel = now;
			const delta =
				Math.abs(wheel.deltaX) > Math.abs(wheel.deltaY)
					? wheel.deltaX
					: wheel.deltaY;
			if (!delta) return;
			wheel.preventDefault();
			if (wheelTurned) return;
			const pixels =
				delta *
				(wheel.deltaMode === 1
					? 18
					: wheel.deltaMode === 2
						? doc.defaultView?.innerHeight || 700
						: 1);
			if (Math.sign(pixels) !== Math.sign(wheelDelta)) wheelDelta = 0;
			wheelDelta += pixels;
			if (Math.abs(wheelDelta) >= 36) {
				wheelTurned = true;
				callbacks.navigate(wheelDelta > 0 ? 'next' : 'previous');
			}
		},
		{ signal, passive: false }
	);
}
