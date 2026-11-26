import { createAnimationClock } from '../starfield/animationClock';
import { paintCanvasScene } from './fractalCanvas';
import type { FractalSelection } from './fractalScenes';
import { FRAGMENT_SHADER } from './fractalShader';

const VERTEX_SHADER = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

type ShaderRenderer = {
	draw: (seconds: number) => void;
	dispose: () => void;
};

function createShaderRenderer(canvas: HTMLCanvasElement, selection: FractalSelection, centered: boolean): ShaderRenderer | null {
	const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false });
	if (!gl) return null;
	const program = gl.createProgram();
	const vertices = gl.createBuffer();
	const vertex = gl.createShader(gl.VERTEX_SHADER);
	const fragment = gl.createShader(gl.FRAGMENT_SHADER);
	const dispose = () => {
		gl.deleteBuffer(vertices);
		gl.deleteProgram(program);
		gl.deleteShader(vertex);
		gl.deleteShader(fragment);
	};
	if (!program || !vertices || !vertex || !fragment) {
		dispose();
		return null;
	}

	gl.shaderSource(vertex, VERTEX_SHADER);
	gl.compileShader(vertex);
	gl.shaderSource(fragment, FRAGMENT_SHADER);
	gl.compileShader(fragment);
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		dispose();
		return null;
	}

	gl.useProgram(program);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	const position = gl.getAttribLocation(program, 'position');
	gl.enableVertexAttribArray(position);
	gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
	const resolution = gl.getUniformLocation(program, 'resolution');
	const time = gl.getUniformLocation(program, 'time');
	gl.uniform1i(gl.getUniformLocation(program, 'scene'), selection.scene === 'inversion' ? 0 : 1);
	gl.uniform1f(gl.getUniformLocation(program, 'seed'), selection.seed);
	gl.uniform1i(gl.getUniformLocation(program, 'centered'), centered ? 1 : 0);

	return {
		draw(seconds) {
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.uniform2f(resolution, canvas.width, canvas.height);
			gl.uniform1f(time, seconds);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		},
		dispose,
	};
}

type Options = {
	centered?: boolean;
	onUnavailable?: () => void;
	onSize?: (width: number, height: number) => void;
	region?: HTMLElement;
};

export function startFractal(canvas: HTMLCanvasElement, selection: FractalSelection, options: Options = {}) {
	const { centered = false, onUnavailable, onSize, region = canvas } = options;
	const { scene, seed } = selection;
	const shaderScene = scene === 'inversion' || scene === 'julia';
	const shader = shaderScene ? createShaderRenderer(canvas, selection, centered) : null;
	const brush = shaderScene ? null : canvas.getContext('2d');
	if (!shader && !brush) return null;

	const viewport = canvas.parentElement ?? canvas;
	const clock = createAnimationClock();
	const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
	const drift = brush ? canvas.animate(
		scene === 'flame'
			? [
				{ transform: 'scale(1.035) rotate(-1.6deg) translateX(-.8%)' },
				{ transform: 'scale(1.075) rotate(1.6deg) translateX(.8%)' },
			]
			: [
				{ transform: 'rotate(-1.3deg) translateX(-.6%)' },
				{ transform: 'rotate(1.3deg) translateX(.6%)' },
			],
		{ duration: scene === 'flame' ? 13000 : 9500, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' },
	) : null;
	drift?.pause();

	let visible = true;
	let motion = true;
	let overrideReducedMotion = false;
	let frame = 0;
	let resizeTimer = 0;
	let lastPaint = -Infinity;
	let rendering = false;

	function animate(now: number) {
		if (now - lastPaint >= 1000 / 24 - 3) {
			shader?.draw(clock.tick(now).time / 1000);
			lastPaint = now;
		}
		frame = requestAnimationFrame(animate);
	}

	function sync() {
		const root = document.documentElement.classList;
		const moving = motion && visible && !document.hidden
			&& (!motionQuery.matches || overrideReducedMotion)
			&& !root.contains('has-modal-open') && !root.contains('is-page-scroll-locked');

		canvas.dataset.fractalVisible = String(visible);
		if (rendering === moving) return;
		rendering = moving;
		canvas.dataset.fractalMotion = moving ? 'running' : 'paused';
		if (moving) {
			drift?.play();
			clock.resetFrame();
			lastPaint = -Infinity;
			if (shader) frame = requestAnimationFrame(animate);
		} else {
			drift?.pause();
			cancelAnimationFrame(frame);
		}
	}

	function resize() {
		const { width, height } = viewport.getBoundingClientRect();
		if (width <= 0 || height <= 0) return;
		const budget = scene === 'inversion' ? 3_800_000 : 6_000_000;
		const ratio = Math.min(devicePixelRatio || 1, 2.5, Math.sqrt(budget / (width * height)), 3840 / Math.max(width, height));
		const nextWidth = Math.max(1, Math.floor(width * ratio));
		const nextHeight = Math.max(1, Math.floor(height * ratio));
		if (canvas.width === nextWidth && canvas.height === nextHeight && canvas.dataset.fractalScene) return;
		canvas.width = nextWidth;
		canvas.height = nextHeight;
		shader?.draw(clock.now / 1000);
		if (brush && (scene === 'branches' || scene === 'flame')) paintCanvasScene(brush, scene, seed, centered);
		onSize?.(canvas.width, canvas.height);
	}
	function scheduleResize() {
		window.clearTimeout(resizeTimer);
		resizeTimer = window.setTimeout(resize, 150);
	}
	function loseContext(event: Event) {
		event.preventDefault();
		dispose();
		onUnavailable?.();
	}

	const observer = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		sync();
	}, { threshold: 0 });
	const resizeObserver = new ResizeObserver(scheduleResize);
	const modalObserver = new MutationObserver(sync);
	observer.observe(region);
	resizeObserver.observe(viewport);
	modalObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
	document.addEventListener('visibilitychange', sync);
	window.addEventListener('resize', scheduleResize);
	motionQuery.addEventListener('change', sync);
	canvas.addEventListener('webglcontextlost', loseContext);
	canvas.dataset.fractalMotion = 'paused';
	// A reused canvas can have the correct dimensions and still need its first paint.
	delete canvas.dataset.fractalScene;
	resize();
	canvas.dataset.fractalScene = scene;
	sync();

	function dispose() {
		observer.disconnect();
		resizeObserver.disconnect();
		modalObserver.disconnect();
		document.removeEventListener('visibilitychange', sync);
		window.removeEventListener('resize', scheduleResize);
		motionQuery.removeEventListener('change', sync);
		canvas.removeEventListener('webglcontextlost', loseContext);
		window.clearTimeout(resizeTimer);
		cancelAnimationFrame(frame);
		drift?.cancel();
		shader?.dispose();
	}

	return {
		dispose,
		setMotion(enabled: boolean, explicitOptIn = false) {
			motion = enabled;
			overrideReducedMotion = explicitOptIn;
			sync();
		},
	};
}
