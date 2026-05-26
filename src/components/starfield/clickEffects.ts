type Bounds = {
	width: number;
	height: number;
};

type ClickEffectsOptions = {
	bounds: Bounds;
	isSubtle: boolean;
	reducedMotion: boolean;
};

type ClickDustParticle = {
	x: number;
	y: number;
	previousX: number;
	previousY: number;
	originX: number;
	originY: number;
	vx: number;
	vy: number;
	baseVx: number;
	baseVy: number;
	radius: number;
	alpha: number;
	maxAlpha: number;
	color: string;
	createdAt: number;
	releasedAt: number;
	life: number;
	maxLife: number;
	phase: number;
	pressId: number;
	released: boolean;
	trail: number;
};

type ClickPressState = {
	active: boolean;
	pointerId: number;
	pressId: number;
	x: number;
	y: number;
	startedAt: number;
};

type RareClickMeteor = {
	active: boolean;
	x: number;
	y: number;
	vx: number;
	vy: number;
	length: number;
	alpha: number;
	life: number;
	maxLife: number;
	color: string;
};

type ClickSpark = {
	x: number;
	y: number;
	radius: number;
	alpha: number;
	life: number;
	maxLife: number;
	color: string;
};

const DUST_COLORS = ['112, 219, 255', '255, 143, 205', '190, 165, 255', '255, 218, 128'];
const RARE_COLORS = ['255, 235, 182', '161, 228, 255', '255, 167, 218'];
const CHARGE_LIMIT = 1100;
const ESCAPE_DECAY = 220;

