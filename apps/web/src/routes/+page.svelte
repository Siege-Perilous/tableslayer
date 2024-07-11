<script lang="ts">
  import { MyCounterButton, Skeleton } from '@tableslayer/ui';
  import { loadingMap, delayedLoadingMap } from '$lib/stores';
  import { onMount } from 'svelte';
  import type { SelectUser } from '$lib/db/schema';
  import { fetchWithLoading } from '$lib/utils';

  let { data } = $props();
  let users: SelectUser[] = $state([]);
  let error: string | null = $state(null);

  onMount(async () => {
    try {
      users = await fetchWithLoading('/api/test', 'users');
    } catch (err) {
      const error = err as Error;
      error.message;
    }
  });
</script>

<h1>Web</h1>
<MyCounterButton />

{#if $loadingMap.get('users')}
  {#if $delayedLoadingMap.get('users')}
    <Skeleton />
  {:else}
    <p>Loading...</p>
  {/if}
{:else if error}
  <p>{error}</p>
{:else}
  <ul>
    {#each users as user}
      <li>{user.name} ({user.email})</li>
    {/each}
  </ul>
{/if}

{#if data.user && data.user.email}
  <p>Logged in as: {data.user.email}</p>
{/if}
