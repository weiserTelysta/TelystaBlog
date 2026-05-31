import { useEffect, useRef } from 'react';
import { createClickEffects } from './clickEffects';
import { createHeartPoints, type HeartConstellation } from './heartConstellation';
import { LONG_METEOR_COLORS, SPECIAL_COLOR_RATE } from './starfieldConfig';
import {
	getBreathBrightness,
	getCycleGlow,
	pickColor,
	pickLongMeteorColor,
	randomBetween,
	smoothPulse,
	wrap,
} from './starfieldMath';
import './StarfieldBackground.scss';

type StarfieldBackgroundProps = {
	variant?: 'immersive' | 'subtle';
};

type Star = {
	x: number;
	y: number;
	depth: number;
	radius: number;
	alpha: number;
	twinkle: number;
	twinkleSpeed: number;
	breathPhase: number;
	breathSpeed: number;
	orbitPhase: number;
	orbitSpeed: number;
	orbitRadiusX: number;
	orbitRadiusY: number;
	driftX: number;
	driftY: number;
	color: string;
	special: boolean;
	blinkStartedAt: number;
	blinkDuration: number;
	blinkStrength: number;
	nextBlinkAt: number;
};

type Meteor = {
	active: boolean;
	x: number;
	y: number;
	length: number;
	speed: number;
	alpha: number;
	life: number;
	maxLife: number;
	nextAt: number;
};

type LongMeteor = {
	active: boolean;
	x: number;
	y: number;
	vx: number;
	vy: number;
	length: number;
	alpha: number;
	life: number;
	maxLife: number;
	nextAt: number;
	color: string;
	lineWidth: number;
	glow: number;
};

