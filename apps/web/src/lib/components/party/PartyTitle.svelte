<script lang="ts">
  import type { SelectParty, SelectUser } from '$lib/db/app/schema';
  import { type Thumb } from '$lib/server';
  import { IconChevronDown, IconHeart, IconHeartFilled } from '@tabler/icons-svelte';
  import { IconCheck } from '@tabler/icons-svelte';
  import { useUpdatePartyMutation, useUpdateUserMutation, useDeletePartyMutation } from '$lib/queries';
  import type { FormMutationError } from '$lib/factories';
  import { goto } from '$app/navigation';
  import { handleMutation } from '$lib/factories';

  import {
    Avatar,
    Button,
    ConfirmActionButton,
    Spacer,
    Hr,
    Input,
    FormControl,
    Icon,
    Popover,
    Title,
    Text,
    IconButton
  } from '@tableslayer/ui';
  let {
    user,
    party,
    isPartyAdmin
  }: {
    user: SelectUser;
    party: SelectParty & Thumb;
    isPartyAdmin: boolean;
  } = $props();

  let partyName = $state(party.name);
  let renamePartyErrors = $state<FormMutationError | undefined>(undefined);
  let formIsLoading = $state(false);

  const deleteParty = useDeletePartyMutation();
  const updateParty = useUpdatePartyMutation();
  const updateUser = useUpdateUserMutation();

  const handleDeleteParty = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () => $deleteParty.mutateAsync({ partyId: party.id }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => goto('/profile'),
      toastMessages: {
        success: { title: 'Party deleted successfully' },
        error: { title: 'Error deleting party', body: (error) => error.message }
      }
    });
  };

  const handleRenameParty = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () =>
        $updateParty.mutateAsync({
          partyId: party.id,
          partyData: { name: partyName }
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => (renamePartyErrors = error),
      onSuccess: (result) => {
        const updatedParty = result.party;
        console.log('Party renamed:', updatedParty);
        goto('/' + updatedParty.slug);
      },
      toastMessages: {
        success: { title: 'Party renamed successfully' },
        error: { title: 'Error renaming party', body: (error) => error.message }
      }
    });
  };

  const handleFavoriteParty = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () =>
        $updateUser.mutateAsync({
          userData: { favoriteParty: user.favoriteParty === party.id ? null : party.id }
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => console.error('Error favoriting party:', error),
      toastMessages: {
        success: { title: 'Party favorite updated' },
        error: { title: 'Error favoriting party', body: (error) => error.message }
      }
    });
  };
</script>

{#snippet title()}
  <div class="partyName__popoverTrigger">
    <div class="partyName__popoverAvatar">
      <Avatar size="lg" src={party.thumb.resizedUrl} alt={party.name} />
      {#if isPartyAdmin}
        <Icon Icon={IconChevronDown} />
      {/if}
    </div>
    <Title as="h1" size="lg">{party.name}</Title>
  </div>
{/snippet}

{#if isPartyAdmin}
  <Popover positioning={{ placement: 'bottom-start' }}>
    {#snippet trigger()}
      {@render title()}
    {/snippet}
    {#snippet content()}
      <div class="partyName__popoverContent">
        <form onsubmit={handleRenameParty}>
          <div class="partyName__renameField">
            <div>
              <FormControl label="Rename party" name="name" errors={renamePartyErrors && renamePartyErrors.errors}>
                {#snippet input({ inputProps })}
                  <Input {...inputProps} type="text" bind:value={partyName} hideAutocomplete />
                {/snippet}
              </FormControl>
            </div>
            <IconButton disabled={formIsLoading} type="submit" class="partyName__renameFieldBtn">
              <Icon Icon={IconCheck} />
            </IconButton>
          </div>
        </form>
        <Spacer size={2} />
        <Text size="0.875rem" color="var(--fgMuted)">Renaming your party will change the URL and break all links.</Text>
        <Spacer />
        <Hr />
        <Spacer />
        <Button onclick={handleFavoriteParty} disabled={formIsLoading}>
          {#if user.favoriteParty === party.id}
            <Icon Icon={IconHeartFilled} color="var(--fgPrimary)" />
            Remove as favorite
          {:else}
            <Icon Icon={IconHeart} color="var(--fgMuted)" />
            Set as favorite
          {/if}
        </Button>
        <Spacer size={2} />
        <Text size="0.875rem" color="var(--fgMuted)">
          When you log in, you will be redirected to your favorite party.
        </Text>
        <Spacer />
        <Hr />
        <Spacer />
        <ConfirmActionButton actionButtonText="Confirm delete" action={handleDeleteParty}>
          {#snippet trigger({ triggerProps })}
            <Button as="div" variant="danger" {...triggerProps}>Delete party</Button>
          {/snippet}
          {#snippet actionMessage()}
            <Text size="0.875rem" color="var(--fgDanger)">
              This will permenantly delete the party along with all related sessions.
            </Text>
          {/snippet}
        </ConfirmActionButton>
        <Spacer size={2} />
        <Text size="0.875rem" color="var(--fgMuted)">
          Deleting a party is permanent and you will lose any sessions and encounters created. This can not be undone.
        </Text>
      </div>
    {/snippet}
  </Popover>
{:else}
  {@render title()}
{/if}

<style>
  .partyName__popoverTrigger {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .partyName__popoverAvatar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .partyName__popoverContent {
    width: 16rem;
  }
  .partyName__renameField {
    display: flex;
    gap: 0.5rem;
  }

  :global {
    .partyName__renameFieldBtn {
      margin-top: 1.5rem;
    }
  }
</style>
