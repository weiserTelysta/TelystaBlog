export type HomeSectionType = 'profile' | 'links' | 'resources' | 'note';

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
	description: string;
	items?: HomeSectionItem[];
	enabled?: boolean;
	order: number;
};

export const HOME_SECTIONS: HomeSectionConfig[] = [
	{
		id: 'about-weiser',
		type: 'profile',
		eyebrow: 'About',
		title: '慢慢整理正在抵达的事',
		description:
			'这里会放一些关于我的简短介绍：我正在学习、写作、搭建自己的数字空间，也把喜欢的技术、文字和灵感慢慢留下来。',
		order: 10,
	},
	{
		id: 'social-signals',
		type: 'links',
		eyebrow: 'Signals',
		title: '可以找到我的地方',
		description: '一些轻量入口。它们不需要喧闹，只要在你需要的时候亮一下。',
		items: [
			{
				label: 'GitHub',
				href: 'https://github.com/',
				description: '代码、项目和一些正在成形的想法。',
				external: true,
				kind: 'code',
			},
			{
				label: 'Email',
				href: 'mailto:admin@telysta.com',
				description: '如果想认真聊点什么，可以从这里开始。',
				kind: 'contact',
			},
		],
		order: 20,
	},
	{
		id: 'resource-corner',
		type: 'resources',
		eyebrow: 'Resources',
		title: '会慢慢补齐的资源站',
		description:
			'以后可以在这里放源文件、素材说明、项目资源或者一些整理好的工具入口。目前先保留一个安静的位置。',
		items: [
			{
				label: 'Resource Index',
				description: '等待后续内容接入。',
				kind: 'placeholder',
			},
		],
		order: 30,
	},
	{
		id: 'quiet-note',
		type: 'note',
		eyebrow: 'Note',
		title: '留一点空白',
		description:
			'主页不必一次说完所有事情。它只需要让人知道，这里正在生长，并且值得偶尔回来看看。',
		order: 40,
	},
];
