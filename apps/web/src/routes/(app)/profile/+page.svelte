<script lang="ts">
  import PartyInviteResponse from '$lib/components/party/PartyInviteResponse.svelte';
  let { data } = $props();
  const { invites, parties } = data;
</script>

<h2>Party invites</h2>

{#if invites.length === 0}
  <p>No pending invites</p>
{/if}

{#each invites as invite}
  <p>You have been invited to join {invite.party?.name}</p>
  <PartyInviteResponse code={invite.invite.code} />
{/each}

<h2>Parties</h2>

{#if parties.length === 0}
  <p>You are not a member of any parties</p>
{:else}
  <ul>
    {#each parties as party}
      <li><a href={`/${party.slug}`}>{party.name}</a></li>
    {/each}
  </ul>
{/if}
