import type { HomeProfileTone } from '../../config/pages/homeProfiles';
import { getWeightedGreeting } from '../../lib/homeGreeting';
import { getVisitProfile } from '../../lib/homeProfile';

type IntroPhase = 'summoning' | 'revealed' | 'speaking' | 'settled';
const MAX_TYPED_SEGMENTS = 96;
const MAX_TYPED_LINES = 4;
const LINE_BREAK_DELAY = 320;
const TONE_COLORS: Record<HomeProfileTone, readonly [accent: string, glow: string]> = {
	warm: ['rgba(222, 190, 124, 0.72)', 'rgba(222, 190, 124, 0.16)'],
	moon: ['rgb(var(--color-accent-rgb) / 0.76)', 'rgb(var(--color-accent-rgb) / 0.16)'],
	rose: ['rgba(214, 167, 200, 0.72)', 'rgba(214, 167, 200, 0.15)'],
	violet: ['rgba(185, 164, 226, 0.72)', 'rgba(185, 164, 226, 0.15)'],
	mist: ['rgba(177, 199, 206, 0.7)', 'rgba(177, 199, 206, 0.14)'],
};

export function startHomeIntro(intro: HTMLElement) {
	const title = intro.querySelector('h1');
	const avatar = intro.querySelector<HTMLImageElement>('.home-identity__avatar');
	const greeting = intro.querySelector('.time-greeting');
	const text = greeting?.querySelector('[data-greeting-text]');
	const announcement = greeting?.querySelector('[aria-live]');
	const cursor = greeting?.querySelector<HTMLElement>('.time-greeting__cursor');
	if (!title || !avatar || !greeting || !text || !announcement || !cursor) return;

	const profile = getVisitProfile();
	const [accent, glow] = TONE_COLORS[profile.tone ?? 'moon'];
	intro.style.setProperty('--home-intro-accent', accent);
	intro.style.setProperty('--home-intro-accent-soft', glow);
	title.textContent = profile.name;

	const message = getWeightedGreeting(new Date().getHours()).text;
	const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }) : null;
	const lines = message.split('\n').map(line => segmenter
		? Array.from(segmenter.segment(line), ({ segment }) => segment)
		: Array.from(line));
	const fade = lines.length > MAX_TYPED_LINES || lines.reduce((total, line) => total + line.length, 0) > MAX_TYPED_SEGMENTS;
	greeting.classList.toggle('time-greeting--fade', fade);
	greeting.classList.toggle('time-greeting--braille-art', /^[\u2800-\u28ff\n]+$/u.test(message));
	const motion = matchMedia('(prefers-reduced-motion: reduce)');
	let phase: IntroPhase = 'summoning';
	let timer: number | undefined;
	let revealTimeout: number | undefined;

	const setPhase = (next: IntroPhase) => {
		intro.classList.replace(`home-intro--${phase}`, `home-intro--${next}`);
		phase = next;
	};
	const announce = () => { if (announcement.textContent !== message) announcement.textContent = message; };
	const settle = () => {
		clearTimeout(timer);
		clearTimeout(revealTimeout);
		text.textContent = message;
		cursor.hidden = true;
		setPhase('settled');
		announce();
	};
	const typeGreeting = () => {
		const segments = lines.flatMap((line, index) => [
			...(index ? [{ text: '\n', delay: LINE_BREAK_DELAY }] : []),
			...line.map(text => ({ text, delay: line.length <= 16 ? 48 : 44 })),
		]);
		let index = 0;
		let visible = '';
		cursor.hidden = false;
		const tick = () => {
			const segment = segments[index++];
			if (!segment) return settle();
			visible += segment.text;
			text.textContent = visible;
			timer = window.setTimeout(tick, segment.delay);
		};
		timer = window.setTimeout(tick, segments[0]?.delay ?? LINE_BREAK_DELAY);
	};
	const reveal = () => {
		if (phase !== 'summoning') return;
		clearTimeout(revealTimeout);
		setPhase('revealed');
		timer = window.setTimeout(() => {
			setPhase('speaking');
			announce();
			if (fade) {
				text.textContent = message;
				timer = window.setTimeout(settle, 760);
			} else typeGreeting();
		}, 220);
	};
	avatar.addEventListener('error', () => { avatar.src = '/favicon-192x192.png'; }, { once: true });
	avatar.alt = profile.alt;
	avatar.src = profile.avatar.src;
	avatar.hidden = false;
	if (motion.matches) settle();
	else {
		revealTimeout = window.setTimeout(reveal, 1400);
		if (typeof avatar.decode === 'function') void avatar.decode().then(reveal, reveal);
		else if (avatar.complete) reveal();
		else avatar.addEventListener('load', reveal, { once: true });
	}
	motion.addEventListener('change', () => { if (motion.matches) settle(); });
}
