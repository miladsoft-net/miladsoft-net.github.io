// @ts-check
import { defineConfig } from 'astro/config';
import swup from '@swup/astro';
// https://astro.build/config
export default defineConfig({
  integrations: [swup()],
  // Enable Tailwind by default on all files
  vite: {
    css: {
      postcss: true,
    },
  },
});
