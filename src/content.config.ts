import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { BLOG_CATEGORY_IDS } from './lib/blogCategories';
import {
	RESOURCE_ACTION_TYPES,
	RESOURCE_STATUS_IDS,
	RESOURCE_TYPE_IDS,
} from './lib/resources/resourceTypes';

const posts = defineCollection({
	loader: glob({
		pattern: '**/*.md',
		base: './src/content/weiser-posts',
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
		series: z.string().min(1).optional(),
		seriesOrder: z.coerce.number().int().positive().optional(),
	}),
});

const resourceActionSchema = z
	.object({
		type: z.enum(RESOURCE_ACTION_TYPES),
		label: z.string().min(1),
		href: z.string().min(1).optional(),
		format: z.string().min(1).optional(),
		provider: z.string().min(1).optional(),
		code: z.string().min(1).optional(),
		primary: z.boolean().default(false),
		disabled: z.boolean().default(false),
		note: z.string().min(1).optional(),
	})
	.superRefine((action, context) => {
		if (!action.disabled && !action.href) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['href'],
				message: 'Resource action href is required unless disabled is true.',
			});
		}
	});

const resources = defineCollection({
	loader: glob({
		pattern: '**/*.md',
		base: './src/content/resources',
	}),
	schema: z.object({
		id: z.string().min(1),
		title: z.string().min(1),
		summary: z.string().min(1),
		type: z.enum(RESOURCE_TYPE_IDS),
		status: z.enum(RESOURCE_STATUS_IDS).default('available'),
		cover: z.string().min(1),
		preview: z.string().min(1),
		publishedAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
		formats: z.array(z.string().min(1)).default([]),
		variantCount: z.coerce.number().int().nonnegative().optional(),
		license: z.string().min(1).optional(),
		actions: z.array(resourceActionSchema).default([]),
		draft: z.boolean().default(false),
	}),
});

export const collections = {
	posts,
	resources,
};
