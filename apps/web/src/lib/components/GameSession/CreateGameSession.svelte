<script lang="ts">
  import { Panel, FormControl, Title, Input, Button, Spacer, addToast } from '@tableslayer/ui';
  import { useCreateGameSessionMutation } from '$lib/queries';
  import type { FormMutationError } from '$lib/factories';

  let {
    partyId
  }: {
    partyId: string;
  } = $props();
  let formIsOpen = $state(false);
  let gameSessionName = $state('');
  let createGameSessionError = $state<FormMutationError | undefined>(undefined);

  const createGameSession = useCreateGameSessionMutation();

  const handleCreateGameSession = async (e: Event) => {
    e.preventDefault();
    try {
      await $createGameSession.mutateAsync({
        partyId,
        gameSessionData: { name: gameSessionName }
      });
      createGameSessionError = undefined;
      formIsOpen = false;
      addToast({
        data: {
          title: `Game session created`,
          type: 'success'
        }
      });
    } catch (e) {
      const error = e as FormMutationError;
      createGameSessionError = error;
      addToast({
        data: {
          title: error.message,
          type: 'danger'
        }
      });
    }
  };

  const handleOpenForm = () => {
    formIsOpen = true;
  };
</script>

{#if !formIsOpen}
  <Panel onclick={handleOpenForm} class="createSessionPanel hover">
    <Title as="p" size="sm">Create new session</Title>
  </Panel>
{:else}
  <Panel class="createSessionPanel">
    <form onsubmit={handleCreateGameSession}>
      <FormControl label="Session name" name="name" errors={createGameSessionError && createGameSessionError.errors}>
        {#snippet input({ inputProps })}
          <Input {...inputProps} bind:value={gameSessionName} autocomplete="off" />
        {/snippet}
      </FormControl>
      <Spacer />
      <Button type="submit">Create</Button>
      <Button type="button" variant="danger" onclick={() => (formIsOpen = false)}>Cancel</Button>
    </form>
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
      min-height: 270px;
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
