import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // @ts-expect-error https://github.com/sveltejs/cli/issues/341
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
  optimizeDeps: {
    exclude: ['@node-rs/argon2', '@node-rs/bcrypt']
  },
  build: {
    commonjsOptions: {
      include: [/@tableslayer\/ui/, /node_modules/]
    }
  }
});
