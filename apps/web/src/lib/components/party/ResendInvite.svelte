<script lang="ts">
  import { Hr, Text, Avatar, Icon, Popover, Spacer, Button, addToast } from '@tableslayer/ui';
  import { IconChevronDown } from '@tabler/icons-svelte';
  import { useDeletePartyInviteMutation, useResendPartyInviteMutation } from '$lib/queries';
  import type { FormMutationError } from '$lib/factories';

  let {
    email,
    partyId,
    isPartyAdmin
  }: {
    email: string;
    partyId: string;
    isPartyAdmin: boolean;
  } = $props();

  let formIsLoading = $state(false);

  const deletePartyInvite = useDeletePartyInviteMutation();
  const handleDeletePartyInvite = async (e: Event) => {
    console.log('delete');
    e.preventDefault();
    formIsLoading = true;
    try {
      await $deletePartyInvite.mutateAsync({ partyId, email });
      formIsLoading = false;
      addToast({
        data: { title: 'Invite cancelled', body: `Invite for ${email} has been cancelled`, type: 'success' }
      });
    } catch (e) {
      formIsLoading = false;
      const error = e as FormMutationError;
      addToast({ data: { title: 'Error cancelling invite', body: error.message, type: 'danger' } });
    }
  };

  const resendPartyInvite = useResendPartyInviteMutation();

  const handleResendPartyInvite = async (e: Event) => {
    e.preventDefault();
    formIsLoading = true;
    try {
      await $resendPartyInvite.mutateAsync({ partyId, email });
      formIsLoading = false;
      addToast({
        data: { title: 'Invite resent', body: `Invite for ${email} has been resent`, type: 'success' }
      });
    } catch (e) {
      formIsLoading = false;
      const error = e as FormMutationError;
      addToast({ data: { title: 'Error resending invite', body: error.message, type: 'danger' } });
    }
  };
</script>

{#snippet resendInvite()}
  <div class="resendInvite {isPartyAdmin && 'resendInvite--canEdit'}">
    <div class="resendInvite__avatar">
      <Avatar initials="TS" />
      {#if isPartyAdmin}
        <Icon Icon={IconChevronDown} color="var(--fgMuted)" class="resendInvite__chevron" />
      {/if}
    </div>
    <p>{email}</p>
  </div>
{/snippet}

{#if isPartyAdmin}
  <Popover positioning={{ placement: 'bottom-start' }}>
    {#snippet trigger()}
      {@render resendInvite()}
    {/snippet}
    {#snippet content()}
      <div class="resendInvite__popover">
        <Button onclick={handleResendPartyInvite} disabled={formIsLoading}>Resend invite</Button>
        <Spacer size={4} />
        <Hr />
        <Spacer size={4} />
        <Button onclick={handleDeletePartyInvite} variant="danger" disabled={formIsLoading}>Cancel invite</Button>
        <Spacer size={2} />
        <Text size="0.875rem" color="var(--fgMuted)">Any previous email invites sent will no longer work</Text>
      </div>
    {/snippet}
  </Popover>
{:else}
  {@render resendInvite()}
{/if}

<style>
  .resendInvite {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }
  .resendInvite--canEdit:hover {
    text-decoration: underline;
  }
  .resendInvite__avatar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  :global(.resendInvite__chevron) {
    justify-self: end;
  }
  .resendInvite__popover {
    width: 16rem;
  }
</style>
