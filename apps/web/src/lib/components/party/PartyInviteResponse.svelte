<script lang="ts">
  import SuperDebug, { superForm } from 'sveltekit-superforms';
  import { Field, Control, FieldErrors } from 'formsnap';
  import { inviteResponseSchema } from '$lib/schemas';
  import { zodClient } from 'sveltekit-superforms/adapters';
  let {
    code
  }: {
    code: string;
  } = $props();
  const inviteResponseForm = superForm({ code }, { validators: zodClient(inviteResponseSchema) });
  const { form, enhance, message } = inviteResponseForm;
</script>

<form method="post" use:enhance>
  <button formaction="?/acceptInvite" name="code" value={code}>Accept</button>
  <button formaction="?/declineInvite" name="code" value={code}>Decline</button>
</form>

{#if $message}
  <p>{$message.text}</p>
{/if}
<SuperDebug data={form} />
