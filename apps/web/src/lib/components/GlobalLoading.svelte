<script lang="ts">
  import { useIsFetching, useIsMutating } from '@tanstack/svelte-query';
  import { writable } from 'svelte/store';
  import { onDestroy } from 'svelte';

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
  <div class="global-loader">Global Loading</div>
{/if}

<style>
  .global-loader {
    position: fixed;
    bottom: 0;
    right: 0;
    height: 1rem;
    background: red;
    padding: 0.5rem;
    color: white;
    font-size: 0.9rem;
    border-radius: 4px;
    z-index: 9999;
  }
</style>
