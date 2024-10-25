<script lang="ts">
  import { Avatar, MyCounterButton } from '@tableslayer/ui';
  import { createUsersQuery } from '$lib/queries/users';
  import { getCldImageUrl } from 'svelte-cloudinary';

  let { data } = $props();
  const { user } = data;
  const usersQuery = createUsersQuery();
  let url = '';
  if (user) {
    url = getCldImageUrl({ src: user?.avatar as string, width: 100, height: 100 });
  }
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
{#if user && user.email}
  <Avatar src={url} size="md" />
  <p>Logged in as: <a href="/profile">{user.email}</a></p>
  <p><a href="/logout">Logout</a></p>
  {#if user.emailVerified}
    <p>Email is verified</p>
  {:else}
    <p>Email is not verified</p>
    <p><a href="/verify-email">Verify email</a></p>
  {/if}
{:else}
  <p>Not logged in</p>
  <p><a href="/login">Login</a></p>
{/if}
