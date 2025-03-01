<script lang="ts">
  import { Panel, FormControl, Title, Input, Button, Spacer, Text } from '@tableslayer/ui';
  import { useCreateGameSessionMutation } from '$lib/queries';
  import type { FormMutationError } from '$lib/factories';
  import { handleMutation } from '$lib/factories';
  import { invalidateAll } from '$app/navigation';

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
    await handleMutation({
      mutation: () =>
        $createGameSession.mutateAsync({
          partyId,
          gameSessionData: { name: gameSessionName }
        }),
      formLoadingState: () => {},
      onError: (err) => {
        createGameSessionError = err;
      },
      onSuccess: () => {
        createGameSessionError = undefined;
        formIsOpen = false;
        invalidateAll();
      },
      toastMessages: {
        success: { title: 'Game session created' },
        error: { title: 'Error creating game session', body: (err) => err.message }
      }
    });
  };

  const handleOpenForm = () => {
    formIsOpen = true;
  };
</script>

{#if !formIsOpen}
  <Panel onclick={handleOpenForm} class="createSessionPanel hover">
    <Title as="p" size="sm">Create a new session</Title>
    <Text size="0.875rem" color="var(--fgMuted)">Game sessions contain a collection of battle scenes</Text>
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
      gap: 1rem;
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
