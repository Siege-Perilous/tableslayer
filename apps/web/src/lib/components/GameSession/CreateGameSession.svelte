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
      <Spacer size={6} />
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
