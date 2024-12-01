<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { Panel, Title, Input, FSControl, MessageError, Button, Spacer } from '@tableslayer/ui';
  import { type SuperValidated } from 'sveltekit-superforms/client';
  import { type CreateGameSessionFormType } from '$lib/schemas';
  import { createGameSessionSchema } from '$lib/schemas';
  import { superForm } from 'sveltekit-superforms/client';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Field } from 'formsnap';
  import SuperDebug from 'sveltekit-superforms';

  let {
    partyId,
    createGameSessionForm
  }: {
    partyId: string;
    createGameSessionForm: SuperValidated<CreateGameSessionFormType> & HTMLAttributes<HTMLDivElement>;
  } = $props();
  let formIsOpen = $state(false);

  const handleOpenForm = () => {
    formIsOpen = true;
  };

  const createGameSessionSuperForm = superForm(createGameSessionForm, {
    id: 'createGameSession',
    resetForm: true,
    validators: zodClient(createGameSessionSchema),
    invalidateAll: 'force'
  });

  const {
    form: createGameSessionFormData,
    enhance: createGameSessionEnhance,
    message: createGameSessionMessage
  } = createGameSessionSuperForm;
  $createGameSessionFormData.partyId = partyId;
</script>

{#if !formIsOpen}
  <Panel onclick={handleOpenForm} class="createSessionPanel hover">
    <Title as="p" size="sm">Create new session</Title>
  </Panel>
{:else}
  <Panel class="createSessionPanel">
    <form method="POST" action="?/createGameSession" use:createGameSessionEnhance>
      <Field form={createGameSessionSuperForm} name="name">
        <FSControl label="Session name">
          {#snippet children({ attrs })}
            <Input {...attrs} bind:value={$createGameSessionFormData.name} />
          {/snippet}
        </FSControl>
      </Field>
      <Spacer />
      <input type="hidden" name="partyId" value={$createGameSessionFormData.partyId} />
      <Button type="submit">Create</Button>
      <Button type="button" variant="danger" onclick={() => (formIsOpen = false)}>Cancel</Button>
      {#if $createGameSessionMessage}
        <MessageError message={$createGameSessionMessage} />
      {/if}
    </form>

    <SuperDebug data={$createGameSessionFormData} display={false} />
  </Panel>
{/if}

<style>
  :global {
    .panel.createSessionPanel {
      padding: var(--size-4);
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 2rem;
      height: 100%;
      transition: border-color 0.2s var(--ease-in-2);
      align-items: center;
      justify-content: center;
    }
    .panel.createSessionPanel.hover:hover {
      border-color: var(--fgPrimary);
      cursor: pointer;
    }
  }
</style>
