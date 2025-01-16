<script lang="ts">
  import { useIsFetching, useIsMutating } from '@tanstack/svelte-query';
  import { writable } from 'svelte/store';
  import { onDestroy } from 'svelte';
  import { Loader } from '@tableslayer/ui';

  // Global loader store
  export const isFetching = writable(false);

  const isFetchingCount = useIsFetching(); // Tracks queries
  const isMutatingCount = useIsMutating(); // Tracks mutations

  const unsubscribeIsFetching = isFetchingCount.subscribe((fetchCount) => {
    checkLoader(fetchCount, $isMutatingCount);
  });

  const unsubscribeIsMutating = isMutatingCount.subscribe((mutateCount) => {
    checkLoader($isFetchingCount, mutateCount);
  });

  function checkLoader(fetchCount: number, mutateCount: number) {
    // Only show the loader if there are active queries or mutations
    isFetching.set(fetchCount > 0 || mutateCount > 0);
  }

  onDestroy(() => {
    unsubscribeIsFetching();
    unsubscribeIsMutating();
  });
</script>

<!-- Global loader display -->
{#if $isFetching}
  <Loader class="globalLoader" />
{/if}

<style>
  :global(.globalLoader) {
    position: fixed;
    bottom: 2.5rem;
    right: 2.5rem;
    z-index: 2;
  }
</style>
