/**
 * Keep this file data-only so content.config.ts can import category ids without
 * loading visual assets. Category images and foil visuals can be mapped later.
 */
import type { FoilPreset } from '../visuals/foilPresets';
export type { FoilPreset } from '../visuals/foilPresets';

type BlogCategoryDefinition = {
	id: string;
	title: string;
	titleEn: string;
	subtitle: string;
	subtitleEn: string;
	description: string;
	descriptionEn: string;
	foil: FoilPreset;
};

// 新栏目只在这里添加；下方 ID 与类型自动派生。已有 ID 是稳定路由标识，不随标题改名。
export const BLOG_CATEGORIES = [
	{
		id: 'manuscript',
		title: 'Weiser 的手稿',
		titleEn: "Weiser's Manuscript",
		subtitle: '代码与项目',
		subtitleEn: 'Code & Projects',
		description: '关于代码、项目和技术实践的记录。',
		descriptionEn: 'Notes on code, projects, and technical practice.',
		foil: 'starlight',
	},
	{
		id: 'collection',
		title: 'Telysta 的收藏',
		titleEn: "Telysta's Collection",
		subtitle: '学习笔记',
		subtitleEn: 'Learning Notes',
		description: '学习过程中被认真收好的线索与笔记。',
		descriptionEn: 'Carefully kept clues and notes gathered while learning.',
		foil: 'aurora',
	},
	{
		id: 'letters',
		title: '静默书简',
		titleEn: 'Quiet Letters',
		subtitle: '随笔与思考',
		subtitleEn: 'Essays & Thoughts',
		description: '一些不急着抵达结论的想法。',
		descriptionEn: 'Thoughts that are in no hurry to reach a conclusion.',
		foil: 'moonlit',
	},
	{
		id: 'reading',
		title: '阅读室',
		titleEn: 'Reading Room',
		subtitle: '书籍与媒介',
		subtitleEn: 'Books & Media',
		description: '阅读、观看，以及由此延伸出来的理解。',
		descriptionEn: 'Reading, viewing, and the understanding that grows from them.',
		foil: 'prism',
	},
	{
		id: 'life',
		title: '生活片段',
		titleEn: 'Life Fragments',
		subtitle: '日常时刻',
		subtitleEn: 'Daily Moments',
		description: '普通日子里偶尔闪光的碎片。',
		descriptionEn: 'Small moments that occasionally shine in ordinary days.',
		foil: 'ripple',
	},
	{
		id: 'portraits',
		title: '人物札记',
		titleEn: 'Portrait Notes',
		subtitle: '人物与角色研究',
		subtitleEn: 'People & Character Studies',
		description: '对人物、角色和创作者表达方式的观察。',
		descriptionEn: 'Observations on people, characters, and creative expression.',
		foil: 'embers',
	},
	{
		id: 'notes',
		title: '田野札记',
		titleEn: 'Field Notes',
		subtitle: '观察与探询',
		subtitleEn: 'Observation & Inquiry',
		description: '在行走与考察中，记录场所、礼仪和社会生活。',
		descriptionEn: 'Notes on places, rituals, and social life gathered through visits and fieldwork.',
		foil: 'starlight',
	},
] as const satisfies readonly [BlogCategoryDefinition, ...BlogCategoryDefinition[]];

export type BlogCategoryId = (typeof BLOG_CATEGORIES)[number]['id'];
export type BlogCategory = Omit<BlogCategoryDefinition, 'id'> & { id: BlogCategoryId };
export type CategoryPostCount = Record<BlogCategoryId, number>;
export const BLOG_CATEGORY_IDS = BLOG_CATEGORIES.map(category => category.id) as [BlogCategoryId, ...BlogCategoryId[]];
