<script lang="ts">
  import { page } from '$app/state';
  let { data } = $props();
  const { user } = data;
  const error = page.url.searchParams.get('error');
  import { Head } from '$lib/components';
</script>

<Head />

{#if error === 'invalid-code'}
  The code provided does not exist or has already been accepted.
{:else if error === 'wrong-email'}
  The code provided is invalid because it was sent to another email address other than {user?.email}.
{/if}
