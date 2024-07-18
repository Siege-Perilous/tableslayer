<script lang="ts">
  import { MyCounterButton } from '@tableslayer/ui';
  import { createUsersQuery } from '$lib/queries/users';
  import { CldImage } from 'svelte-cloudinary';

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
  <h2>Users fetched</h2>
  <ul>
    {#each $usersQuery.data as user}
      <li>{user.name} ({user.email})</li>
    {/each}
  </ul>
{/if}

<h2>User status</h2>
{#if data.user && data.user.email}
  <CldImage src={data.user.avatar} width={40} height={40} />
  <p>Logged in as: {data.user.email}</p>
  <p><a href="/logout">Logout</a></p>
  {#if data.user.emailVerified}
    <p>Email is verified</p>
  {:else}
    <p>Email is not verified</p>
    <p><a href="/verify-email">Verify email</a></p>
  {/if}
{:else}
  <p>Not logged in</p>
  <p><a href="/login">Login</a></p>
{/if}
