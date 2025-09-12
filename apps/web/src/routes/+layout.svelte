<!-- I removed conxtext="module" from the script tag, it might be important -->
<script lang="ts">
  let { children, data } = $props();
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { queryClient } from '$lib/queryClient';
  import '@tableslayer/ui/styles/globals.css';
  import { ModeWatcher } from 'mode-watcher';
  import { GlobalLoading } from '$lib/components';
  import { Loader, Toast } from '@tableslayer/ui';
  import { navigating } from '$app/state';
</script>

<svelte:head>
  {#if data.envName === 'production' && data.fathomSiteId}
    <script src="https://cdn.usefathom.com/script.js" data-spa="auto" data-site={data.fathomSiteId} defer></script>
  {/if}
</svelte:head>

<QueryClientProvider client={queryClient}>
  <ModeWatcher defaultMode="dark" darkClassNames={['dark']} lightClassNames={['light']} />
  <GlobalLoading />
  <div class="children">
    {@render children()}
  </div>
  <!--  <div class="grid"></div>  -->
</QueryClientProvider>

{#if navigating.to}
  <Loader class="globalLoader" />
{/if}

<Toast />

<style>
  :global(body) {
    background: var(--bg);
  }
  :global(.globalLoader) {
    position: fixed;
    bottom: 2.5rem;
    right: 2.5rem;
    z-index: 1;
  }
  .children {
    position: relative;
    z-index: 1;
  }
</style>
