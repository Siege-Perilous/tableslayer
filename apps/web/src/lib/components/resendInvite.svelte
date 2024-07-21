<script lang="ts">
  import SuperDebug, { superForm } from 'sveltekit-superforms';
  import { Field, Control, FieldErrors, Label } from 'formsnap';
  import { resendInviteSchema } from '$lib/schemas';
  import { zodClient } from 'sveltekit-superforms/adapters';

  let {
    email,
    partyId
  }: {
    email: string;
    partyId: string;
  } = $props();
  const resendInviteForm = superForm({ email, partyId }, { validators: zodClient(resendInviteSchema) });
  const { form, enhance, message } = resendInviteForm;
</script>

<form method="post" action="?/resendInvite" use:enhance>
  <Field {form} name="email">
    <Control let:attrs>
      <input {...attrs} type="hidden" name="email" bind:value={email} />
      <input {...attrs} type="hidden" name="partyId" bind:value={partyId} />
      <button type="submit">Resend</button>
    </Control>
    <FieldErrors />
  </Field>
  {#if $message}
    <p>{$message.text}</p>
  {/if}
</form>
<SuperDebug data={form} />
