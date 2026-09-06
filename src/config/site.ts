export const SITE_CONFIG = {
	name: "Weiser's Melancholy",
	defaultTitle: "Weiser's Melancholy",
	defaultDescription: '这是 Weiser 的个人网络空间，用来整理技术、学习、随笔与一些安静的想法。我希望把最真挚的感情以及我的世界与你分享。',
	authorName: 'Weiser',
	// Stable sharing identity, independent of the visitor's random avatar/favicon.
	shareImage: {
		url: 'https://assets.telysta.com/avatars/Profile_Weiser.avatar.webp',
		alt: 'Weiser — Weiser’s Melancholy',
		width: 384,
		height: 384,
		type: 'image/webp',
	},
	icpRecord: undefined,
	home: {
		title: "Weiser's Melancholy",
		description: 'Weiser 的个人写作空间，记录学习、开发、阅读、生活和缓慢成形的想法。',
	},
	navItems: [
		{ label: 'Blog', href: '/blog' },
	],
} as const;
