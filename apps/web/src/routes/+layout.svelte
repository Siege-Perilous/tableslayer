<!-- I removed conxtext="module" from the script tag, it might be important -->
<script lang="ts">
  let { children } = $props();
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { queryClient } from '$lib/queryClient';
  import '@tableslayer/ui/styles/globals.css';
  import { ModeWatcher } from 'mode-watcher';
  import { GlobalLoading } from '$lib/components';
  import { Toast } from '@tableslayer/ui';
</script>

<QueryClientProvider client={queryClient}>
  <ModeWatcher darkClassNames={['dark']} lightClassNames={['light']} />
  <GlobalLoading />
  {@render children()}
</QueryClientProvider>

<Toast />

<style>
  :global(body) {
    background: var(--bg);
  }
</style>
