import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import ws from 'vite-sveltekit-node-ws';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    sentrySvelteKit({
      sourceMapsUploadOptions: {
        org: 'siege-perilous',
        project: 'tableslayer'
      }
    }),
    sveltekit(),
    ws()
  ],
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
