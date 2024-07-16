<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field, Control, Label, FieldErrors } from 'formsnap';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { inviteMemberSchema, resendInviteSchema } from '$lib/schemas';
  import SuperDebug from 'sveltekit-superforms';

  let { data } = $props();

  const inviteMemberForm = superForm(data.inviteMemberForm, {
    validators: zodClient(inviteMemberSchema)
  });

  const resendInviteForm = superForm(data.resendInviteForm, {
    validators: zodClient(resendInviteSchema)
  });

  const { form: inviteMemberData, enhance: enhanceInviteMember, message: inviteMemberMessage } = inviteMemberForm;
  const { form: resendInviteData, enhance: enhanceResendInvite, message: resendInviteMessage } = resendInviteForm;
</script>

<h2>Invite new member</h2>
<form method="post" action="?/inviteMember" use:enhanceInviteMember>
  <Field form={inviteMemberForm} name="email">
    <Control let:attrs>
      <Label>Email</Label>
      <input {...attrs} type="email" bind:value={$inviteMemberData.email} />
    </Control>
    <FieldErrors />
  </Field>
  <input type="hidden" name="partyId" value={data.party?.id} />
  <button type="submit">Invite</button>
  {#if $inviteMemberMessage}
    <p>{$inviteMemberMessage}</p>
  {/if}
</form>

<h2>Already invited</h2>
{#if data.invitedEmails.length === 0}
  <p>No invited emails found.</p>
{:else}
  <ul>
    {#each data.invitedEmails as email}
      <form method="post" action="?/resendInvite" use:enhanceResendInvite>
        <input type="hidden" name="partyId" value={data.party?.id} />
        <input type="hidden" name="email" value={email} />
        <li>
          {email}
          <button type="submit">Resend</button>
          {#if $resendInviteMessage}
            <p>{$resendInviteMessage}</p>
          {/if}
        </li>
      </form>
    {/each}
  </ul>
{/if}

<h2>Members of {data.party?.name}</h2>
{#if data.members.length === 0}
  <p>No members found.</p>
{:else}
  {#each data.members as member}
    <p>{member.email}</p>
  {/each}
{/if}

<SuperDebug data={$inviteMemberData} />
<SuperDebug data={$resendInviteData} />
