import { useEffect, useRef } from 'react';
import { selectHomeFractal } from '../fractals/fractalScenes';
import { startStarfield, type StarfieldVariant } from './starfieldRuntime';
import './StarfieldBackground.css';

export default function StarfieldBackground({
	variant = 'immersive', homeFractals = false,
}: { variant?: StarfieldVariant; homeFractals?: boolean }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fractalRef = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const selection = homeFractals ? selectHomeFractal() : null;
		const fractal = fractalRef.current;
		const hero = document.querySelector<HTMLElement>('[data-home-hero]');
		if (!selection || !fractal || !hero) return startStarfield(canvas, variant);

		let disposed = false;
		let stop: (() => void) | undefined;
		const useStars = () => {
			if (disposed) return;
			fractal.hidden = true;
			canvas.hidden = false;
			stop = startStarfield(canvas, variant);
		};

		void import('../fractals/fractalRuntime').then(({ startFractal }) => {
			if (disposed) return;
			fractal.hidden = false;
			const animation = startFractal(fractal, selection, { region: hero, onUnavailable: useStars });
			if (!animation) {
				useStars();
				return;
			}
			canvas.hidden = true;
			stop = animation.dispose;
		}).catch(useStars);

		return () => {
			disposed = true;
			stop?.();
		};
	}, [homeFractals, variant]);
	return <div className="starfield" aria-hidden="true">
		<canvas ref={canvasRef} className="starfield__canvas" />
		{homeFractals && <canvas ref={fractalRef} className="starfield__canvas starfield__fractal" hidden />}
	</div>;
}
