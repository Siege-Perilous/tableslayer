<script lang="ts">
  import {
    Panel,
    FormControl,
    Title,
    Input,
    Button,
    Spacer,
    Text,
    FileInput,
    addToast,
    Link,
    Hr
  } from '@tableslayer/ui';
  import { useCreateGameSessionMutation } from '$lib/queries';
  import type { FormMutationError } from '$lib/factories';
  import { handleMutation } from '$lib/factories';
  import { invalidateAll } from '$app/navigation';
  import { importGameSession } from '$lib/utils';
  import { devError } from '$lib/utils/debug';

  let {
    partyId
  }: {
    partyId: string;
  } = $props();
  let formIsOpen = $state(false);
  let importIsOpen = $state(false);
  let gameSessionName = $state('');
  let importSessionName = $state('Imported Game Session');
  let selectedFile = $state<File | null>(null);
  let createGameSessionError = $state<FormMutationError | undefined>(undefined);
  let importIsLoading = $state(false);

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
    importIsOpen = false;
  };

  const handleOpenImport = () => {
    importIsOpen = true;
    formIsOpen = false;
    selectedFile = null;
    importSessionName = 'Imported Game Session';
  };

  const handleFileSelect = (event: CustomEvent<File>) => {
    selectedFile = event.detail;
  };

  const handleImport = async (e: Event) => {
    e.preventDefault();

    if (!selectedFile) {
      addToast({
        data: {
          title: 'Please select a file',
          body: 'You must select a file to import',
          type: 'danger'
        }
      });
      return;
    }

    if (!importSessionName.trim()) {
      return;
    }

    try {
      importIsLoading = true;

      // Read the file to modify its contents with the new name
      const fileContent = await selectedFile.text();

      const importData = JSON.parse(fileContent);

      // Update the name in the JSON
      importData.gameSession.name = importSessionName.trim();

      // Create a new file with the modified content
      const modifiedFile = new File([JSON.stringify(importData)], selectedFile.name, { type: 'application/json' });

      // Import the game session
      await importGameSession(partyId, modifiedFile);

      // Close the import form and refresh data
      importIsOpen = false;
      invalidateAll();

      // Show success message
      addToast({
        data: {
          title: 'Game session imported',
          body: `${importSessionName} has been imported successfully`,
          type: 'success'
        }
      });
    } catch (error) {
      devError('Import error:', error);
      // Determine the error message - get specific error from our errorData if available
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        // @ts-expect-error - Custom property added to Error
        const errorData = error.errorData;
        errorMessage = error.message;

        // If we have errorData from our API response, use it directly since it's properly structured
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      }

      addToast({
        data: {
          title: 'Error importing game session',
          body: errorMessage,
          type: 'danger'
        }
      });
    } finally {
      importIsLoading = false;
    }
  };
</script>

{#if !formIsOpen && !importIsOpen}
  <Panel role="button" class="createSessionPanel createSessionPanel--hover" tabindex={0} onclick={handleOpenForm}>
    <Title as="p" size="sm">Create a new session</Title>
    <Text size="0.875rem" color="var(--fgMuted)">Create a game session from scratch</Text>
  </Panel>
{:else if formIsOpen}
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
      <Spacer size="1.5rem" />
      <Hr />
      <Spacer />
      <Text size="0.875rem" color="var(--fgMuted)">Or, you can optionally</Text>
      <Text><Link onclick={handleOpenImport}>Provide an import file</Link></Text>
    </form>
  </Panel>
{:else if importIsOpen}
  <Panel class="createSessionPanel">
    <div>
      <form onsubmit={handleImport}>
        <FormControl label="Session name" name="importName">
          {#snippet input({ inputProps })}
            <Input {...inputProps} bind:value={importSessionName} autocomplete="off" disabled={importIsLoading} />
          {/snippet}
        </FormControl>
        <Spacer />
        <FileInput
          files={null}
          name="importFile"
          accept=".json"
          showPreviews={false}
          on:fileSelect={handleFileSelect}
          disabled={importIsLoading}
        />
        <Spacer />

        <Button type="submit" disabled={importIsLoading} isLoading={importIsLoading}>Import</Button>
        <Button type="button" variant="danger" onclick={() => (importIsOpen = false)} disabled={importIsLoading}>
          Cancel
        </Button>
      </form>
    </div>
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
      min-height: 270px;
      transition: border-color 0.2s var(--ease-in-2);
      align-items: center;
      justify-content: center;
    }
    .panel.createSessionPanel.createSessionPanel--hover:hover {
      border-color: var(--fgPrimary);
      cursor: pointer;
    }
  }
</style>
