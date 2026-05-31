import type { ImageMetadata } from 'astro';
import accordionWeiserImage from '../assets/images/accordion/accordion_weiser.webp';
import accordionTelystaImage from '../assets/images/accordion/accordion_telysta.webp';
import accordionRhaelysaImage from '../assets/images/accordion/accordion_rhaelysa.webp';
import accordionAliceImage from '../assets/images/accordion/accordion_alice.webp';
import accordionSylvaenaImage from '../assets/images/accordion/accordion_sylvaena.webp';

import {
	BLOG_CATEGORIES,
	type BlogCategory,
	type BlogCategoryId,
	type FoilPreset,
} from './blogCategories';

export type BlogCategoryVisual = BlogCategory & {
	cardInscription: {
		prefix: string;
		name: string;
	};
	image: ImageMetadata;
	imagePosition: string;
	imageScale: number;
	shortTitle: string;
	tone: string;
	foil: FoilPreset;
};

const VISUAL_COPY: Record<
	BlogCategoryId,
	{
		cardInscription: {
			prefix: string;
			name: string;
		};
		shortTitle: string;
		description: string;
		image: ImageMetadata;
		imagePosition?: string;
		imageScale?: number;
		tone: string;
	}
> = {
	manuscript: {
		cardInscription: {
			prefix: 'Weiser',
			name: 'Manuscript',
		},
		shortTitle: 'Manuscript',
		image: accordionWeiserImage,
		description: '把代码、项目和那些慢慢成形的想法收进同一页星图。',
		tone: 'blue',
	},
	collection: {
		cardInscription: {
			prefix: 'Telysta',
			name: 'Collection',
		},
		shortTitle: 'Collection',
		image: accordionTelystaImage,
		description: '一些被认真拾起的线索，等以后回头看时仍然发光。',
		tone: 'violet',
	},
	essays: {
		cardInscription: {
			prefix: 'Rhaelysa',
			name: 'Letters',
		},
		shortTitle: 'Letters',
		image: accordionRhaelysaImage,
		description: '不急着抵达答案，只是在安静处把心里的回声写下来。',
		tone: 'silver',
	},
	reading: {
		cardInscription: {
			prefix: 'Alice',
			name: 'Reading',
		},
		shortTitle: 'Reading',
		image: accordionAliceImage,
		description: '从书页、影像和故事里借来一点新的视角。',
		tone: 'prism',
	},
	life: {
		cardInscription: {
			prefix: 'Sylvaena',
			name: 'Life',
		},
		shortTitle: 'Life',
		image: accordionSylvaenaImage,
		description: '普通日子也会有细小的光，偶尔落在这里。',
		tone: 'rose',
	},
	portraits: {
		cardInscription: {
			prefix: 'Telysta',
			name: 'Portrait',
		},
		shortTitle: 'Portrait',
		image: accordionTelystaImage,
		description: '观察人物、角色与创作者表达方式的侧影。',
		tone: 'ember',
	},
};

export const BLOG_CATEGORY_VISUALS = BLOG_CATEGORIES.map((category) => ({
	...category,
	...VISUAL_COPY[category.id],
	imagePosition: VISUAL_COPY[category.id].imagePosition ?? 'center center',
	imageScale: VISUAL_COPY[category.id].imageScale ?? 1.04,
})) satisfies BlogCategoryVisual[];

export function getBlogCategoryVisualById(id: BlogCategoryId | undefined) {
	return BLOG_CATEGORY_VISUALS.find((visual) => visual.id === id);
}
