import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // @ts-expect-error https://github.com/sveltejs/cli/issues/341
  plugins: [sveltekit()],
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
