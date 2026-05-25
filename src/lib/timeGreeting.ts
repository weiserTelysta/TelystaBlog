export type TimeGreeting = {
	startHour: number;
	endHour: number;
	message: string;
};

export const timeGreetings: TimeGreeting[] = [
	{
		startHour: 0,
		endHour: 2,
		message:
			"一个人无论学什么或作什么，只要有热情，有恒心，不要那种无着落的与人民利益不相符合的个人主义的虚荣心，总是会有进步的。",
	},
	{
		startHour: 2,
		endHour: 4,
		message:
			"生活总是这样，不能叫人处处都满意。但我们还要热情地活下去。人活一生，值得爱的东西很多，不要因为一个不满意，就灰心。",
	},
	{
		startHour: 4,
		endHour: 6,
		message:
			"琪亞娜，當你醒來，你會看到一切都變了。你會發現這個世界不再美好。那些平凡的日常，已經一去不回。但是，不要放棄。永遠不要放棄。琪亞娜，抬起頭，繼續前進吧；去把這個不完美的故事，變成你所期望的樣子！",
	},
	{
		startHour: 6,
		endHour: 8,
		message: "起床了呀，懒猪(￣(ω)￣)",
	},
	{
		startHour: 8,
		endHour: 10,
		message: "摸鱼摸鱼，日日摸鱼ε٩(๑> ₃ <)۶з",
	},
	{
		startHour: 10,
		endHour: 12,
		message: "Ciallo～(∠・ω< )⌒★",
	},
	{
		startHour: 12,
		endHour: 14,
		message: "循此苦旅，以达星辰。",
	},
	{
		startHour: 14,
		endHour: 16,
		message: "我有太多话想对你说……祝你幸福。",
	},
	{
		startHour: 16,
		endHour: 18,
		message: "疏影横斜水清浅，暗香浮动月黄昏。",
	},
	{
		startHour: 18,
		endHour: 20,
		message: "江天一色无纤尘，皎皎空中孤月轮。\n江畔何人初见月，江月何年初照人？",
	},
	{
		startHour: 20,
		endHour: 22,
		message: "我有太多梦想想对你说……但是我仿佛驻留不前，再也跟不上你的脚步。",
	},
	{
		startHour: 22,
		endHour: 24,
		message: "˚₊· ͟͟͞͞➳❥ (๑˃̵ᴗ˂̵)و哈哈，你不会以为我在emo吧✧*｡٩(ˊᗜˋ*)و✧*｡",
	},
];

export function getGreetingForHour(hour: number) {
	return (
		timeGreetings.find((greeting) => hour >= greeting.startHour && hour < greeting.endHour) ??
		timeGreetings[0]
	);
}
