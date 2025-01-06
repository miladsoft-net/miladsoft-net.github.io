import { defineCollection, z } from 'astro:content';

// Schema for posts
const posts = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishDate: z.date(),
    fileName: z.string().optional(), // New field for secure downloads
    price: z.number().optional(),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    canonicalURL: z.string().url().optional(),
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
