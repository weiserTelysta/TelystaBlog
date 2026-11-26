export const FRACTAL_SCENES = ['inversion', 'julia', 'flame', 'branches'] as const;

export type FractalScene = typeof FRACTAL_SCENES[number];
export type FractalSelection = { scene: FractalScene; seed: number };

const SESSION_KEY = 'telysta.home.atmosphere';
const FRACTAL_PROBABILITY = 0.12;

/** Keep the surprise stable across reloads and return visits in the current tab. */
export function selectHomeFractal(): FractalSelection | null {
	let saved: string | null = null;
	try { saved = sessionStorage.getItem(SESSION_KEY); } catch { /* Storage can be disabled. */ }

	if (saved === 'stars') return null;
	if (saved) {
		const [name, value] = saved.split(':');
		const scene = FRACTAL_SCENES.find(candidate => candidate === name);
		const seed = Number(value);
		if (scene && Number.isFinite(seed) && seed >= 0 && seed < 1) return { scene, seed };
	}

	const useFractal = Math.random() < FRACTAL_PROBABILITY;
	const scene = useFractal ? FRACTAL_SCENES[Math.floor(Math.random() * FRACTAL_SCENES.length)] : null;
	const seed = scene ? Math.random() : 0;
	try { sessionStorage.setItem(SESSION_KEY, scene ? `${scene}:${seed}` : 'stars'); } catch { /* Optional persistence. */ }
	return scene ? { scene, seed } : null;
}
