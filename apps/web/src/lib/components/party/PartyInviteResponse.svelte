<script lang="ts">
  import SuperDebug, { superForm } from 'sveltekit-superforms';
  import { inviteResponseSchema } from '$lib/schemas';
  import { zodClient } from 'sveltekit-superforms/adapters';
  let {
    code
  }: {
    code: string;
  } = $props();
  const inviteResponseForm = superForm(
    { code },
    { validators: zodClient(inviteResponseSchema), delayMs: 300, clearOnSubmit: 'errors-and-message' }
  );
  const { form, enhance, message, formId, delayed } = inviteResponseForm;
</script>

<form method="POST" use:enhance>
  <button formaction="?/acceptInvite" name="code" onclick={() => ($formId = code)} value={code}>
    {#if $delayed && $formId === code}
      Loading...
    {:else}
      Accept
    {/if}
  </button>
  <button formaction="?/declineInvite" name="code" onclick={() => ($formId = code)} value={code}>
    {#if $delayed && $formId === code}
      Loading...
    {:else}
      Deny
    {/if}
  </button>
</form>

{#if $message}
  <p>{$message.text}</p>
{/if}
<SuperDebug data={form} />
