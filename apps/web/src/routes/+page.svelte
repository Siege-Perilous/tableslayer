<script lang="ts">
  import { MyCounterButton } from '@tableslayer/ui';
  import { createUsersQuery } from '$lib/queries/users';

  let { data } = $props();
  const usersQuery = createUsersQuery();
</script>

<h1>Web</h1>
<MyCounterButton />

{#if $usersQuery.isLoading}
  <p>Loading...</p>
{:else if $usersQuery.isError}
  <p>{$usersQuery.error}</p>
{:else if $usersQuery.isSuccess}
  <ul>
    {#each $usersQuery.data as user}
      <li>{user.name} ({user.email})</li>
    {/each}
  </ul>
{/if}

{#if data.user && data.user.email}
  <p>Logged in as: {data.user.email}</p>
{/if}
