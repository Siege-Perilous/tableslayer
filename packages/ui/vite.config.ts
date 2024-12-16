import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // @ts-expect-error https://github.com/sveltejs/cli/issues/341
  plugins: [sveltekit()],
  server: {
    port: 5175,
    strictPort: false
  }
});
