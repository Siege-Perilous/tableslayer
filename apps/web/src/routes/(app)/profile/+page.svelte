<script lang="ts">
  import AcceptPartyInvite from '$lib/components/party/AcceptPartyInvite.svelte';
  let { data } = $props();
  const { invites } = data;
</script>

<h2>Party invites</h2>

{#if invites.length === 0}
  <p>No pending invites</p>
{/if}

{#each invites as invite}
  <p>You have been invited to join {invite.party?.name}</p>
  <AcceptPartyInvite code={invite.invite.code} />
{/each}
