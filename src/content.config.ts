import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { BLOG_CATEGORY_IDS } from './config/content/blogCategories';
import { BLOG_SERIES_IDS } from './config/content/blogSeries';
import {
	RESOURCE_ACTION_TYPES,
	RESOURCE_STATUS_IDS,
	RESOURCE_TYPE_IDS,
} from './config/content/resourceTypes';

const posts = defineCollection({
	loader: glob({
		pattern: '**/*.md',
		base: './src/content/weiser-posts',
	}),
	schema: z
		.object({
			title: z.string().min(1),
			description: z.string().min(1),
			publishedAt: z.coerce.date(),
			updatedAt: z.coerce.date(),
			category: z.enum(BLOG_CATEGORY_IDS),
			tags: z.array(z.string()).default([]),
			draft: z.boolean().default(false),
			cover: z.string().min(1).optional(),
			series: z.enum(BLOG_SERIES_IDS).optional(),
			seriesOrder: z.coerce.number().int().positive().optional(),
		})
		.superRefine((post, context) => {
			if (Boolean(post.series) !== (post.seriesOrder !== undefined)) {
				context.addIssue({
					code: 'custom',
					path: post.series ? ['seriesOrder'] : ['series'],
					message: 'series and seriesOrder must be provided together.',
				});
			}
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
				code: 'custom',
				path: ['href'],
				message: 'Resource action href is required unless disabled is true.',
			});
		}
	});

const resourceGalleryImageSchema = z.object({
	src: z.string().min(1),
	label: z.string().min(1).optional(),
	alt: z.string().min(1).optional(),
});

const resourceCreditSchema = z.object({
	label: z.string().min(1),
	name: z.string().min(1),
	href: z.string().min(1).optional(),
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
		image: z.string().min(1),
		cover: z.string().min(1).optional(),
		preview: z.string().min(1).optional(),
		gallery: z.array(resourceGalleryImageSchema).default([]),
		credits: z.array(resourceCreditSchema).default([]),
		publishedAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
		formats: z.array(z.string().min(1)).default([]),
		variantCount: z.coerce.number().int().nonnegative().optional(),
		license: z.string().min(1).optional(),
		actions: z.array(resourceActionSchema).default([]),
		// Prefer status for new resources; draft remains for older content compatibility.
		draft: z.boolean().default(false),
	}),
});

export const collections = {
	posts,
	resources,
};
