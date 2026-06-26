export type HomeGreetingMood =
	| 'quiet'
	| 'playful'
	| 'poetic'
	| 'hopeful'
	| 'melancholy'
	| 'daily';

export type HomeGreeting = {
	id: string;
	text: string;
	dayAffinity: number;
	weight?: number;
	mood?: HomeGreetingMood;
};

export const HOME_GREETINGS: HomeGreeting[] = [
	{
		id: 'patient-progress',
		text: '一个人无论学什么或作什么，只要有热情，有恒心，不要那种无着落的与人民利益不相符合的个人主义的虚荣心，总是会有进步的。',
		dayAffinity: 0.18,
		weight: 0.82,
		mood: 'hopeful',
	},
	{
		id: 'keep-living-warmly',
		text: '生活总是这样，不能叫人处处都满意。但我们还要热情地活下去。人活一生，值得爱的东西很多，不要因为一个不满意，就灰心。',
		dayAffinity: 0.12,
		weight: 0.86,
		mood: 'hopeful',
	},
	{
		id: 'kiana-forward',
		text: '琪亞娜，當你醒來，你會看到一切都變了。你會發現這個世界不再美好。那些平凡的日常，已經一去不回。但是，不要放棄。永遠不要放棄。琪亞娜，抬起頭，繼續前進吧；去把這個不完美的故事，變成你所期望的樣子！',
		dayAffinity: 0.08,
		weight: 0.72,
		mood: 'hopeful',
	},
	{
		id: 'lazy-morning',
		text: '起床了呀，懒猪(￣(ω)￣)',
		dayAffinity: 0.62,
		mood: 'playful',
	},
	{
		id: 'daily-fishing',
		text: '摸鱼摸鱼，日日摸鱼ε٩(๑> ₃ <)۶з',
		dayAffinity: 0.78,
		mood: 'playful',
	},
	{
		id: 'ciallo',
		text: 'Ciallo～(∠・ω< )⌒★',
		dayAffinity: 0.86,
		weight: 1.08,
		mood: 'playful',
	},
	{
		id: 'through-hardship-to-stars',
		text: '循此苦旅，以达星辰。',
		dayAffinity: 0.92,
		weight: 1.14,
		mood: 'poetic',
	},
	{
		id: 'too-many-words',
		text: '我有太多话想对你说……祝你幸福。',
		dayAffinity: 0.72,
		mood: 'melancholy',
	},
	{
		id: 'sparse-shadows',
		text: '疏影横斜水清浅，暗香浮动月黄昏。',
		dayAffinity: 0.58,
		weight: 1.08,
		mood: 'poetic',
	},
	{
		id: 'moonlit-river',
		text: '江天一色无纤尘，皎皎空中孤月轮。\n江畔何人初见月，江月何年初照人？',
		dayAffinity: 0.28,
		weight: 0.92,
		mood: 'poetic',
	},
	{
		id: 'dreams-left-behind',
		text: '我有太多梦想想对你说……但是我仿佛驻留不前，再也跟不上你的脚步。',
		dayAffinity: 0.2,
		weight: 0.86,
		mood: 'melancholy',
	},
	{
		id: 'not-emo',
		text: '˚₊· ͟͟͞͞➳❥ (๑˃̵ᴗ˂̵)و哈哈，你不会以为我在emo吧✧*｡٩(ˊᗜˋ*)و✧*｡',
		dayAffinity: 0.34,
		weight: 0.76,
		mood: 'playful',
	},
];
