<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { Field } from 'formsnap';
  import { Input, Avatar, FieldErrors, FSControl, MessageError } from '@tableslayer/ui';
  import { resendInviteSchema } from '$lib/schemas';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { type SuperValidated } from 'sveltekit-superforms/client';
  import { type ResendInviteFormType } from '$lib/schemas';

  let {
    email,
    partyId,
    resendInviteForm,
    isPartyAdmin
  }: {
    email: string;
    partyId: string;
    resendInviteForm: SuperValidated<ResendInviteFormType>;
    isPartyAdmin: boolean;
  } = $props();
  const form = superForm(resendInviteForm, { id: email, validators: zodClient(resendInviteSchema) });
  const { form: resendForm, enhance, message } = form;
  $resendForm.email = email;
  $resendForm.partyId = partyId;
</script>

<div class="resendInvite">
  <Avatar initials="TS" />
  {email}
  {#if isPartyAdmin}
    <form method="post" action="?/resendInvite" use:enhance>
      <Field {form} name="email">
        <FSControl>
          <Input type="hidden" name="email" bind:value={$resendForm.email} />
          <Input type="hidden" name="partyId" bind:value={$resendForm.partyId} />
          <button type="submit">Resend</button>
        </FSControl>
        <FieldErrors />
      </Field>
      {#if $message}
        <MessageError message={$message} />
      {/if}
    </form>
  {/if}
</div>

<style>
  .resendInvite {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
