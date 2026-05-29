<!-- I removed conxtext="module" from the script tag, it might be important -->
<script lang="ts">
  let { children } = $props();
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { queryClient } from '$lib/queryClient';
  import '@tableslayer/ui/styles/globals.css';
  import { ModeWatcher } from 'mode-watcher';
  import { GlobalLoading } from '$lib/components';
  import { Loader, Toast, Title, Text, Logo } from '@tableslayer/ui';
  import { navigating } from '$app/state';

  // MAINTENANCE MODE: Set to false to disable
  const MAINTENANCE_MODE = true;
</script>

{#if MAINTENANCE_MODE}
  <ModeWatcher defaultMode="dark" darkClassNames={['dark']} lightClassNames={['light']} />
  <div class="maintenance">
    <div class="maintenance__content">
      <Logo size={48} />
      <Title as="h1" size="xl">Scheduled maintenance</Title>
      <Text color="var(--fgMuted)" size="1.25rem">Table Slayer is performing upgrades. We'll be back shortly.</Text>
    </div>
  </div>
{:else}
  <QueryClientProvider client={queryClient}>
    <ModeWatcher defaultMode="dark" darkClassNames={['dark']} lightClassNames={['light']} />
    <GlobalLoading />
    <div class="children">
      {@render children()}
    </div>
  </QueryClientProvider>

  {#if navigating.to}
    <Loader class="globalLoader" />
  {/if}

  <Toast />
{/if}

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
  .maintenance {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--size-4);
  }
  .maintenance__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--size-4);
    text-align: center;
    max-width: 24rem;
  }
</style>
