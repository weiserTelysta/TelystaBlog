// One deliberate wheel gesture, one slide. Trackpad inertia must settle before rearming.
export function createGalleryWheel() {
	let last = -Infinity;
	let total = 0;
	let consumed = false;
	return (delta: number, mode: number, now: number): number => {
		if (now - last > 220) { total = 0; consumed = false; }
		last = now;
		if (consumed) return 0;
		const pixels = delta * (mode === 1 ? 18 : mode === 2 ? 600 : 1);
		if (Math.sign(pixels) !== Math.sign(total)) total = 0;
		total += pixels;
		if (Math.abs(total) < 50) return 0;
		consumed = true;
		return Math.sign(total);
	};
}
