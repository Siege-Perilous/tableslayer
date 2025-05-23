<script lang="ts">
  import { Spacer, Hr, Icon, IconButton, Input, FormControl } from '@tableslayer/ui';
  import { useCreatePartyInviteMutation } from '$lib/queries';
  import { type SelectParty } from '$lib/db/app/schema';
  import { IconMail } from '@tabler/icons-svelte';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  let { isPartyAdmin, party }: { isPartyAdmin: boolean; party: SelectParty } = $props();

  let email = $state('');
  let error = $state<FormMutationError | undefined>(undefined);
  let formIsLoading = $state(false);

  const createPartyInvite = useCreatePartyInviteMutation();
  const handleCreatePartyInvite = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () =>
        $createPartyInvite.mutateAsync({
          email,
          partyId: party.id,
          role: 'viewer'
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (err) => {
        error = err;
      },
      onSuccess: () => {
        email = '';
        error = undefined;
      },
      toastMessages: {
        success: { title: 'Invite sent!', body: `Invite sent to ${email}` },
        error: { title: 'Error sending invite', body: (err) => err.message }
      }
    });
  };
</script>

{#if isPartyAdmin}
  <Spacer size="1rem" />
  <Hr />
  <Spacer size="1rem" />
  <form onsubmit={handleCreatePartyInvite}>
    <div class="partyMember__inviteForm">
      <div>
        <FormControl label="Invite new member" name="email" errors={error && error.errors}>
          {#snippet input({ inputProps })}
            <Input {...inputProps} type="email" placeholder="email address" bind:value={email} />
          {/snippet}
        </FormControl>
      </div>

      <IconButton type="submit" class="partyMember__inviteFormBtn" disabled={formIsLoading}>
        <Icon Icon={IconMail} />
      </IconButton>
    </div>
  </form>
{/if}

<style>
  :global {
    .partyMember__inviteFormBtn {
      margin-top: 1.5rem;
    }
  }

  .partyMember__inviteForm {
    display: flex;
    gap: 0.5rem;
  }
</style>
