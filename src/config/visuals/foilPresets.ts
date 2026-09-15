/** Preset IDs select the shared textures in styles/category-foil.css. */
export const FOIL_PRESETS = {
	starlight: '星光 · Starlight',
	aurora: '极光 · Aurora',
	moonlit: '月辉 · Moonlit',
	prism: '棱镜 · Prism',
	embers: '余烬 · Embers',
	ripple: '涟漪 · Ripple',
	crosshatch: '交织 · Crosshatch',
	satin: '绸光 · Satin',
} as const;
export type FoilPreset = keyof typeof FOIL_PRESETS;
