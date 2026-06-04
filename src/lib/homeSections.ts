export type HomeSectionType = 'profile' | 'links' | 'resources' | 'note';

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

export const HOME_ARCHIVE_INTRO: HomeArchiveIntroConfig = {
	eyebrow: '',
	title: 'Sic itur ad astra.',
};

export const HOME_SECTIONS: HomeSectionConfig[] = [
	{
		id: 'about-weiser',
		type: 'profile',
		eyebrow: 'About Me',
		title: '一些多余的话',
		description: [
			'如蒙不弃，你可以叫我Weiser，或者，那个你所熟悉的名字。',
			'曾经的曾经，过去的过去，我无知、荒唐、不自量力、幼稚天真。以至于现在，我也未必能分清所有选择是对或是错，一切因缘是行或是止。',
			'但好在，我还是一个好人，或者我希望自己是一个好人。即使这么些年，我也发现付出不一定有回报，真心也未必带回任何善果',
			'可我还是愿意相信故事会走向圆满。',
			'有情人终成眷属',
			`善良的人会有一个美好的结局`,
			`我相信天下大同`,
			'对陌生人的善意，或许本来就不应该乞求回报。',
			'快乐王子最终给出了所有，而我是否也有那样的勇气，我不知道。',
		],
		order: 10,
	},
	{
		id: 'social-signals',
		type: 'links',
		eyebrow: 'Signals',
		title: '一些无用的方向',
		description: ['我在互联网之上，也留有不少足迹。'+`这些足迹既不厚重，也不璀璨，他们只会证明有人来过，他们的消逝也不会牵动任何在意。`],
		items: [
			{
				label: 'GitHub',
				href: 'https://github.com/weiserTelysta',
				description: '代码、项目和一些垃圾的堆放处。',
				external: true,
				kind: 'code',
			},
			{
				label: 'Email',
				href: 'mailto:weiser@telysta.com',
				description: '如果想认真聊点什么，可以从这里开始 —— weiser@telysta.com',
				kind: 'contact',
			},
			{
				label: 'BiliBili',
				href: 'https://space.bilibili.com/238283469?spm_id_from=333.1007.0.0',
				description: '有一些认真做过的虚拟歌姬的视频会放在此处。',
				external: true,
				kind: 'media',
			},
		],
		order: 20,
	},
	{
		id: 'resource-corner',
		type: 'resources',
		eyebrow: 'Resources',
		title: '无处安放的资源',
		description: ['我想分享一些资源，但是似乎也没有什么值得分享的宝藏。'],
		items: [
			{
				label: 'Resource Index',
				description: '还没想好，先留一个安静的位置。',
				kind: 'placeholder',
			},
		],
		order: 30,
	},
	{
		id: 'quiet-note',
		type: 'note',
		eyebrow: 'Note',
		title: '不知前方若何',
		description: [
			'说不完所有想说的事情，做不完所有想做的事。万物还在生长，若有余隙，不妨多来看看。',
		],
		order: 40,
	},
];
