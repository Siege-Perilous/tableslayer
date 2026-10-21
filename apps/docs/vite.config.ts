import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit({ preprocess: vitePreprocess(), adapter: adapter() })],
  server: {
    port: 5173,
    strictPort: false
  },
  preview: {
    port: 4173
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}']
  },
  build: {
    commonjsOptions: {
      include: [/@tableslayer\/ui/, /node_modules/]
    }
  }
});
