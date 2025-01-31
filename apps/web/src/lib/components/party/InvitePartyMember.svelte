<script lang="ts">
  import { Spacer, Hr, Icon, IconButton, Input, FormControl, addToast } from '@tableslayer/ui';
  import { useCreatePartyInviteMutation } from '$lib/queries';
  import { type SelectParty } from '$lib/db/app/schema';
  import { IconMail } from '@tabler/icons-svelte';
  import type { FormMutationError } from '$lib/factories';
  let { isPartyAdmin, party }: { isPartyAdmin: boolean; party: SelectParty } = $props();

  let email = $state('');
  let error = $state<FormMutationError | undefined>(undefined);
  let formIsLoading = $state(false);

  const createPartyInvite = useCreatePartyInviteMutation();
  const handleCreatePartyInvite = async (e: Event) => {
    e.preventDefault();
    try {
      formIsLoading = true;
      await $createPartyInvite.mutateAsync({
        email,
        partyId: party.id,
        role: 'viewer'
      });
      addToast({
        data: {
          title: 'Invite sent!',
          body: `Invite sent to ${email}`,
          type: 'success'
        }
      });
      formIsLoading = false;
      error = undefined;
    } catch (e) {
      error = e as FormMutationError;
      addToast({
        data: {
          title: 'Error sending invite',
          body: error.message,
          type: 'danger'
        }
      });
      formIsLoading = false;
    }
  };
</script>

{#if isPartyAdmin}
  <Spacer size={4} />
  <Hr />
  <Spacer size={4} />
  <form onsubmit={handleCreatePartyInvite}>
    <div class="partyMember__inviteForm">
      <div>
        <FormControl label="Invite new member" name="email" errors={error && error.errors}>
          {#snippet input({ inputProps })}
            <Input {...inputProps} type="email" bind:value={email} />
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
