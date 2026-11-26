type CanvasScene = 'branches' | 'flame';

type Point = { x: number; y: number };

function seededRandom(seed: number) {
	let state = Math.ceil(seed * 2147483645);
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

function drawBranches(brush: CanvasRenderingContext2D, origin: Point, height: number, random: () => number) {
	function branch(x: number, y: number, angle: number, length: number, depth: number) {
		const endX = x + Math.cos(angle) * length;
		const endY = y + Math.sin(angle) * length;
		brush.beginPath();
		brush.moveTo(x, y);
		brush.quadraticCurveTo(x + (endX - x) * 0.58, y + (endY - y) * 0.78, endX, endY);
		brush.strokeStyle = depth % 3 === 0 ? '#bc839c' : '#8b9ba8';
		brush.globalAlpha = 0.14 + depth / 42;
		brush.lineWidth = Math.max(height / 920, depth * height / 1700);
		brush.stroke();
		if (depth === 0 || length < 1.5) return;
		branch(endX, endY, angle - 0.26 - random() * 0.34, length * (0.62 + random() * 0.13), depth - 1);
		branch(endX, endY, angle + 0.31 + random() * 0.36, length * (0.65 + random() * 0.12), depth - 1);
	}

	branch(origin.x + height * 0.17, origin.y + height * 0.37, -1.98, height * 0.34, 10);
	brush.globalAlpha = 1;
}

function drawFlame(brush: CanvasRenderingContext2D, origin: Point, random: () => number, seed: number) {
	const { width, height } = brush.canvas;
	const scale = Math.min(width * 0.40, height * 0.62);
	const radius = Math.ceil(scale * 1.34);
	const left = Math.max(0, Math.floor(origin.x - radius));
	const top = Math.max(0, Math.floor(origin.y - radius));
	const spanX = Math.min(width - left, radius * 2);
	const spanY = Math.min(height - top, radius * 2);
	const density = new Uint8Array(spanX * spanY);
	const pointCount = Math.min(2_800_000, Math.max(160_000, Math.round(spanX * spanY * 2.25)));
	const arms = Array.from({ length: 3 }, (_, index) => {
		const angle = index * (2 * Math.PI / 3) + seed;
		return { angle, shiftX: 0.45 * Math.cos(angle), shiftY: 0.42 * Math.sin(angle) };
	});
	let x = 0.21;
	let y = 0.27;
	for (let point = 0; point < pointCount; point++) {
		const arm = arms[Math.floor(random() * arms.length)];
		const phase = arm.angle + (x * x + y * y) * 2.1;
		const cosine = Math.cos(phase);
		const sine = Math.sin(phase);
		const nextX = 0.61 * (x * cosine - y * sine) + arm.shiftX;
		y = 0.61 * (x * sine + y * cosine) + arm.shiftY;
		x = nextX;
		const px = Math.round(origin.x + x * scale * 1.34 - left);
		const py = Math.round(origin.y + y * scale - top);
		if (point <= 20 || px < 0 || px >= spanX || py < 0 || py >= spanY) continue;
		const index = py * spanX + px;
		if (density[index] < 255) density[index]++;
	}

	const image = brush.createImageData(spanX, spanY);
	for (let pixel = 0; pixel < density.length; pixel++) {
		if (!density[pixel]) continue;
		const offset = pixel * 4;
		const mix = Math.max(0, Math.min(1, (pixel % spanX + left - origin.x) / scale + 0.5));
		image.data[offset] = 168 - mix * 77;
		image.data[offset + 1] = 112 + mix * 28;
		image.data[offset + 2] = 153 - mix * 5;
		image.data[offset + 3] = Math.min(116, Math.log1p(density[pixel]) * 29);
	}
	brush.putImageData(image, left, top);
}

export function paintCanvasScene(brush: CanvasRenderingContext2D, scene: CanvasScene, seed: number, centered: boolean) {
	const { width, height } = brush.canvas;
	const wide = width > height * 1.4;
	const origin = { x: width * (centered ? 0.5 : wide ? 0.77 : 0.66), y: height * (centered ? 0.52 : wide ? 0.47 : 0.28) };
	const random = seededRandom(seed);
	brush.clearRect(0, 0, width, height);
	if (scene === 'flame') drawFlame(brush, origin, random, seed);
	else drawBranches(brush, origin, height, random);

	if (!centered) {
		// Keep the center legible even when a branch crosses the identity area.
		const radius = Math.min(width, height) * 0.49;
		const shade = brush.createRadialGradient(width * 0.5, height * 0.52, radius * 0.17, width * 0.5, height * 0.52, radius);
		shade.addColorStop(0, 'rgba(0,0,0,.86)');
		shade.addColorStop(1, 'transparent');
		brush.globalCompositeOperation = 'destination-out';
		brush.fillStyle = shade;
		brush.fillRect(0, 0, width, height);
		brush.globalCompositeOperation = 'source-over';
	}
}
