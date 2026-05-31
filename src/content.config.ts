import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { BLOG_CATEGORY_IDS } from './lib/blogCategories';

const posts = defineCollection({
	loader: glob({
		pattern: '**/*.md',
		base: './src/content/posts',
	}),
	schema: z.object({
		title: z.string().min(1),
		description: z.string().min(1),
		publishedAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
		category: z.enum(BLOG_CATEGORY_IDS),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
		cover: z.string().optional(),
	}),
});

export const collections = {
	posts,
};
