export const SITE_CONFIG = {
	name: 'Telysta Blog',
	defaultTitle: 'Telysta Blog',
	defaultDescription: '这是我的博客，或许，你能与我共鸣。',
	authorName: 'Weiser',
	icpRecord: '浙ICP备2025149243号-1',
	home: {
		title: 'Weiser的个人博客',
		description: 'weiser的个人博客，蒙受恩典而设。',
	},
	navItems: [
		{ label: 'Blog', href: '/blog' },
		{ label: 'About' },
		{ label: 'Friends' },
	],
} as const;
