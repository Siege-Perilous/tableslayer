<script lang="ts">
  import { Button } from '@tableslayer/ui';
  import type { PartyInviteWithDetails } from '$lib/server';
  import { useRespondToPartyInviteMutation } from '$lib/queries';
  import { handleMutation } from '$lib/factories';
  import { goto } from '$app/navigation';
  let {
    invite
  }: {
    invite: PartyInviteWithDetails;
  } = $props();
  let formIsLoading = $state(false);
  const { code } = invite.invite;

  const respondToPartyInvite = useRespondToPartyInviteMutation();

  const handleRespondToInvite = (accepted: boolean) => async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () => respondToPartyInvite.mutateAsync({ code, accepted }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => {
        goto(accepted ? `/${invite.party?.slug}` : '/profile');
      },
      toastMessages: {
        success: { title: 'Success', body: `You have ${accepted ? 'accepted' : 'declined'} the invite` },
        error: { title: 'Error', body: (err) => err.message }
      }
    });
  };
</script>

<div class="inviteResponse">
  <Button name="code" onclick={handleRespondToInvite(true)} isLoading={formIsLoading}>Accept</Button>
  <Button variant="danger" onclick={handleRespondToInvite(false)}>Decline</Button>
</div>

<style>
  .inviteResponse {
    display: flex;
    gap: var(--size-2);
    align-items: center;
  }
</style>
