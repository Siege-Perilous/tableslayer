<script lang="ts">
  import { PartyInviteResponse } from '$lib/components';
  let { data } = $props();
  const { invites, parties } = $derived(data);
</script>

<h2>Party invites</h2>

{#each invites as invite}
  <p>You have been invited to join {invite.party?.name}</p>
  <PartyInviteResponse {invite} />
{:else}
  <p>No pending invites</p>
{/each}

<h2>Parties</h2>

<ul>
  {#each parties as party (party.id)}
    <li><a href={`/${party.slug}/members`}>{party.name}</a></li>
  {:else}
    <li>Youi are not a member of any parties</li>
  {/each}
</ul>
