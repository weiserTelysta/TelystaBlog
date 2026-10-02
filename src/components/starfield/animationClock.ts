/** Advance only on painted frames; a suspended canvas must not catch up on resume. */
export function createAnimationClock() {
	let time = 0;
	let previousFrame: number | undefined;
	return {
		get now() { return time; },
		resetFrame() { previousFrame = undefined; },
		tick(frameTime: number) {
			const delta = previousFrame === undefined ? 0 : Math.min(Math.max(frameTime - previousFrame, 0), 50);
			previousFrame = frameTime;
			time += delta;
			return { time, delta };
		},
	};
}
