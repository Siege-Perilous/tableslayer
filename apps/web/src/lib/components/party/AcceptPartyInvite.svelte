<script lang="ts">
  import SuperDebug, { superForm } from 'sveltekit-superforms';
  import { Field, Control, FieldErrors } from 'formsnap';
  import { acceptInviteSchema } from '$lib/schemas';
  import { zodClient } from 'sveltekit-superforms/adapters';
  let {
    code
  }: {
    code: string;
  } = $props();
  const acceptInviteForm = superForm({ code }, { validators: zodClient(acceptInviteSchema) });
  const { form, enhance, message } = acceptInviteForm;
</script>

<form method="post" action="?/acceptInvite" use:enhance>
  <Field {form} name="code">
    <Control let:attrs>
      <input {...attrs} type="hidden" name="code" bind:value={code} />
      <button type="submit">Accept</button>
    </Control>
    <FieldErrors />
  </Field>
  {#if $message}
    <p>{$message.text}</p>
  {/if}
</form>
<SuperDebug data={form} />
