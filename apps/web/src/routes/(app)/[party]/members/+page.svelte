<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field } from 'formsnap';
  import { FSControl, Input, FieldErrors } from '@tableslayer/ui';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { inviteMemberSchema } from '$lib/schemas';
  import SuperDebug from 'sveltekit-superforms';
  import { PartyMember, ResendInvite } from '$lib/components';

  let { data } = $props();

  const { party, isPartyAdmin, members, invitedEmails } = $derived(data);

  const inviteMemberForm = superForm(data.inviteMemberForm, {
    validators: zodClient(inviteMemberSchema)
  });

  const { form: inviteMemberData, enhance: enhanceInviteMember, message: inviteMemberMessage } = inviteMemberForm;
  const partyId = data.party.id as string;
</script>

<h2>Invite new member</h2>
{#if isPartyAdmin}
  <form method="post" action="?/inviteMember" use:enhanceInviteMember>
    <Field form={inviteMemberForm} name="email">
      <FSControl label="Email">
        {#snippet children({ attrs })}
          <Input {...attrs} type="email" bind:value={$inviteMemberData.email} />
        {/snippet}
      </FSControl>
      <FieldErrors />
    </Field>
    <Field form={inviteMemberForm} name="email">
      <FSControl>
        {#snippet children({ attrs })}
          <Input {...attrs} type="hidden" name="partyId" bind:value={$inviteMemberData.partyId} />
        {/snippet}
      </FSControl>
      <FieldErrors />
      <button type="submit">Invite</button>
    </Field>
    {#if $inviteMemberMessage}
      <p>{$inviteMemberMessage.text}</p>
    {/if}
  </form>
{:else}
  <p>Only admins can invite new members</p>
{/if}

<h2>Already invited</h2>
<ul>
  {#each invitedEmails as email (email)}
    <li>
      {email}
      <ResendInvite {email} {partyId} />
    </li>
  {:else}
    <li>No invites found.</li>
  {/each}
</ul>

<h2>Members of {party?.name}</h2>
{#each members as member (member.id)}
  <PartyMember {member} />
{:else}
  <p>No members found.</p>
{/each}

<SuperDebug data={$inviteMemberData} label="Invite member" />
