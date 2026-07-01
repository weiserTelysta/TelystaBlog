import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { HomeProfileTone } from '../../config/pages/homeProfiles';
import { getWeightedGreeting } from '../../lib/homeGreeting';
import { getWeightedHomeProfile } from '../../lib/homeProfile';

type IntroPhase = 'summoning' | 'revealed' | 'speaking' | 'settled';
type GreetingDisplayMode = 'type' | 'fade';

const TYPEWRITER_MAX_SEGMENTS = 96;
const TYPEWRITER_MAX_LINES = 4;
const TYPE_DELAY = 44;
const LINE_BREAK_DELAY = 320;
const INTRO_START_DELAY = 220;
const FADE_SETTLE_DELAY = 760;
const IMAGE_READY_TIMEOUT = 1400;

const TONE_STYLES: Record<HomeProfileTone, HomeIntroStyle> = {
	warm: {
		'--home-intro-accent': 'rgba(222, 190, 124, 0.72)',
		'--home-intro-accent-soft': 'rgba(222, 190, 124, 0.16)',
	},
	moon: {
		'--home-intro-accent': 'rgba(156, 199, 232, 0.76)',
		'--home-intro-accent-soft': 'rgba(156, 199, 232, 0.16)',
	},
	rose: {
		'--home-intro-accent': 'rgba(214, 167, 200, 0.72)',
		'--home-intro-accent-soft': 'rgba(214, 167, 200, 0.15)',
	},
	violet: {
		'--home-intro-accent': 'rgba(185, 164, 226, 0.72)',
		'--home-intro-accent-soft': 'rgba(185, 164, 226, 0.15)',
	},
	mist: {
		'--home-intro-accent': 'rgba(177, 199, 206, 0.7)',
		'--home-intro-accent-soft': 'rgba(177, 199, 206, 0.14)',
	},
};

type HomeIntroStyle = CSSProperties & {
	'--home-intro-accent': string;
	'--home-intro-accent-soft': string;
};