export default function StarfieldBackground({ variant = 'immersive' }: StarfieldBackgroundProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const context = canvas.getContext('2d', { alpha: true });
		if (!context) return;

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const isSubtle = variant === 'subtle';
		const pointer = { x: 0, y: 0, easedX: 0, easedY: 0 };
		const bounds = { width: 0, height: 0, dpr: 1 };
		const stars: Star[] = [];
		const clickEffects = createClickEffects({ bounds, isSubtle, reducedMotion });
		const meteor: Meteor = {
			active: false,
			x: 0,
			y: 0,
			length: 0,
			speed: 0,
			alpha: 0,
			life: 0,
			maxLife: 0,
			nextAt: performance.now() + randomBetween(12000, 26000),
		};
		const longMeteor: LongMeteor = {
			active: false,
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			length: 0,
			alpha: 0,
			life: 0,
			maxLife: 0,
			nextAt: performance.now() + randomBetween(36000, 76000),
			color: LONG_METEOR_COLORS[0],
			lineWidth: 1,
			glow: 0,
		};
		const heart: HeartConstellation = {
			active: false,
			startedAt: 0,
			duration: 7600,
			nextCheckAt: performance.now() + 30000,
			points: [],
		};

		let animationFrame = 0;
		let running = true;
		let lastTime = performance.now();
		const pointerIntent: {
			phase: 'idle' | 'pending' | 'dust-active' | 'text-selecting';
			pointerId: number;
			startX: number;
			startY: number;
			startedAt: number;
			startedOnSelectableText: boolean;
			dustTimer: number;
			selectionFallbackTimer: number;
		} = {
			phase: 'idle',
			pointerId: -1,
			startX: 0,
			startY: 0,
			startedAt: 0,
			startedOnSelectableText: false,
			dustTimer: 0,
			selectionFallbackTimer: 0,
		};

		const createStar = (): Star => {
			const depth = Math.random();
			const near = depth > 0.84;
			const mid = depth > 0.46 && depth <= 0.84;
			const special = Math.random() < SPECIAL_COLOR_RATE;
			const driftBoost = isSubtle ? 1.08 : 1.28;
			const orbitScale = (isSubtle ? 0.62 : 1) * (0.38 + depth);
			const blinkable = special || near || Math.random() < 0.16;

			return {
				x: Math.random() * bounds.width,
				y: Math.random() * bounds.height,
				depth,
				radius: near ? randomBetween(0.82, 1.25) : mid ? randomBetween(0.48, 0.88) : randomBetween(0.24, 0.58),
				alpha: near ? randomBetween(0.22, 0.46) : mid ? randomBetween(0.14, 0.32) : randomBetween(0.05, 0.16),
				twinkle: Math.random() * Math.PI * 2,
				twinkleSpeed: randomBetween(0.00016, 0.00046),
				breathPhase: Math.random() * Math.PI * 2,
				breathSpeed: randomBetween(0.000035, 0.000095),
				orbitPhase: Math.random() * Math.PI * 2,
				orbitSpeed: randomBetween(0.000032, 0.000088) * (0.72 + depth),
				orbitRadiusX: randomBetween(0.3, near ? 2.8 : mid ? 1.8 : 1.1) * orbitScale,
				orbitRadiusY: randomBetween(0.2, near ? 1.8 : mid ? 1.2 : 0.75) * orbitScale,
				driftX: randomBetween(-0.0026, 0.0026) * (0.36 + depth) * driftBoost,
				driftY: randomBetween(-0.0013, 0.0032) * (0.36 + depth) * driftBoost,
				color: pickColor(special),
				special,
				blinkStartedAt: 0,
				blinkDuration: 0,
				blinkStrength: 0,
				nextBlinkAt: blinkable ? performance.now() + randomBetween(6000, 22000) : Number.POSITIVE_INFINITY,
			};
		};

		const createStarField = () => {
			stars.length = 0;
			const area = bounds.width * bounds.height;
			const density = isSubtle ? 0.000055 : 0.00009;
			const cap = isSubtle ? 130 : 235;
			const count = Math.min(cap, Math.max(74, Math.floor(area * density)));

			for (let index = 0; index < count; index += 1) {
				stars.push(createStar());
			}
		};

		const setupCanvas = () => {
			bounds.width = window.innerWidth;
			bounds.height = window.innerHeight;
			bounds.dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.floor(bounds.width * bounds.dpr);
			canvas.height = Math.floor(bounds.height * bounds.dpr);
			canvas.style.width = `${bounds.width}px`;
			canvas.style.height = `${bounds.height}px`;
			context.setTransform(bounds.dpr, 0, 0, bounds.dpr, 0, 0);
			createStarField();
		};

		const drawBackground = () => {
			context.clearRect(0, 0, bounds.width, bounds.height);
			const vignette = context.createRadialGradient(
				bounds.width * 0.5,
				bounds.height * 0.45,
				0,
				bounds.width * 0.5,
				bounds.height * 0.5,
				Math.max(bounds.width, bounds.height) * 0.72,
			);

			vignette.addColorStop(0, 'rgba(10, 15, 24, 0.12)');
			vignette.addColorStop(0.72, 'rgba(7, 10, 16, 0.04)');
			vignette.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
			context.fillStyle = vignette;
			context.fillRect(0, 0, bounds.width, bounds.height);
		};

		const drawStars = (time: number, cycleGlow: number, breathBrightness: number) => {
			const parallax = isSubtle ? 7 : 13;
			const brightness = (isSubtle ? 0.68 : 1) * breathBrightness * (1 + cycleGlow * 0.12);

			if (!reducedMotion) {
				pointer.easedX += (pointer.x - pointer.easedX) * 0.035;
				pointer.easedY += (pointer.y - pointer.easedY) * 0.035;
			}

			for (const star of stars) {
				const shiftX = reducedMotion ? 0 : pointer.easedX * star.depth * parallax;
				const shiftY = reducedMotion ? 0 : pointer.easedY * star.depth * parallax;
				const driftTime = reducedMotion ? 0 : time;
				const orbit = getOrbitOffset(star, time, reducedMotion);
				const x = wrap(star.x + star.driftX * driftTime + shiftX + orbit.x, bounds.width);
				const y = wrap(star.y + star.driftY * driftTime + shiftY + orbit.y, bounds.height);
				const twinkle = reducedMotion ? 0 : Math.sin(time * star.twinkleSpeed + star.twinkle) * 0.075;
				const breath = reducedMotion ? 0 : Math.sin(time * star.breathSpeed + star.breathPhase) * 0.105;
				const blinkGlow = getBlinkGlow(star, time, isSubtle, reducedMotion);
				const cycleLift = 1 + cycleGlow * (star.special ? 0.2 : star.depth > 0.84 ? 0.12 : 0.04);
				const alpha = Math.max(0, star.alpha + twinkle + breath + blinkGlow) * brightness * cycleLift;

				context.beginPath();
				context.fillStyle = `rgba(${star.color}, ${alpha})`;
				context.shadowBlur = star.depth > 0.84 ? 4 + cycleGlow * (star.special ? 2.4 : 1.4) + blinkGlow * 8 : 0;
				context.shadowColor = `rgba(${star.color}, ${alpha * 0.52})`;
				context.arc(x, y, star.radius, 0, Math.PI * 2);
				context.fill();
				context.shadowBlur = 0;
			}
		};

		const updateMeteor = (time: number, delta: number, cycleGlow: number) => {
			if (reducedMotion || isSubtle) return;

			if (!meteor.active && time > meteor.nextAt && bounds.width > 0 && bounds.height > 0) {
				meteor.active = true;
				meteor.x = randomBetween(bounds.width * 0.12, bounds.width * 0.82);
				meteor.y = randomBetween(bounds.height * 0.08, bounds.height * 0.42);
				meteor.length = randomBetween(72, 132);
				meteor.speed = randomBetween(0.86, 1.28) * (1 + cycleGlow * 0.18);
				meteor.alpha = randomBetween(0.2, 0.36) * (1 + cycleGlow * 0.12);
				meteor.life = 0;
				meteor.maxLife = randomBetween(720, 980);
			}

			if (!meteor.active) return;

			meteor.life += delta;
			meteor.x += meteor.speed * (delta / 16.67);
			meteor.y += meteor.speed * 0.36 * (delta / 16.67);

			if (meteor.life >= meteor.maxLife) {
				meteor.active = false;
				meteor.nextAt = time + randomBetween(18000, 42000) * (1 - cycleGlow * 0.46);
			}
		};

		const drawMeteor = () => {
			if (!meteor.active) return;

			const progress = meteor.life / meteor.maxLife;
			const fade = Math.sin(progress * Math.PI) * meteor.alpha;
			const tailX = meteor.x - meteor.length;
			const tailY = meteor.y - meteor.length * 0.36;
			const gradient = context.createLinearGradient(tailX, tailY, meteor.x, meteor.y);

			gradient.addColorStop(0, 'rgba(156, 199, 232, 0)');
			gradient.addColorStop(0.72, `rgba(156, 199, 232, ${fade * 0.32})`);
			gradient.addColorStop(1, `rgba(232, 240, 248, ${fade})`);
			context.strokeStyle = gradient;
			context.lineWidth = 1;
			context.lineCap = 'round';
			context.beginPath();
			context.moveTo(tailX, tailY);
			context.lineTo(meteor.x, meteor.y);
			context.stroke();
		};

		const spawnLongMeteor = (time: number, cycleGlow: number) => {
			const fromLeft = Math.random() < 0.64;
			const speed = randomBetween(4.2, 6.6) * (1 + cycleGlow * 0.22);
			const angle = fromLeft ? randomBetween(0.24, 0.48) : randomBetween(Math.PI - 0.48, Math.PI - 0.24);

			longMeteor.active = true;
			longMeteor.x = fromLeft ? randomBetween(-bounds.width * 0.18, bounds.width * 0.2) : randomBetween(bounds.width * 0.8, bounds.width * 1.18);
			longMeteor.y = randomBetween(bounds.height * 0.04, bounds.height * 0.34);
			longMeteor.vx = Math.cos(angle) * speed;
			longMeteor.vy = Math.sin(angle) * speed;
			longMeteor.length = randomBetween(260, 420) * (1 + cycleGlow * 0.14);
			longMeteor.alpha = randomBetween(0.26, 0.42) * (1 + cycleGlow * 0.12);
			longMeteor.life = 0;
			longMeteor.maxLife = randomBetween(760, 1120);
			longMeteor.nextAt = time;
			longMeteor.color = pickLongMeteorColor();
			longMeteor.lineWidth = randomBetween(1.1, 1.65);
			longMeteor.glow = randomBetween(10, 18);
		};

		const updateLongMeteor = (time: number, delta: number, cycleGlow: number) => {
			if (reducedMotion || isSubtle || bounds.width <= 0 || bounds.height <= 0) return;

			if (!longMeteor.active && time > longMeteor.nextAt) {
				const chance = 0.1 + cycleGlow * 0.42;

				if (Math.random() < chance) {
					spawnLongMeteor(time, cycleGlow);
				} else {
					longMeteor.nextAt = time + randomBetween(14000, 26000) * (1 - cycleGlow * 0.42);
				}
			}

			if (!longMeteor.active) return;

			longMeteor.life += delta;
			longMeteor.x += longMeteor.vx * (delta / 16.67);
			longMeteor.y += longMeteor.vy * (delta / 16.67);

			const outside =
				longMeteor.x < -longMeteor.length ||
				longMeteor.x > bounds.width + longMeteor.length ||
				longMeteor.y < -longMeteor.length ||
				longMeteor.y > bounds.height + longMeteor.length;

			if (longMeteor.life >= longMeteor.maxLife || outside) {
				longMeteor.active = false;
				longMeteor.nextAt = time + randomBetween(42000, 90000) * (1 - cycleGlow * 0.5);
			}
		};

		const drawLongMeteor = () => {
			if (!longMeteor.active) return;

			const progress = longMeteor.life / longMeteor.maxLife;
			const fade = smoothPulse(progress) * longMeteor.alpha;
			const magnitude = Math.hypot(longMeteor.vx, longMeteor.vy) || 1;
			const tailX = longMeteor.x - (longMeteor.vx / magnitude) * longMeteor.length;
			const tailY = longMeteor.y - (longMeteor.vy / magnitude) * longMeteor.length;
			const gradient = context.createLinearGradient(tailX, tailY, longMeteor.x, longMeteor.y);

			gradient.addColorStop(0, `rgba(${longMeteor.color}, 0)`);
			gradient.addColorStop(0.52, `rgba(${longMeteor.color}, ${fade * 0.18})`);
			gradient.addColorStop(0.86, `rgba(${longMeteor.color}, ${fade * 0.48})`);
			gradient.addColorStop(1, `rgba(244, 249, 255, ${fade})`);
			context.strokeStyle = gradient;
			context.lineWidth = longMeteor.lineWidth;
			context.lineCap = 'round';
			context.shadowBlur = longMeteor.glow * fade;
			context.shadowColor = `rgba(${longMeteor.color}, ${fade * 0.55})`;
			context.beginPath();
			context.moveTo(tailX, tailY);
			context.lineTo(longMeteor.x, longMeteor.y);
			context.stroke();

			context.beginPath();
			context.fillStyle = `rgba(248, 251, 255, ${fade * 0.82})`;
			context.arc(longMeteor.x, longMeteor.y, longMeteor.lineWidth * 1.35, 0, Math.PI * 2);
			context.fill();
			context.shadowBlur = 0;
		};

		const updateHeart = (time: number) => {
			if (reducedMotion || isSubtle) return;

			if (!heart.active && time > heart.nextCheckAt) {
				if (Math.random() < 0.24) {
					heart.active = true;
					heart.startedAt = time;
					heart.points = createHeartPoints(bounds.width, bounds.height);
				}

				heart.nextCheckAt = time + randomBetween(28000, 36000);
			}

			if (heart.active && time - heart.startedAt > heart.duration) {
				heart.active = false;
				heart.points = [];
			}
		};

		const drawHeart = (time: number) => {
			if (!heart.active) return;

			const elapsed = time - heart.startedAt;
			const progress = elapsed / heart.duration;
			const reveal = smoothPulse(progress);

			for (const point of heart.points) {
				const shimmer = Math.sin(time * 0.0012 + point.phase) * 0.08;
				const lifeLift = Math.sin(progress * Math.PI) * 0.06;
				const alpha = Math.max(0, reveal * (0.22 + lifeLift + shimmer));

				context.beginPath();
				context.fillStyle = `rgba(214, 167, 200, ${alpha})`;
				context.shadowBlur = 6;
				context.shadowColor = `rgba(214, 167, 200, ${alpha * 0.42})`;
				context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
				context.fill();
				context.shadowBlur = 0;
			}
		};

		const animate = (time: number) => {
			if (!running) return;

			const delta = Math.min(time - lastTime, 50);
			lastTime = time;
			const cycleGlow = reducedMotion ? 0 : getCycleGlow(time);
			const breathBrightness = reducedMotion ? 1 : getBreathBrightness(time);

			drawBackground();
			drawStars(time, cycleGlow, breathBrightness);
			updateMeteor(time, delta, cycleGlow);
			updateLongMeteor(time, delta, cycleGlow);
			updateHeart(time);
			drawMeteor();
			drawLongMeteor();
			drawHeart(time);
			clickEffects.update(time, delta);
			clickEffects.draw(context);

			if (!reducedMotion) {
				animationFrame = window.requestAnimationFrame(animate);
			}
		};

		const handlePointerMove = (event: PointerEvent) => {
			pointer.x = (event.clientX / bounds.width - 0.5) * -1;
			pointer.y = (event.clientY / bounds.height - 0.5) * -1;

			if (event.pointerId !== pointerIntent.pointerId) return;

			if (pointerIntent.phase === 'pending') {
				const distance = Math.hypot(event.clientX - pointerIntent.startX, event.clientY - pointerIntent.startY);

				if (pointerIntent.startedOnSelectableText && distance > 11) {
					pointerIntent.phase = 'text-selecting';
					window.clearTimeout(pointerIntent.dustTimer);
					clickEffects.cancelPress();
				}

				return;
			}

			if (pointerIntent.phase === 'dust-active') {
				clickEffects.handlePointerMove(event, performance.now());
			}
		};

		const handlePointerDown = (event: PointerEvent) => {
			if (reducedMotion || !event.isPrimary || ('button' in event && event.button !== 0)) return;

			cancelPointerIntent();
			pointerIntent.phase = 'pending';
			pointerIntent.pointerId = event.pointerId;
			pointerIntent.startX = event.clientX;
			pointerIntent.startY = event.clientY;
			pointerIntent.startedAt = performance.now();
			pointerIntent.startedOnSelectableText = isSelectableTextTarget(event.target);
			pointerIntent.dustTimer = window.setTimeout(
				() => startDustInteraction(event),
				pointerIntent.startedOnSelectableText ? 180 : 45,
			);
		};

		const handlePointerUp = (event: PointerEvent) => {
			if (event.pointerId !== pointerIntent.pointerId) return;

			if (pointerIntent.phase === 'dust-active') {
				clickEffects.handlePointerUp(event, performance.now());
				resetPointerIntent();
				return;
			}

			if (pointerIntent.phase === 'pending') {
				window.clearTimeout(pointerIntent.dustTimer);

				if (!pointerIntent.startedOnSelectableText) {
					startDustInteraction(event);
					clickEffects.handlePointerUp(event, performance.now());
				}

				resetPointerIntent();
				return;
			}

			if (pointerIntent.phase === 'text-selecting') {
				resetPointerIntent();
			}
		};

		const handlePointerCancel = () => {
			cancelPointerIntent();
		};

		const startDustInteraction = (event: PointerEvent) => {
			if (pointerIntent.phase !== 'pending' || event.pointerId !== pointerIntent.pointerId) return;

			pointerIntent.phase = 'dust-active';
			clickEffects.handlePointerDown(event, performance.now());
			enableSelectionGuard();
		};

		const clearIntentTimers = () => {
			window.clearTimeout(pointerIntent.dustTimer);
			window.clearTimeout(pointerIntent.selectionFallbackTimer);
			pointerIntent.dustTimer = 0;
			pointerIntent.selectionFallbackTimer = 0;
		};

		const enableSelectionGuard = () => {
			document.documentElement.classList.add('is-starfield-interacting');
			window.clearTimeout(pointerIntent.selectionFallbackTimer);
			pointerIntent.selectionFallbackTimer = window.setTimeout(() => {
				document.documentElement.classList.remove('is-starfield-interacting');
				pointerIntent.selectionFallbackTimer = 0;
			}, 2000);
		};

		const resetPointerIntent = () => {
			clearIntentTimers();
			document.documentElement.classList.remove('is-starfield-interacting');
			pointerIntent.phase = 'idle';
			pointerIntent.pointerId = -1;
			pointerIntent.startX = 0;
			pointerIntent.startY = 0;
			pointerIntent.startedAt = 0;
			pointerIntent.startedOnSelectableText = false;
		};

		const cancelPointerIntent = () => {
			if (pointerIntent.phase === 'dust-active') {
				clickEffects.handlePointerCancel(performance.now());
			} else {
				clickEffects.cancelPress();
			}

			resetPointerIntent();
		};

		const handleResize = () => {
			setupCanvas();
			clickEffects.reset();
		};

		const handleVisibility = () => {
			running = document.visibilityState === 'visible';

			if (running) {
				lastTime = performance.now();
				window.cancelAnimationFrame(animationFrame);
				animationFrame = window.requestAnimationFrame(animate);
			} else {
				window.cancelAnimationFrame(animationFrame);
				cancelPointerIntent();
			}
		};

		setupCanvas();
		animationFrame = window.requestAnimationFrame(animate);

		window.addEventListener('pointermove', handlePointerMove, { passive: true });
		window.addEventListener('pointerdown', handlePointerDown, { passive: true });
		window.addEventListener('pointerup', handlePointerUp, { passive: true });
		window.addEventListener('pointercancel', handlePointerCancel, { passive: true });
		window.addEventListener('blur', handlePointerCancel);
		window.addEventListener('resize', handleResize);
		document.addEventListener('visibilitychange', handleVisibility);

		return () => {
			running = false;
			window.cancelAnimationFrame(animationFrame);
			cancelPointerIntent();
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerdown', handlePointerDown);
			window.removeEventListener('pointerup', handlePointerUp);
			window.removeEventListener('pointercancel', handlePointerCancel);
			window.removeEventListener('blur', handlePointerCancel);
			window.removeEventListener('resize', handleResize);
			document.removeEventListener('visibilitychange', handleVisibility);
		};
	}, [variant]);

	return (
		<div className="starfield" aria-hidden="true">
			<canvas ref={canvasRef} className="starfield__canvas" />
		</div>
	);
}

