<!-- I removed conxtext="module" from the script tag, it might be important -->
<script lang="ts">
  let { children } = $props();
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { queryClient } from '$lib/queryClient';
  import '@tableslayer/ui/styles/globals.css';
  import { ModeWatcher } from 'mode-watcher';
  import { GlobalLoading } from '$lib/components';
  import { Loader, Toast } from '@tableslayer/ui';
  import { navigating } from '$app/state';
</script>

<svelte:head>
  <title>Table Slayer</title>
  <meta name="description" content="Tools to create animated battle maps for in person RPG games." />
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
    z-index: 2;
  }
  /*  .grid {  */
  /*  pointer-events: none;  */
  /*  position: fixed;  */
  /*  inset: 0;  */
  /*  height: 100%;  */
  /*  width: 100%;  */
  /*  background-image: linear-gradient(to right, #80808012 1px, transparent 1px),  */
  /*  linear-gradient(to bottom, #80808012 1px, transparent 1px);  */
  /*  background-size: 28px 28px;  */
  /*  -webkit-mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 0%, transparent 100%);  */
  /*  mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 0%, transparent 100%);  */
  /*  }  */
  .children {
    position: relative;
    z-index: 1;
  }
</style>
