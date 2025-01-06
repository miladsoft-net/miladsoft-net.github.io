import { defineCollection, z } from 'astro:content';

// Schema for posts
const posts = defineCollection({
  schema: z.object({
    title: z.string(),
    published: z.date(),
    updated: z.date().optional(),
    draft: z.boolean().optional().default(false),
    description: z.string().optional().default(''),
    image: z.string().optional().default(''),
    tags: z.array(z.string()).optional().default([]),
    category: z.string().optional().default(''),
    lang: z.string().optional().default(''),
    isFree: z.boolean().default(true),
    price: z.number().optional(),
    salePrice: z.number().optional(),
    fileName: z.string().optional(), // مطمئن شوید که اینجا تعریف شده است
  })
});

// Schema for spec
const spec = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishDate: z.date(),
    tags: z.array(z.string()).default([])
  })
});

// Export collections
export const collections = {
  'posts': posts,
  'spec': spec
};