export function createClickEffects({ bounds, isSubtle, reducedMotion }: ClickEffectsOptions) {
	const particles: ClickDustParticle[] = [];
	const sparks: ClickSpark[] = [];
	const rareMeteors: RareClickMeteor[] = [];
	const press: ClickPressState = {
		active: false,
		pointerId: -1,
		pressId: 0,
		x: 0,
		y: 0,
		startedAt: 0,
	};

	const particleLimit = isSubtle ? 90 : 150;
	const rareCooldown = isSubtle ? 2600 : 1800;
	let nextPressId = 1;
	let nextRareAt = 0;

	const handlePointerDown = (event: PointerEvent, time: number) => {
		if (!event.isPrimary || ('button' in event && event.button !== 0)) return;

		const point = getPoint(event, bounds);
		if (!point) return;

		press.active = true;
		press.pointerId = event.pointerId;
		press.pressId = nextPressId;
		press.x = point.x;
		press.y = point.y;
		press.startedAt = time;
		nextPressId += 1;

		if (reducedMotion) return;

		spawnSpark(point.x, point.y, time, 0.72);

		const count = Math.floor(randomBetween(isSubtle ? 8 : 12, isSubtle ? 14 : 20));
		trimParticles(count);

		for (let index = 0; index < count; index += 1) {
			const angle = (index / count) * Math.PI * 2 + randomBetween(-0.24, 0.24);
			const distance = randomBetween(2, isSubtle ? 8 : 12);
			const baseSpeed = randomBetween(0.08, 0.22);
			const x = point.x + Math.cos(angle) * distance;
			const y = point.y + Math.sin(angle) * distance;

			particles.push({
				x,
				y,
				previousX: x,
				previousY: y,
				originX: point.x,
				originY: point.y,
				vx: Math.cos(angle) * baseSpeed,
				vy: Math.sin(angle) * baseSpeed,
				baseVx: randomBetween(-0.045, 0.045),
				baseVy: randomBetween(-0.035, 0.055),
				radius: randomBetween(0.56, isSubtle ? 1.05 : 1.28),
				alpha: randomBetween(0.58, isSubtle ? 0.76 : 0.9),
				maxAlpha: randomBetween(0.62, isSubtle ? 0.78 : 0.96),
				color: pick(DUST_COLORS),
				createdAt: time,
				releasedAt: 0,
				life: 0,
				maxLife: randomBetween(isSubtle ? 760 : 880, isSubtle ? 1120 : 1480),
				phase: Math.random() * Math.PI * 2,
				pressId: press.pressId,
				released: false,
				trail: randomBetween(isSubtle ? 6 : 8, isSubtle ? 13 : 19),
			});
		}
	};

	const handlePointerUp = (event: PointerEvent, time: number) => {
		if (!press.active || event.pointerId !== press.pointerId) return;

		releasePress(time);
		maybeSpawnRare(pointFromPress(), time);
	};

	const handlePointerMove = (event: PointerEvent, time: number) => {
		if (!press.active || event.pointerId !== press.pointerId) return;

		const point = getPoint(event, bounds);
		if (!point) return;

		press.x = point.x;
		press.y = point.y;

		for (const particle of particles) {
			if (particle.pressId !== press.pressId || particle.released) continue;

			const follow = isSubtle ? 0.38 : 0.46;
			particle.originX += (point.x - particle.originX) * follow;
			particle.originY += (point.y - particle.originY) * follow;
		}
	};

	const handlePointerCancel = (time: number) => {
		if (!press.active) return;
		releasePress(time, 0.22);
	};

	const cancelPress = () => {
		if (!press.active) return;

		for (let index = particles.length - 1; index >= 0; index -= 1) {
			const particle = particles[index];

			if (particle.pressId === press.pressId && !particle.released) {
				particles.splice(index, 1);
			}
		}

		press.active = false;
		press.pointerId = -1;
	};

	const update = (time: number, delta: number) => {
		const step = delta / 16.67;

		for (const particle of particles) {
			particle.previousX = particle.x;
			particle.previousY = particle.y;
			particle.life = time - particle.createdAt;

			if (!particle.released) {
				const holdAge = time - particle.createdAt;
				const pulse = Math.sin(holdAge * 0.017 + particle.phase);
				const targetX = particle.originX + Math.cos(particle.phase + holdAge * 0.004) * (3.6 + pulse * 1.2);
				const targetY = particle.originY + Math.sin(particle.phase + holdAge * 0.004) * (3.6 + pulse * 1.2);

				particle.x += (targetX - particle.x) * 0.08 * step;
				particle.y += (targetY - particle.y) * 0.08 * step;
				particle.alpha = particle.maxAlpha * (0.78 + Math.sin(holdAge * 0.013 + particle.phase) * 0.14);
				continue;
			}

			const releaseAge = time - particle.releasedAt;
			const escapeWeight = Math.exp(-releaseAge / ESCAPE_DECAY);
			const driftWeight = 1 - escapeWeight;

			particle.vx = particle.vx * (0.94 ** step) + particle.baseVx * driftWeight * 0.08;
			particle.vy = particle.vy * (0.94 ** step) + particle.baseVy * driftWeight * 0.08;
			particle.x += particle.vx * step;
			particle.y += particle.vy * step;

			const ageProgress = clamp(releaseAge / particle.maxLife, 0, 1);
			const fade = Math.exp(-ageProgress * 3.9) * (1 - easeOutCubic(ageProgress) * 0.24);
			particle.alpha = particle.maxAlpha * fade * (0.44 + escapeWeight * 0.56);
		}

		for (const spark of sparks) {
			spark.life += delta;
		}

		for (const meteor of rareMeteors) {
			if (!meteor.active) continue;

			meteor.life += delta;
			meteor.x += meteor.vx * step;
			meteor.y += meteor.vy * step;

			if (meteor.life >= meteor.maxLife) {
				meteor.active = false;
			}
		}

		removeDeadEffects(time);
	};

	const draw = (context: CanvasRenderingContext2D) => {
		for (const meteor of rareMeteors) {
			if (!meteor.active) continue;

			const progress = meteor.life / meteor.maxLife;
			const alpha = Math.sin(progress * Math.PI) * meteor.alpha;
			const speed = Math.hypot(meteor.vx, meteor.vy) || 1;
			const tailX = meteor.x - (meteor.vx / speed) * meteor.length;
			const tailY = meteor.y - (meteor.vy / speed) * meteor.length;
			const gradient = context.createLinearGradient(tailX, tailY, meteor.x, meteor.y);

			gradient.addColorStop(0, `rgba(${meteor.color}, 0)`);
			gradient.addColorStop(0.72, `rgba(${meteor.color}, ${alpha * 0.26})`);
			gradient.addColorStop(1, `rgba(${meteor.color}, ${alpha})`);
			context.strokeStyle = gradient;
			context.lineWidth = 1;
			context.lineCap = 'round';
			context.beginPath();
			context.moveTo(tailX, tailY);
			context.lineTo(meteor.x, meteor.y);
			context.stroke();
		}

		for (const particle of particles) {
			if (particle.alpha <= 0.01) continue;

			const dx = particle.x - particle.previousX;
			const dy = particle.y - particle.previousY;
			const speed = Math.hypot(dx, dy);
			const trailAlpha = particle.alpha * Math.min(0.44, speed * 0.08);

			if (particle.released && speed > 0.12 && trailAlpha > 0.025) {
				const unitX = dx / speed;
				const unitY = dy / speed;
				const tailLength = particle.trail * clamp(speed, 0.45, 1.9);
				const tailX = particle.x - unitX * tailLength;
				const tailY = particle.y - unitY * tailLength;
				const gradient = context.createLinearGradient(tailX, tailY, particle.x, particle.y);
				gradient.addColorStop(0, `rgba(${particle.color}, 0)`);
				gradient.addColorStop(1, `rgba(${particle.color}, ${trailAlpha})`);
				context.strokeStyle = gradient;
				context.lineWidth = Math.max(0.45, particle.radius * 0.62);
				context.lineCap = 'round';
				context.beginPath();
				context.moveTo(tailX, tailY);
				context.lineTo(particle.x, particle.y);
				context.stroke();
			}

			context.beginPath();
			context.fillStyle = `rgba(${particle.color}, ${particle.alpha})`;
			context.shadowBlur = particle.released ? 5 : 8;
			context.shadowColor = `rgba(${particle.color}, ${particle.alpha * 0.58})`;
			context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
			context.fill();
			context.shadowBlur = 0;
		}

		for (const spark of sparks) {
			const progress = clamp(spark.life / spark.maxLife, 0, 1);
			const alpha = spark.alpha * (1 - easeOutCubic(progress));
			if (alpha <= 0.01) continue;

			const radius = spark.radius * (0.56 + progress * 1.6);
			const gradient = context.createRadialGradient(spark.x, spark.y, 0, spark.x, spark.y, radius);
			gradient.addColorStop(0, `rgba(${spark.color}, ${alpha})`);
			gradient.addColorStop(0.42, `rgba(${spark.color}, ${alpha * 0.28})`);
			gradient.addColorStop(1, `rgba(${spark.color}, 0)`);
			context.fillStyle = gradient;
			context.beginPath();
			context.arc(spark.x, spark.y, radius, 0, Math.PI * 2);
			context.fill();
		}
	};

	const reset = () => {
		particles.length = 0;
		sparks.length = 0;
		rareMeteors.length = 0;
		press.active = false;
	};

	const pointFromPress = () => ({ x: press.x, y: press.y });

	const releasePress = (time: number, forcedCharge?: number) => {
		const charge = forcedCharge ?? clamp((time - press.startedAt) / CHARGE_LIMIT, 0, 1);

		for (const particle of particles) {
			if (particle.pressId !== press.pressId || particle.released) continue;

			const angle = Math.atan2(particle.y - press.y, particle.x - press.x) + randomBetween(-0.34, 0.34);
			const baseSpeed = randomBetween(isSubtle ? 1.05 : 1.3, isSubtle ? 2.15 : 2.7);
			const chargedSpeed = charge * randomBetween(isSubtle ? 2.5 : 3.5, isSubtle ? 4.6 : 6.1);
			const speed = baseSpeed + chargedSpeed;

			particle.released = true;
			particle.releasedAt = time;
			particle.vx = Math.cos(angle) * speed + randomBetween(-0.28, 0.28);
			particle.vy = Math.sin(angle) * speed + randomBetween(-0.28, 0.28);
			particle.maxAlpha *= 1 + charge * 0.16;
			particle.trail *= 1 + charge * 0.35;
		}

		press.active = false;
		press.pointerId = -1;
	};

	const maybeSpawnRare = (point: { x: number; y: number }, time: number) => {
		if (reducedMotion || time < nextRareAt) return;

		const chance = isSubtle ? 0.03 : 0.06;
		if (Math.random() > chance) return;

		nextRareAt = time + rareCooldown + randomBetween(0, 1400);

		if (Math.random() < 0.58) {
			spawnRareMeteor(point.x, point.y);
		} else {
			spawnSpark(point.x + randomBetween(-16, 16), point.y + randomBetween(-16, 16), time, isSubtle ? 0.62 : 0.86, true);
		}
	};

	const spawnSpark = (x: number, y: number, time: number, alpha: number, rare = false) => {
		sparks.push({
			x,
			y,
			radius: randomBetween(rare ? 14 : 8, rare ? 24 : 15),
			alpha,
			life: 0,
			maxLife: randomBetween(rare ? 280 : 140, rare ? 420 : 220),
			color: rare ? pick(RARE_COLORS) : pick(DUST_COLORS),
		});
	};

	const spawnRareMeteor = (x: number, y: number) => {
		const angle = randomBetween(-Math.PI * 0.92, Math.PI * 0.08);
		const speed = randomBetween(isSubtle ? 4.6 : 5.5, isSubtle ? 7.2 : 8.8);

		rareMeteors.push({
			active: true,
			x: clamp(x + randomBetween(-22, 22), 0, bounds.width),
			y: clamp(y + randomBetween(-22, 22), 0, bounds.height),
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			length: randomBetween(isSubtle ? 42 : 56, isSubtle ? 76 : 104),
			alpha: randomBetween(isSubtle ? 0.26 : 0.34, isSubtle ? 0.42 : 0.54),
			life: 0,
			maxLife: randomBetween(isSubtle ? 420 : 520, isSubtle ? 680 : 860),
			color: pick(RARE_COLORS),
		});
	};

	const trimParticles = (incomingCount: number) => {
		const overflow = particles.length + incomingCount - particleLimit;
		if (overflow <= 0) return;

		particles.sort((a, b) => {
			const alphaDelta = a.alpha - b.alpha;
			if (Math.abs(alphaDelta) > 0.08) return alphaDelta;
			return b.life - a.life;
		});
		particles.splice(0, overflow);
	};

	const removeDeadEffects = (time: number) => {
		for (let index = particles.length - 1; index >= 0; index -= 1) {
			const particle = particles[index];
			const releaseAge = particle.released ? time - particle.releasedAt : 0;

			if (particle.released && (particle.alpha < 0.012 || releaseAge > particle.maxLife + 360)) {
				particles.splice(index, 1);
			}
		}

		for (let index = sparks.length - 1; index >= 0; index -= 1) {
			if (sparks[index].life > sparks[index].maxLife) {
				sparks.splice(index, 1);
			}
		}

		for (let index = rareMeteors.length - 1; index >= 0; index -= 1) {
			if (!rareMeteors[index].active) {
				rareMeteors.splice(index, 1);
			}
		}
	};

	return {
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
		handlePointerCancel,
		cancelPress,
		update,
		draw,
		reset,
	};
}

function getPoint(event: PointerEvent, bounds: Bounds) {
	if (bounds.width <= 0 || bounds.height <= 0) return null;

	return {
		x: clamp(event.clientX, 0, bounds.width),
		y: clamp(event.clientY, 0, bounds.height),
	};
}

function easeOutCubic(value: number) {
	const clamped = clamp(value, 0, 1);
	return 1 - (1 - clamped) ** 3;
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number) {
	return min + Math.random() * (max - min);
}

function pick(colors: string[]) {
	return colors[Math.floor(Math.random() * colors.length)];
}
