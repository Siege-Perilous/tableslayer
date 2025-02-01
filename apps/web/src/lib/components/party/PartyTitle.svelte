<script lang="ts">
  import type { SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { IconChevronDown } from '@tabler/icons-svelte';
  import { IconCheck } from '@tabler/icons-svelte';
  import { useUpdatePartyMutation, useDeletePartyMutation } from '$lib/queries';
  import type { FormMutationError } from '$lib/factories';
  import { goto } from '$app/navigation';

  import {
    Avatar,
    Button,
    ConfirmActionButton,
    Spacer,
    addToast,
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
    party,
    isPartyAdmin
  }: {
    party: SelectParty & Thumb;
    isPartyAdmin: boolean;
  } = $props();

  let partyName = $state(party.name);
  let renamePartyErrors = $state<FormMutationError | undefined>(undefined);
  let formIsLoading = $state(false);

  const deleteParty = useDeletePartyMutation();
  const updateParty = useUpdatePartyMutation();

  const handleDeleteParty = async (e: Event) => {
    e.preventDefault();
    formIsLoading = true;
    try {
      await $deleteParty.mutateAsync({ partyId: party.id });
      formIsLoading = false;
      goto('/profile');
    } catch (e) {
      const error = e as FormMutationError;
      formIsLoading = false;
      addToast({
        data: {
          title: 'Error deleting party',
          body: error.message,
          type: 'danger'
        }
      });
    }
  };

  const handleRenameParty = async (e: Event) => {
    e.preventDefault();
    formIsLoading = true;
    try {
      const { party: updatedParty } = await $updateParty.mutateAsync({
        partyId: party.id,
        partyData: { name: partyName }
      });
      console.log('Party renamed:', updatedParty);
      addToast({
        data: {
          title: 'Party renamed',
          type: 'success'
        }
      });
      formIsLoading = false;
      goto('/' + updatedParty.slug);
    } catch (e) {
      const error = e as FormMutationError;
      renamePartyErrors = error;
      console.log('Error renaming party:', error);
      formIsLoading = false;
      addToast({
        data: {
          title: 'Error renaming party',
          body: error.message,
          type: 'danger'
        }
      });
      formIsLoading = false;
    }
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
        <ConfirmActionButton actionButtonText="Confirm delete" action={handleDeleteParty}>
          {#snippet trigger({ triggerProps })}
            <Button variant="danger" {...triggerProps}>Delete party</Button>
          {/snippet}
          {#snippet actionMessage()}
            <Text size="0.875rem" color="var(--fgDanger)"
              >This will permenantly delete the party along with all related sessions.</Text
            >
          {/snippet}
        </ConfirmActionButton>
        <Spacer size={2} />
        <Text size="0.875rem" color="var(--fgMuted)"
          >Deleting a party is permanent and you will lose any sessions and encounters created. This can not be undone.</Text
        >
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
