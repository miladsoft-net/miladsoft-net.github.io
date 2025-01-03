import { defineCollection, z } from 'astro:content'

const postsCollection = defineCollection({
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
    downloadUrl: z.string().url().optional().superRefine((val, ctx) => {
       if (ctx.path.includes('isFree') && !ctx.path[ctx.path.indexOf('isFree') + 1]) {
         if (!val) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Download URL is required for paid content",
            path: ['downloadUrl']
          });
        }
      }
    }),

    /* For internal use */
    prevTitle: z.string().default(''),
    prevSlug: z.string().default(''),
    nextTitle: z.string().default(''),
    nextSlug: z.string().default(''),
  }),
})

export const collections = {
  posts: postsCollection,
}
