<script lang="ts">
  import { Panel, FormControl, Title, Input, Button, Spacer, Text, FileInput, addToast } from '@tableslayer/ui';
  import { useCreateGameSessionMutation } from '$lib/queries';
  import type { FormMutationError } from '$lib/factories';
  import { handleMutation } from '$lib/factories';
  import { invalidateAll } from '$app/navigation';
  import { importGameSession } from '$lib/utils';
  import { IconUpload, IconPlus } from '@tabler/icons-svelte';

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
  let importNameError = $state<string | undefined>(undefined);
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
    importNameError = undefined;
  };

  const handleFileSelect = (event: CustomEvent<File>) => {
    console.log('File selected:', event.detail);
    selectedFile = event.detail;
  };

  const handleImport = async (e: Event) => {
    e.preventDefault();
    console.log('Import form submitted', { selectedFile, importSessionName });

    if (!selectedFile) {
      console.log('No file selected');
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
      console.log('No session name provided');
      importNameError = 'Session name is required';
      return;
    }

    try {
      importIsLoading = true;
      console.log('Starting import process');

      // Read the file to modify its contents with the new name
      const fileContent = await selectedFile.text();
      console.log('File content read');

      const importData = JSON.parse(fileContent);
      console.log('JSON parsed', { gameSessionName: importData.gameSession?.name });

      // Update the name in the JSON
      importData.gameSession.name = importSessionName.trim();

      // Create a new file with the modified content
      const modifiedFile = new File([JSON.stringify(importData)], selectedFile.name, { type: 'application/json' });
      console.log('Modified file created');

      // Import the game session
      console.log('Calling importGameSession');
      await importGameSession(partyId, modifiedFile);
      console.log('Import completed successfully');

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
      console.error('Import error:', error);
      addToast({
        data: {
          title: 'Error importing game session',
          body: error instanceof Error ? error.message : 'An unknown error occurred',
          type: 'danger'
        }
      });
    } finally {
      importIsLoading = false;
    }
  };
</script>

{#if !formIsOpen && !importIsOpen}
  <Panel class="createSessionPanel selection-panel">
    <div class="selection-options">
      <div class="selection-option" onclick={handleOpenForm} role="button" tabindex={0}>
        <div class="selection-icon create-icon">
          <IconPlus size={32} />
        </div>
        <Title as="p" size="sm">Create a new session</Title>
        <Text size="0.875rem" color="var(--fgMuted)">Create a game session from scratch</Text>
      </div>

      <div class="selection-option" onclick={handleOpenImport} role="button" tabindex={0}>
        <div class="selection-icon import-icon">
          <IconUpload size={32} />
        </div>
        <Title as="p" size="sm">Import a session</Title>
        <Text size="0.875rem" color="var(--fgMuted)">Import from a previously exported file</Text>
      </div>
    </div>
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
    </form>
  </Panel>
{:else if importIsOpen}
  <Panel class="createSessionPanel">
    <Title as="h3" size="sm">Import Game Session</Title>
    <Spacer />
    <form onsubmit={handleImport}>
      <Text>Select a previously exported game session file (.json)</Text>
      <Spacer />
      <FileInput
        label="Select file"
        name="importFile"
        accept=".json"
        showPreviews={false}
        on:fileSelect={handleFileSelect}
        disabled={importIsLoading}
      />
      <Spacer size={2} />

      <FormControl
        label="Game Session Name"
        name="importName"
        errors={importNameError ? [{ path: ['name'], message: importNameError }] : undefined}
      >
        {#snippet input({ inputProps })}
          <Input {...inputProps} bind:value={importSessionName} autocomplete="off" disabled={importIsLoading} />
        {/snippet}
      </FormControl>
      <Spacer />

      <Text size="0.875rem" color="var(--fgMuted)">
        Imported game sessions will have new IDs assigned to prevent conflicts
      </Text>
      <Spacer />

      <div class="import-buttons">
        <Button type="submit" disabled={importIsLoading || !selectedFile} isLoading={importIsLoading}>Import</Button>
        <Button type="button" variant="danger" onclick={() => (importIsOpen = false)} disabled={importIsLoading}>
          Cancel
        </Button>
      </div>
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

  .selection-options {
    display: flex;
    gap: 1.5rem;
    width: 100%;
  }

  .selection-option {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1.5rem;
    border-radius: 0.5rem;
    border: 1px solid var(--borderStandard);
    cursor: pointer;
    transition: border-color 0.2s var(--ease-in-2);
  }

  .selection-option:hover {
    border-color: var(--fgPrimary);
  }

  .selection-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    margin-bottom: 1rem;
  }

  .create-icon {
    background-color: var(--fgSuccess);
    color: var(--bgSuccess);
  }

  .import-icon {
    background-color: var(--fgPrimary);
    color: var(--bgPrimary);
  }

  .import-buttons {
    display: flex;
    gap: 0.5rem;
  }
</style>
