// 插画默认展示。其他 Image 类型需在这里明确收录，使用资源 frontmatter 的 image 键。
// 这里只控制额外收录；不会绕过草稿、Character/头像/文章配图排除和下载格式保护。
export const RESOURCE_GALLERY_CONFIG = {
	featuredImages: [
		'asset:archive/Minecraft_red',
		'asset:archive/minecraft_yellow',
	],
} as const;
