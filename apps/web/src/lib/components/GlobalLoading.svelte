<script lang="ts">
  import { useIsFetching, useIsMutating } from '@tanstack/svelte-query';
  import { Loader } from '@tableslayer/ui';

  const isFetchingCount = useIsFetching(); // Tracks queries
  const isMutatingCount = useIsMutating(); // Tracks mutations

  // Derive loading state from query/mutation counts
  // Access the reactive values using .current property
  const isLoading = $derived((isFetchingCount.current ?? 0) > 0 || (isMutatingCount.current ?? 0) > 0);
</script>

<!-- Global loader display, css is in globals.css -->
{#if isLoading}
  <Loader class="globalLoader" />
{/if}
