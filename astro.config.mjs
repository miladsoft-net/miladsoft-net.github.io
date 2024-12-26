// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  integrations: [],
  // Enable Tailwind by default on all files
  vite: {
    css: {
      postcss: true,
    },
  },
});
