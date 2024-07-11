<!-- src/routes/+layout.svelte -->
<script context="module" lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { queryClient } from '$lib/queryClient';
  import '@tableslayer/ui/styles/globals.css';
  import { ModeWatcher } from 'mode-watcher';
  import GlobalLoading from '$lib/components/GlobalLoading.svelte';
</script>

<QueryClientProvider client={queryClient}>
  <ModeWatcher />
  <GlobalLoading />
  <slot />
</QueryClientProvider>

<style>
  :global(body) {
    background: var(--bg);
  }
</style>
