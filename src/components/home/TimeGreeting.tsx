import { useEffect, useMemo, useState } from 'react';
import { getGreetingForHour } from '../../lib/timeGreeting';

const TYPE_INTERVAL = 46;

export default function TimeGreeting() {
	const [hour, setHour] = useState(() => new Date().getHours());
	const [displayedText, setDisplayedText] = useState('');
	const [reducedMotion, setReducedMotion] = useState(false);

	const message = useMemo(() => getGreetingForHour(hour).message, [hour]);

	useEffect(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		const updateMotion = () => setReducedMotion(media.matches);
		updateMotion();
		media.addEventListener('change', updateMotion);

		return () => media.removeEventListener('change', updateMotion);
	}, []);

	useEffect(() => {
		const timer = window.setInterval(() => {
			setHour(new Date().getHours());
		}, 60 * 1000);

		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		if (reducedMotion) {
			setDisplayedText(message);
			return;
		}

		const letters = getTextSegments(message);
		let index = 0;
		setDisplayedText('');

		const timer = window.setInterval(() => {
			index += 1;
			setDisplayedText(letters.slice(0, index).join(''));

			if (index >= letters.length) {
				window.clearInterval(timer);
			}
		}, TYPE_INTERVAL);

		return () => window.clearInterval(timer);
	}, [message, reducedMotion]);

	return (
		<p className="time-greeting" aria-live="polite">
			<span>{displayedText}</span>
			{!reducedMotion && <span className="time-greeting__cursor" aria-hidden="true" />}
		</p>
	);
}

function getTextSegments(text: string) {
	if ('Segmenter' in Intl) {
		const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
		return Array.from(segmenter.segment(text), (part) => part.segment);
	}

	return Array.from(text);
}
