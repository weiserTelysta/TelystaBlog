import type { ImageMetadata } from 'astro';
import aliceAvatar from '../../assets/images/logo/Alice_01.png';
import rhaelysaAvatar01 from '../../assets/images/logo/Rhaelysa_01.png';
import rhaelysaAvatar02 from '../../assets/images/logo/Rhaelysa_02.png';
import sylvaenaAvatar from '../../assets/images/logo/sylvaena.png';
import telystaAvatar from '../../assets/images/logo/Telysta_01.png';
import weiserAvatar from '../../assets/images/logo/weiser.png';

export type HomeProfile = {
	id: string;
	name: string;
	avatar: ImageMetadata;
	alt: string;
	tone?: HomeProfileTone;
	weight?: number;
	enabled?: boolean;
};

export type HomeProfileTone = 'warm' | 'moon' | 'rose' | 'violet' | 'mist';

export const HOME_PROFILES: HomeProfile[] = [
	{
		id: 'weiser',
		name: 'Weiser',
		avatar: weiserAvatar,
		alt: 'Weiser avatar',
		tone: 'warm',
		weight: 1,
	},
	{
		id: 'telysta',
		name: 'Telysta',
		avatar: telystaAvatar,
		alt: 'Telysta avatar',
		tone: 'moon',
		weight: 1,
	},
	{
		id: 'alice',
		name: 'Alice',
		avatar: aliceAvatar,
		alt: 'Alice avatar',
		tone: 'rose',
		weight: 1,
	},
	{
		id: 'rhaelysa-01',
		name: 'Rhaelysa',
		avatar: rhaelysaAvatar01,
		alt: 'Rhaelysa avatar',
		tone: 'violet',
		weight: 1,
	},
	{
		id: 'rhaelysa-02',
		name: 'Rhaelysa',
		avatar: rhaelysaAvatar02,
		alt: 'Rhaelysa alternate avatar',
		tone: 'violet',
		weight: 1,
	},
	{
		id: 'sylvaena',
		name: 'Sylvaena',
		avatar: sylvaenaAvatar,
		alt: 'Sylvaena avatar',
		tone: 'mist',
		weight: 1,
	},
];

export const DEFAULT_HOME_PROFILE = HOME_PROFILES[0];
