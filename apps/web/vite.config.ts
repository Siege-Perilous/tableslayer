import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5174,
    strictPort: false
  },
  preview: {
    port: 4174
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
