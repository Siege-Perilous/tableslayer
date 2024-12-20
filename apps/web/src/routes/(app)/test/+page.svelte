<script lang="ts">
  import { MyCounterButton } from '@tableslayer/ui';
  import { createUsersQuery } from '$lib/queries/users';

  const usersQuery = createUsersQuery();
  import { io } from 'socket.io-client';
  import { onMount } from 'svelte';

  onMount(() => {
    const socket = io(`ws${location.origin.slice(4)}/hello`, {
      reconnectionDelayMax: 10000
    });
    socket.on('connect', () => {
      console.log('Connected to /hello namespace:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from /hello namespace');
    });
  });
</script>

<h1>Web</h1>
<MyCounterButton />

{#if $usersQuery.isLoading}
  <p>Loading...</p>
{:else if $usersQuery.isError}
  <p>{$usersQuery.error}</p>
{:else if $usersQuery.isSuccess}
  <h2>Users fetched</h2>
  <ul>
    {#each $usersQuery.data as user}
      <li>{user.name} ({user.email})</li>
    {/each}
  </ul>
{/if}
