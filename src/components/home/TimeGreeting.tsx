import { useEffect, useState } from 'react';
import { getWeightedGreeting } from '../../lib/homeGreeting';

type GreetingDisplayMode = 'type' | 'fade';

const TYPEWRITER_MAX_SEGMENTS = 42;
const TYPE_DELAY = 44;

export default function TimeGreeting() {
	const [message] = useState(() => getWeightedGreeting(new Date().getHours()).text);
	const [displayedText, setDisplayedText] = useState('');
	const [reducedMotion, setReducedMotion] = useState(false);
	const [isComplete, setIsComplete] = useState(false);
	const displayMode = getGreetingDisplayMode(message);

	useEffect(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		const updateMotion = () => setReducedMotion(media.matches);
		updateMotion();
		media.addEventListener('change', updateMotion);

		return () => media.removeEventListener('change', updateMotion);
	}, []);

	useEffect(() => {
		setIsComplete(false);

		if (reducedMotion || displayMode === 'fade') {
			setDisplayedText(message);
			setIsComplete(true);
			return;
		}

		const letters = getTextSegments(message);
		let index = 0;
		let timer: number | undefined;
		setDisplayedText('');

		const typeNextSegment = () => {
			index += 1;
			setDisplayedText(letters.slice(0, index).join(''));

			if (index >= letters.length) {
				setIsComplete(true);
				return;
			}

			timer = window.setTimeout(typeNextSegment, getTypeDelay(letters.length));
		};

		timer = window.setTimeout(typeNextSegment, getTypeDelay(letters.length));

		return () => {
			if (typeof timer === 'number') {
				window.clearTimeout(timer);
			}
		};
	}, [displayMode, message, reducedMotion]);

	return (
		<p
			className={`time-greeting time-greeting--${displayMode}${
				isComplete ? ' time-greeting--complete' : ''
			}`}
			aria-live="polite"
		>
			<span>{displayedText}</span>
			{!reducedMotion && displayMode === 'type' && !isComplete && (
				<span className="time-greeting__cursor" aria-hidden="true" />
			)}
		</p>
	);
}

function getGreetingDisplayMode(text: string): GreetingDisplayMode {
	const segments = getTextSegments(text);

	if (text.includes('\n') || segments.length > TYPEWRITER_MAX_SEGMENTS) {
		return 'fade';
	}

	return 'type';
}

function getTextSegments(text: string) {
	if ('Segmenter' in Intl) {
		const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
		return Array.from(segmenter.segment(text), (part) => part.segment);
	}

	return Array.from(text);
}

function getTypeDelay(total: number) {
	if (total <= 16) {
		return TYPE_DELAY + 4;
	}

	if (total <= TYPEWRITER_MAX_SEGMENTS) {
		return TYPE_DELAY;
	}

	return TYPE_DELAY - 4;
}
