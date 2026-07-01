import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { scrollToTarget } from '../../lib/scrollRuntime';

const IDLE_DELAY = 920;
const MIN_SCROLL_DISTANCE = 80;
const MAX_PROGRESS = 100;

function clampProgress(value: number) {
	return Math.min(Math.max(value, 0), 1);
}

export default function PageScrollIndicator() {
	const [progress, setProgress] = useState(0);
	const [visible, setVisible] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const trackRef = useRef<HTMLDivElement | null>(null);
	const idleTimer = useRef<number | undefined>(undefined);
	const frame = useRef<number | undefined>(undefined);
	const isDraggingRef = useRef(false);

	const clearIdleTimer = () => {
		if (idleTimer.current) {
			window.clearTimeout(idleTimer.current);
			idleTimer.current = undefined;
		}
	};

	const getScrollableDistance = () => (
		document.documentElement.scrollHeight - window.innerHeight
	);

	const getProgressFromPointer = (clientY: number) => {
		const track = trackRef.current;

		if (!track) {
			return 0;
		}

		const rect = track.getBoundingClientRect();
		return clampProgress((clientY - rect.top) / rect.height);
	};

	const scrollToProgress = (nextProgress: number) => {
		const scrollableDistance = getScrollableDistance();

		if (scrollableDistance <= MIN_SCROLL_DISTANCE) {
			return;
		}

		const normalizedProgress = clampProgress(nextProgress);
		setProgress(normalizedProgress);
		setVisible(true);
		scrollToTarget(scrollableDistance * normalizedProgress);
	};

	useEffect(() => {
		const updateProgress = () => {
			const scrollableDistance = getScrollableDistance();

			if (scrollableDistance <= MIN_SCROLL_DISTANCE) {
				setProgress(0);
				setVisible(false);
				return;
			}

			const nextProgress = clampProgress(window.scrollY / scrollableDistance);
			setProgress(nextProgress);
			setVisible(true);

			if (isDraggingRef.current) {
				return;
			}

			clearIdleTimer();
			idleTimer.current = window.setTimeout(() => {
				setVisible(false);
			}, IDLE_DELAY);
		};

		const requestUpdate = () => {
			if (frame.current) {
				return;
			}

			frame.current = window.requestAnimationFrame(() => {
				frame.current = undefined;
				updateProgress();
			});
		};

		requestUpdate();
		window.addEventListener('scroll', requestUpdate, { passive: true });
		window.addEventListener('resize', requestUpdate);

		return () => {
			window.removeEventListener('scroll', requestUpdate);
			window.removeEventListener('resize', requestUpdate);

			clearIdleTimer();

			if (frame.current) {
				window.cancelAnimationFrame(frame.current);
			}
		};
	}, []);

	useEffect(() => {
		if (!isDragging) {
			return;
		}

		const handlePointerMove = (event: PointerEvent) => {
			event.preventDefault();
			scrollToProgress(getProgressFromPointer(event.clientY));
		};

		const handlePointerUp = () => {
			isDraggingRef.current = false;
			setIsDragging(false);
			document.documentElement.classList.remove('is-page-scroll-dragging');

			clearIdleTimer();
			idleTimer.current = window.setTimeout(() => {
				setVisible(false);
			}, IDLE_DELAY);
		};

		window.addEventListener('pointermove', handlePointerMove, { passive: false });
		window.addEventListener('pointerup', handlePointerUp);
		window.addEventListener('pointercancel', handlePointerUp);

		return () => {
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', handlePointerUp);
			window.removeEventListener('pointercancel', handlePointerUp);
		};
	}, [isDragging]);

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (getScrollableDistance() <= MIN_SCROLL_DISTANCE) {
			return;
		}

		event.preventDefault();
		clearIdleTimer();
		isDraggingRef.current = true;
		setIsDragging(true);
		setVisible(true);
		document.documentElement.classList.add('is-page-scroll-dragging');
		scrollToProgress(getProgressFromPointer(event.clientY));
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		const step = event.shiftKey ? 0.16 : 0.08;

		if (event.key === 'Home') {
			event.preventDefault();
			scrollToProgress(0);
			return;
		}

		if (event.key === 'End') {
			event.preventDefault();
			scrollToProgress(1);
			return;
		}

		if (event.key === 'ArrowUp' || event.key === 'PageUp') {
			event.preventDefault();
			scrollToProgress(progress - step);
			return;
		}

		if (event.key === 'ArrowDown' || event.key === 'PageDown') {
			event.preventDefault();
			scrollToProgress(progress + step);
		}
	};

	const progressStyle = {
		'--scroll-progress': progress,
	} as CSSProperties;

	return (
		<div
			ref={trackRef}
			className={`page-scroll-indicator ${visible ? 'is-visible' : ''} ${isDragging ? 'is-dragging' : ''}`}
			role="slider"
			tabIndex={0}
			aria-label="Page scroll position"
			aria-valuemin={0}
			aria-valuemax={MAX_PROGRESS}
			aria-valuenow={Math.round(progress * MAX_PROGRESS)}
			onPointerDown={handlePointerDown}
			onKeyDown={handleKeyDown}
		>
			<span style={progressStyle} />
		</div>
	);
}
