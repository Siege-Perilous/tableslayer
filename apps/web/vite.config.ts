import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      sentrySvelteKit({
        sourceMapsUploadOptions: {
          org: 'siege-perilous',
          project: 'tableslayer',
          authToken: env.SENTRY_AUTH_TOKEN
        }
      }),
      sveltekit()
    ],
    server: {
      port: 5174,
      strictPort: false
    },
    preview: {
      port: 4174
    },
    test: {
      include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}'],
      // Unit tests resolve the stage package from source so they don't require
      // a prebuilt dist (CI runs them on a fresh checkout)
      alias: {
        '@tableslayer/stage': path.resolve(dirname, '../../packages/stage/src/lib/index.ts')
      }
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
