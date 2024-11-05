<script lang="ts">
  import SuperDebug, { superForm } from 'sveltekit-superforms';
  import { inviteResponseSchema } from '$lib/schemas';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Button, Icon, MessageError, addToast } from '@tableslayer/ui';
  import { IconX, IconCheck } from '@tabler/icons-svelte';
  import type { SelectParty, SelectPartyInvite, SeletUser } from '$lib/db/schema';
  let {
    invite
  }: {
    invite: {
      invite: SelectPartyInvite;
      party: SelectParty;
      invitedByUser: SeletUser;
    } | null;
    willRedirectToParty?: boolean;
  } = $props();
  const { code } = invite.invite;
  const inviteResponseForm = superForm(
    { code },
    {
      validators: zodClient(inviteResponseSchema),
      delayMs: 300
    }
  );
  const { form, enhance, message, formId, delayed } = inviteResponseForm;

  if ($message) {
    console.log($message);
    addToast({
      data: {
        title: $message.text
      }
    });
  }
</script>

<form method="POST" use:enhance>
  <div class="inviteResponse">
    <Button formaction="?/acceptInvite" name="code" onclick={() => ($formId = code)} value={code}>
      {#snippet start()}
        <Icon Icon={IconCheck} />
      {/snippet}
      {#if $delayed && $formId === code}
        Loading...
      {:else}
        Accept
      {/if}
    </Button>
    <Button variant="danger" formaction="?/declineInvite" name="code" onclick={() => ($formId = code)} value={code}>
      {#snippet start()}
        <Icon Icon={IconX} />
      {/snippet}
      {#if $delayed && $formId === code}
        Loading...
      {:else}
        Deny
      {/if}
    </Button>
  </div>
</form>

{#if $message}
  <MessageError message={$message} />
{/if}
<SuperDebug data={form} display={false} />

<style>
  .inviteResponse {
    display: flex;
    gap: var(--size-2);
    align-items: center;
  }
</style>
