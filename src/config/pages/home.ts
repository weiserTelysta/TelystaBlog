export type HomeSectionType = 'profile' | 'resources';

export type HomeSocialIcon = 'github' | 'bilibili' | 'email' | 'x' | 'steam' | 'qq' | 'wechat';

export type HomeArchiveIntroConfig = {
	eyebrow: string;
	title: string;
};

export type HomeSectionItem = {
	label: string;
	href?: string;
	description?: string;
	external?: boolean;
	kind?: string;
};

export type HomeSectionConfig = {
	id: string;
	type: HomeSectionType;
	eyebrow?: string;
	title: string;
	description: string[];
	items?: HomeSectionItem[];
	enabled?: boolean;
	order: number;
};

export type HomeSocialLinkConfig = {
	label: string;
	href: string;
	icon: HomeSocialIcon;
	external?: boolean;
};

export type HomeQrContactConfig = {
	id: 'qq' | 'wechat';
	label: string;
	icon: Extract<HomeSocialIcon, 'qq' | 'wechat'>;
	imageFileName: string;
};

export const HOME_ARCHIVE_INTRO: HomeArchiveIntroConfig = {
	eyebrow: '',
	title: 'sic itur ad astra',
};

export const HOME_SECTIONS: HomeSectionConfig[] = [
	{
		id: 'about-weiser',
		type: 'profile',
		eyebrow: 'About Me',
		title: '一些多余的话',
		description: [
			'如蒙不弃，你可以叫我 Weiser，或者，那个你所熟悉的名字。',
			'曾经的曾经，过去的过去，我无知、荒唐、不自量力、幼稚天真。以至于现在，我也未必能分清所有选择是对或是错，一切因缘是行或是止。',
			'但好在，我还是一个好人，或者我希望自己是一个好人。即使这么些年，我也发现无私的付出不一定有回报，贸然献出的真心也未必带回任何善果。',
			'可我还是愿意相信故事会走向一个美好的结局。',
			'有情人终成眷属。',
			'善良的人会得到应有的爱和回报。',
			'我相信天下大同。',
			'当然，那些对陌生人的善意，或许本来就不应该乞求回报。',
			'快乐王子最终给出了所有，而我是否也有那样的勇气，我不知道。',
		],
		order: 10,
	},
	{
		id: 'resource-corner',
		type: 'resources',
		eyebrow: 'Navigation',
		title: '一些无用的路标',
		description: ['天空不见鸟儿的踪迹，因为他早已飞过。'],
		items: [
			{
				label: 'Resource Index',
				href: '/resources',
				description: '好多美妙的宝藏，和你分享~',
				kind: 'index',
			},
			{
				label: 'Telysta Annals',
				href: 'https://annals.telysta.com',
				description: '何妨来听听写写，大家的故事',
				external: true,
				kind: 'world',
			},
		],
		order: 20,
	},
];

export const HOME_SOCIAL_LINKS: HomeSocialLinkConfig[] = [
	{
		label: 'GitHub',
		href: 'https://github.com/weiserTelysta',
		icon: 'github',
		external: true,
	},
	{
		label: 'Bilibili',
		href: 'https://space.bilibili.com/238283469',
		icon: 'bilibili',
		external: true,
	},
	{
		label: 'Email',
		href: 'mailto:weiser@telysta.com',
		icon: 'email',
	},
	{
		label: 'X',
		href: 'https://x.com/WeriserTelysta',
		icon: 'x',
		external: true,
	},
	{
		label: 'Steam',
		href: 'https://steamcommunity.com/profiles/76561199184928833/',
		icon: 'steam',
		external: true,
	},
];

export const HOME_QR_CONTACTS: HomeQrContactConfig[] = [
	{
		id: 'qq',
		label: 'QQ',
		icon: 'qq',
		imageFileName: 'qq.png',
	},
	{
		id: 'wechat',
		label: '微信',
		icon: 'wechat',
		imageFileName: 'wechat.png',
	},
];
