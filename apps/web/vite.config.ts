import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import ws from 'vite-sveltekit-node-ws';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      sveltekit(),
      ws(),
      sentrySvelteKit({
        sourceMapsUploadOptions: {
          org: 'siege-perilous',
          project: 'tableslayer',
          authToken: env.SENTRY_AUTH_TOKEN
        }
      })
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
      exclude: ['@node-rs/argon2', '@node-rs/bcrypt', 'fsevents']
    },
    build: {
      commonjsOptions: {
        include: [/@tableslayer\/ui/, /node_modules/]
      },
      rollupOptions: {
        external: ['fsevents']
      }
    }
  };
});
