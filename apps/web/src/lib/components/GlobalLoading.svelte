<script lang="ts">
  import { useIsFetching, useIsMutating } from '@tanstack/svelte-query';
  import { isFetching } from '$lib/stores/loading';
  import { onDestroy } from 'svelte';

  const isFetchingCount = useIsFetching();
  const isMutatingCount = useIsMutating();

  const unsubscribeIsFetching = isFetchingCount.subscribe((value) => {
    isFetching.set(value > 0);
  });

  const unsubscribeIsMutating = isMutatingCount.subscribe((value) => {
    isFetching.update((n) => n || value > 0);
  });

  onDestroy(() => {
    unsubscribeIsFetching();
    unsubscribeIsMutating();
  });

  let showLoader = false;

  isFetching.subscribe((value) => {
    showLoader = value;
  });
</script>

{#if showLoader}
  <div class="global-loader">global loading</div>
{/if}

<style>
  .global-loader {
    position: fixed;
    bottom: 0;
    right: 0;
    height: 1rem;
    background: red;
  }
</style>
