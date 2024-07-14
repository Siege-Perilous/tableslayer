<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types.js';
  export let data;
  const { party, members } = data;
  export let form: ActionData;
  console.log(data);
</script>

<h2>Invite</h2>
<form method="post" action="?/inviteMember" use:enhance>
  <input type="hidden" name="partyId" value={data.party?.id} />
  <label for="email">Email</label>
  <input type="email" name="email" placeholder="Email" />
  <button type="submit">Invite</button>
  <p>{form?.message ?? ''}</p>
</form>

<h2>Members of {party?.name}</h2>
{#if members.length === 0}
  <p>No members found.</p>
{:else}
  {#each members as member}
    <p>{member.email}</p>
  {/each}
{/if}
