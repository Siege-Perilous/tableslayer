<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Field } from 'formsnap';
  import type { SelectParty } from '$lib/db/app/schema';
  import type { AvatarThumb } from '$lib/server';
  import { IconChevronDown } from '@tabler/icons-svelte';
  import {
    Avatar,
    Button,
    Spacer,
    MessageError,
    Hr,
    Input,
    FSControl,
    Icon,
    Popover,
    Title,
    Text
  } from '@tableslayer/ui';
  import { type SuperValidated } from 'sveltekit-superforms/client';
  import {
    type RenamePartyFormType,
    type DeletePartyFormType,
    deletePartySchema,
    renamePartySchema
  } from '$lib/schemas';
  let {
    party,
    renamePartyForm,
    deletePartyForm,
    isPartyAdmin
  }: {
    party: SelectParty & AvatarThumb;
    renamePartyForm: SuperValidated<RenamePartyFormType>;
    deletePartyForm: SuperValidated<DeletePartyFormType>;
    isPartyAdmin: boolean;
  } = $props();

  const renameSuperForm = superForm(renamePartyForm, {
    validators: zodClient(renamePartySchema),
    resetForm: true
  });
  const { form: renameForm, enhance: renameEnhance, message: renameMessage } = renameSuperForm;

  const deleteSuperForm = superForm(deletePartyForm, {
    validators: zodClient(deletePartySchema),
    resetForm: true
  });
  const { form: deleteForm, enhance: deleteEnhance, message: deleteMessage } = deleteSuperForm;

  $renameForm.partyId = party.id;
  $renameForm.name = party.name;
  $deleteForm.partyId = party.id;
</script>

{#snippet title()}
  <div class="partyName__popoverTrigger">
    <div class="partyName__popoverAvatar">
      <Avatar size="lg" src={party.avatarThumb.resizedUrl} alt={party.name} />
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
        <form method="post" action="?/renameParty" use:renameEnhance>
          <Field form={renameSuperForm} name="name">
            <FSControl label="Rename party">
              <input type="hidden" name="partyId" bind:value={$renameForm.partyId} />
              <Input type="text" name="name" bind:value={$renameForm.name} autocomplete="off" />
            </FSControl>
          </Field>
          <Spacer size={2} />
          <Text size="0.875rem" color="var(--fgMuted)"
            >Renaming your party will change the URL and break all links.</Text
          >
          <Spacer size={4} />
          <Button type="submit">Rename party</Button>
        </form>
        {#if $renameMessage}
          <Spacer />
          <MessageError message={$renameMessage} />
        {/if}
        <Spacer />
        <Hr />
        <Spacer />
        <form method="post" action="?/deleteParty" use:deleteEnhance>
          <Field form={deleteSuperForm} name="partyId">
            <FSControl>
              <input type="hidden" name="partyId" value={$deleteForm.partyId} />
            </FSControl>
          </Field>
          <Button type="submit" variant="danger">Delete party</Button>
          <Spacer size={2} />
          <Text size="0.875rem" color="var(--fgMuted)"
            >Deleting a party is permanent and you will lose any sessions and encounters created. This can not be
            undone.</Text
          >
        </form>
        {#if $deleteMessage}
          <Spacer />
          <MessageError message={$deleteMessage} />
        {/if}
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
</style>