export default function HomeIntro() {
	const [intro] = useState(() => {
		const now = new Date();

		return {
			profile: getWeightedHomeProfile(),
			greeting: getWeightedGreeting(now.getHours()).text,
		};
	});
	const [phase, setPhase] = useState<IntroPhase>('summoning');
	const [displayedText, setDisplayedText] = useState('');
	const [reducedMotion, setReducedMotion] = useState(false);
	const displayMode = getGreetingDisplayMode(intro.greeting);
	const toneStyle = useMemo(
		() => TONE_STYLES[intro.profile.tone ?? 'moon'],
		[intro.profile.tone],
	);
	const isSettled = phase === 'settled';
	const isSpeaking = phase === 'speaking';
	const isIdentityReady = phase !== 'summoning';
	const shouldShowCursor = !reducedMotion && displayMode === 'type' && isSpeaking;

	useEffect(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		const updateMotion = () => setReducedMotion(media.matches);

		updateMotion();
		media.addEventListener('change', updateMotion);

		return () => media.removeEventListener('change', updateMotion);
	}, []);

	useEffect(() => {
		if (!reducedMotion) return;

		setDisplayedText(intro.greeting);
		setPhase('settled');
	}, [intro.greeting, reducedMotion]);

	useEffect(() => {
		if (reducedMotion) return;

		let isCancelled = false;
		let hasRevealed = false;
		const reveal = () => {
			if (isCancelled || hasRevealed) return;

			hasRevealed = true;
			setPhase('revealed');
			window.setTimeout(() => {
				if (isCancelled) return;

				setPhase('speaking');

				if (displayMode === 'fade') {
					setDisplayedText(intro.greeting);
					window.setTimeout(() => {
						if (!isCancelled) {
							setPhase('settled');
						}
					}, FADE_SETTLE_DELAY);
				}
			}, INTRO_START_DELAY);
		};
		const timeout = window.setTimeout(reveal, IMAGE_READY_TIMEOUT);
		const image = new Image();

		image.src = intro.profile.avatar.src;

		const markReady = () => {
			window.clearTimeout(timeout);
			reveal();
		};

		if (typeof image.decode === 'function') {
			image.decode().then(markReady).catch(markReady);
		} else if (image.complete) {
			markReady();
		} else {
			image.addEventListener('load', markReady, { once: true });
			image.addEventListener('error', markReady, { once: true });
		}

		return () => {
			isCancelled = true;
			window.clearTimeout(timeout);
			image.removeEventListener('load', markReady);
			image.removeEventListener('error', markReady);
		};
	}, [displayMode, intro.greeting, intro.profile.avatar.src, reducedMotion]);

	useEffect(() => {
		if (reducedMotion || phase !== 'speaking' || displayMode !== 'type') return;

		const lineSegments = getLineSegments(intro.greeting);
		const displayedLines = lineSegments.map(() => '');
		let lineIndex = 0;
		let segmentIndex = 0;
		let timer: number | undefined;

		setDisplayedText('');

		const typeNextSegment = () => {
			const currentLine = lineSegments[lineIndex] ?? [];

			if (segmentIndex < currentLine.length) {
				segmentIndex += 1;
				displayedLines[lineIndex] = currentLine.slice(0, segmentIndex).join('');
				setDisplayedText(displayedLines.slice(0, lineIndex + 1).join('\n'));
				timer = window.setTimeout(typeNextSegment, getTypeDelay(currentLine.length));
				return;
			}

			if (lineIndex < lineSegments.length - 1) {
				lineIndex += 1;
				segmentIndex = 0;
				setDisplayedText(displayedLines.slice(0, lineIndex + 1).join('\n'));
				timer = window.setTimeout(typeNextSegment, LINE_BREAK_DELAY);
				return;
			}

			setDisplayedText(intro.greeting);
			setPhase('settled');
		};

		timer = window.setTimeout(typeNextSegment, getTypeDelay(lineSegments[0]?.length ?? 0));

		return () => {
			if (typeof timer === 'number') {
				window.clearTimeout(timer);
			}
		};
	}, [displayMode, intro.greeting, phase, reducedMotion]);

	return (
		<div
			className={`home-intro home-intro--${phase}`}
			style={toneStyle}
			data-phase={phase}
		>
			<div className={['home-identity', isIdentityReady ? 'is-ready' : ''].filter(Boolean).join(' ')}>
				<span className="home-identity__avatar-shell" aria-hidden="true">
					<img
						className="home-identity__avatar"
						src={intro.profile.avatar.src}
						alt={intro.profile.alt}
						width="128"
						height="128"
						loading="eager"
						decoding="async"
					/>
					<span className="home-identity__spark home-identity__spark--1" aria-hidden="true" />
					<span className="home-identity__spark home-identity__spark--2" aria-hidden="true" />
					<span className="home-identity__spark home-identity__spark--3" aria-hidden="true" />
					<span className="home-identity__spark home-identity__spark--4" aria-hidden="true" />
				</span>
				<h1 className="home-identity__name" id="hero-title" aria-live="polite">
					{intro.profile.name}
				</h1>
			</div>
			<p
				className={`time-greeting time-greeting--${displayMode}${
					isSettled ? ' time-greeting--complete' : ''
				}`}
				aria-live="polite"
			>
				<span>{displayedText}</span>
				{shouldShowCursor && <span className="time-greeting__cursor" aria-hidden="true" />}
			</p>
		</div>
	);
}

function getGreetingDisplayMode(text: string): GreetingDisplayMode {
	const lineSegments = getLineSegments(text);
	const segmentCount = lineSegments.reduce((total, line) => total + line.length, 0);

	if (lineSegments.length > TYPEWRITER_MAX_LINES || segmentCount > TYPEWRITER_MAX_SEGMENTS) {
		return 'fade';
	}

	return 'type';
}

function getLineSegments(text: string) {
	return text.split('\n').map((line) => getTextSegments(line));
}

function getTextSegments(text: string) {
	if ('Segmenter' in Intl) {
		const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
		return Array.from(segmenter.segment(text), (part) => part.segment);
	}

	return Array.from(text);
}

function getTypeDelay(total: number) {
	if (total <= 0) {
		return LINE_BREAK_DELAY;
	}

	if (total <= 16) {
		return TYPE_DELAY + 4;
	}

	if (total <= TYPEWRITER_MAX_SEGMENTS) {
		return TYPE_DELAY;
	}

	return TYPE_DELAY - 4;
}
