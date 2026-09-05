type ResourceVisibility = {
	type: string;
	image: string;
	status: string;
	draft?: boolean;
};

const FEATURED_IMAGES = new Set(['asset:archive/Minecraft_red', 'asset:archive/minecraft_yellow']);

// 插画为主，另按作者要求展示两款 Minecraft 皮肤；R2 清单不等于公开画廊。
export function isPublicIllustration(resource: ResourceVisibility): boolean {
	return (resource.type === 'illustration' || (resource.type === 'image' && FEATURED_IMAGES.has(resource.image)))
		&& !resource.draft
		&& resource.status !== 'draft'
		&& !/^asset:(characters|avatars|blog_imgs)\//i.test(resource.image);
}
