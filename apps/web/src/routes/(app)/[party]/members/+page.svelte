<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field, Control, Label, FieldErrors } from 'formsnap';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { inviteMemberSchema, resendInviteSchema } from '$lib/schemas';
  import SuperDebug from 'sveltekit-superforms';

  let { data } = $props();

  const inviteMemberForm = superForm(data.inviteMemberForm, {
    validators: zodClient(inviteMemberSchema),
    resetForm: true
  });

  const { form: inviteMemberData, enhance: enhanceInviteMember, message: inviteMemberMessage } = inviteMemberForm;
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
  <Field form={inviteMemberForm} name="email">
    <Control let:attrs>
      <input {...attrs} type="hidden" name="partyId" bind:value={$inviteMemberData.partyId} />
      <button type="submit">Invite</button>
    </Control>
    <FieldErrors />
  </Field>
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
      {@const resendInviteForm = superForm(
        { email, partyId: data.party?.id },
        { validators: zodClient(resendInviteSchema) }
      )}
      {@const {
        form: resendInviteData,
        enhance: enhanceResendInvite,
        message: resendInviteMessage,
        formId
      } = resendInviteForm}

      <form method="post" action="?/resendInvite" use:enhanceResendInvite>
        <input type="hidden" name="__superform_id" value={formId} />
        <Field form={resendInviteForm} name="email">
          <Control let:attrs>
            <input {...attrs} type="hidden" value={email} />
          </Control>
          <FieldErrors />
        </Field>
        <Field form={resendInviteForm} name="partyId">
          <Control let:attrs>
            <input {...attrs} type="hidden" value={data.party?.id} />
          </Control>
          <FieldErrors />
        </Field>
        <li>
          {email}
          <button type="submit">Resend</button>
          {#if resendInviteMessage}
            <p>Message: {resendInviteMessage}</p>
          {/if}
        </li>
      </form>
      <SuperDebug data={resendInviteData} label="Resend invite" />
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

<SuperDebug data={$inviteMemberData} label="Invite member" />
