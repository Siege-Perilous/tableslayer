<script lang="ts">
  import SuperDebug, { superForm } from 'sveltekit-superforms';
  import { Field } from 'formsnap';
  import { Input, FieldErrors, FSControl } from '@tableslayer/ui';
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
    <FSControl>
      <Input type="hidden" name="email" bind:value={email} />
      <Input type="hidden" name="partyId" bind:value={partyId} />
      <button type="submit">Resend</button>
    </FSControl>
    <FieldErrors />
  </Field>
  {#if $message}
    <p>{$message.text}</p>
  {/if}
</form>
<SuperDebug data={form} />
