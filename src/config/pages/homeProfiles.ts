type HomeProfileAvatar = {
	src: string;
	width: number;
	height: number;
};

export type HomeProfile = {
	id: string;
	name: string;
	avatar: HomeProfileAvatar;
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
		avatar: createCdnAvatar('Profile_Weiser.avatar.webp'),
		alt: 'Weiser avatar',
		tone: 'warm',
		weight: 1,
	},
	{
		id: 'weiser-art-nouveau',
		name: 'Weiser',
		avatar: createCdnAvatar('Profile_Weiser_artnouveau.avatar.webp'),
		alt: 'Weiser Art Nouveau avatar',
		tone: 'warm',
		weight: 1,
	},
	{
		id: 'telysta',
		name: 'Telysta',
		avatar: createCdnAvatar('Profile_Telysta_01.avatar.webp'),
		alt: 'Telysta avatar',
		tone: 'moon',
		weight: 1,
	},
	{
		id: 'alice',
		name: 'Alice',
		avatar: createCdnAvatar('Profile_Alice_01.avatar.webp'),
		alt: 'Alice avatar',
		tone: 'rose',
		weight: 1,
	},
	{
		id: 'rhaelysa-01',
		name: 'Rhaelysa',
		avatar: createCdnAvatar('Profile_Rhaelysa_01.avatar.webp'),
		alt: 'Rhaelysa avatar',
		tone: 'violet',
		weight: 1,
	},
	{
		id: 'rhaelysa-02',
		name: 'Rhaelysa',
		avatar: createCdnAvatar('Profile_Rhaelysa_02.avatar.webp'),
		alt: 'Rhaelysa alternate avatar',
		tone: 'violet',
		weight: 1,
	},
	{
		id: 'sylvaena',
		name: 'Sylvaena',
		avatar: createCdnAvatar('Profile_Sylvaena.avatar.webp'),
		alt: 'Sylvaena avatar',
		tone: 'mist',
		weight: 1,
	},
];

export const DEFAULT_HOME_PROFILE = HOME_PROFILES[0];

function createCdnAvatar(fileName: string): HomeProfileAvatar {
	return {
		src: new URL(`avatars/${encodeURIComponent(fileName)}`, 'https://assets.telysta.com/').toString(),
		width: 384,
		height: 384,
	};
}
