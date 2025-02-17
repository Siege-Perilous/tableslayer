<script lang="ts">
  import { Input, FileInput, Button, Title, Spacer, Panel, FormControl } from '@tableslayer/ui';
  import { useUploadFileMutation, useCreatePartyMutation } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  import { goto } from '$app/navigation';

  let file = $state<FileList | null>(null);
  let partyName = $state('');
  let formIsLoading = $state(false);
  let createPartyError = $state<FormMutationError | undefined>(undefined);

  const uploadFile = useUploadFileMutation();
  const createParty = useCreatePartyMutation();

  const handleCreateParty = async (e: Event) => {
    e.preventDefault();
    let avatarFileId: number | undefined = undefined;
    if (file && file.length) {
      const uploadedFile = await handleMutation({
        mutation: () => $uploadFile.mutateAsync({ file: file![0], folder: 'avatar' }),
        formLoadingState: (loading) => (formIsLoading = loading),
        toastMessages: {
          success: { title: 'Image uploaded' },
          error: { title: 'Error uploading image', body: (error) => error.message }
        }
      });

      if (!uploadedFile) return;
      avatarFileId = uploadedFile.fileId;
    }

    const response = await handleMutation({
      mutation: () =>
        $createParty.mutateAsync({
          partyData: { name: partyName, avatarFileId }
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => (createPartyError = error),
      toastMessages: {
        success: { title: 'Party created successfully' },
        error: { title: 'Error creating party', body: (error) => error.message }
      }
    });

    if (response) {
      goto(`/${response.party.slug}`);
    }
  };
</script>

<Panel class="createPartyPanel">
  <Title as="h1" size="md" data-testid="createParty">Create a new party</Title>
  <Spacer size={8} />
  <form onsubmit={handleCreateParty}>
    <FormControl label="Party name" name="name" errors={createPartyError && createPartyError.errors}>
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="text" bind:value={partyName} hideAutocomplete />
      {/snippet}
    </FormControl>
    <Spacer />
    <FormControl label="Party avatar" name="avatar" errors={createPartyError && createPartyError.errors}>
      {#snippet input({ inputProps })}
        <FileInput {...inputProps} type="file" accept="image/*" bind:files={file} />
      {/snippet}
    </FormControl>
    <Spacer />
    <Button data-testid="createPartySubmit" disabled={formIsLoading} isLoading={formIsLoading}>Create party</Button>
  </form>
  <Spacer />
</Panel>

<style>
  :global(.panel.createPartyPanel) {
    display: flex;
    flex-direction: column;
    max-width: var(--contain-smallForm);
    padding: var(--size-8);
    margin: 20vh auto auto auto;
  }
</style>
