<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types.js';
  export let data;
  const { party, members, invitedEmails } = data;
  export let form: ActionData;
  console.log(data);
</script>

<h2>Invite new member</h2>
<form method="post" action="?/inviteMember" use:enhance>
  <input type="hidden" name="partyId" value={data.party?.id} />
  <label for="email">Email</label>
  <input type="email" name="email" placeholder="Email" />
  <button type="submit">Invite</button>
  <p>{form?.message ?? ''}</p>
</form>

<h2>Already invited</h2>
{#if invitedEmails.length === 0}
  <p>No invited emails found.</p>
{:else}
  <ul>
    {#each invitedEmails as email}
      <form method="post" action="?/resendInvite" use:enhance>
        <input type="hidden" name="partyId" value={party?.id} />
        <input type="hidden" name="email" value={email} />
        <li>
          {email}
          <button type="submit">Resend</button>
          {form?.message ?? ''}
        </li>
      </form>
    {/each}
  </ul>
{/if}

<h2>Members of {party?.name}</h2>
{#if members.length === 0}
  <p>No members found.</p>
{:else}
  {#each members as member}
    <p>{member.email}</p>
  {/each}
{/if}