function getOrbitOffset(star: Star, time: number, reducedMotion: boolean) {
	if (reducedMotion) return { x: 0, y: 0 };

	const phase = time * star.orbitSpeed + star.orbitPhase;

	return {
		x: Math.sin(phase) * star.orbitRadiusX,
		y: Math.cos(phase * 0.86) * star.orbitRadiusY,
	};
}

function scheduleNextBlink(star: Star, time: number, isSubtle: boolean) {
	star.blinkStartedAt = time;
	star.blinkDuration = randomBetween(420, isSubtle ? 820 : 1100);
	star.blinkStrength = randomBetween(0.055, isSubtle ? 0.13 : 0.22) * (star.special ? 1.18 : 1);
	star.nextBlinkAt = time + randomBetween(isSubtle ? 16000 : 6000, isSubtle ? 34000 : 22000);
}

function getBlinkGlow(star: Star, time: number, isSubtle: boolean, reducedMotion: boolean) {
	if (reducedMotion || star.nextBlinkAt === Number.POSITIVE_INFINITY) return 0;

	if (star.blinkStartedAt === 0 && time >= star.nextBlinkAt) {
		scheduleNextBlink(star, time, isSubtle);
	}

	if (star.blinkStartedAt === 0) return 0;

	const progress = (time - star.blinkStartedAt) / star.blinkDuration;

	if (progress >= 1) {
		star.blinkStartedAt = 0;
		star.blinkDuration = 0;
		star.blinkStrength = 0;
		return 0;
	}

	return smoothPulse(progress) * star.blinkStrength;
}

function isSelectableTextTarget(target: EventTarget | null) {
	if (!(target instanceof Element)) return false;

	return Boolean(
		target.closest(
			[
				'p',
				'span',
				'strong',
				'em',
				'h1',
				'h2',
				'h3',
				'h4',
				'h5',
				'h6',
				'li',
				'blockquote',
				'code',
				'pre',
				'a',
				'button',
				'input',
				'textarea',
				'select',
				'[contenteditable="true"]',
			].join(', '),
		),
	);
}
