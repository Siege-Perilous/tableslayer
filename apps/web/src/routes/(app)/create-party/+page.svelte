<script lang="ts">
  import { Input, FileInput, Button, Title, Spacer, Panel, FormControl, addToast } from '@tableslayer/ui';
  import { useUploadFileMutation, useCreatePartyMutation } from '$lib/queries';
  import type { FormMutationError } from '$lib/factories';
  import { goto } from '$app/navigation';

  let file = $state<FileList | null>(null);
  let partyName = $state('');
  let formIsLoading = $state(false);
  let createPartyError = $state<FormMutationError | undefined>(undefined);

  const uploadFile = useUploadFileMutation();
  const createParty = useCreatePartyMutation();

  const handleCreateParty = async (e: Event) => {
    e.preventDefault();
    formIsLoading = true;
    try {
      let avatarFileId: number | undefined = undefined;

      if (file && file.length) {
        const uploadedFile = await $uploadFile.mutateAsync({
          file: file[0],
          folder: 'avatar'
        });
        avatarFileId = uploadedFile.fileId;
      }

      const response = await $createParty.mutateAsync({
        partyData: {
          name: partyName,
          avatarFileId: avatarFileId
        }
      });

      addToast({
        data: {
          title: 'Party created successfully',
          type: 'success'
        }
      });
      formIsLoading = false;
      goto(`/${response.party.slug}`);
    } catch (e) {
      createPartyError = e as FormMutationError;
      addToast({
        data: {
          title: createPartyError.message,
          type: 'danger'
        }
      });
      formIsLoading = false;
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
        <FileInput {...inputProps} type="file" accept="image/png, image/jpeg" bind:files={file} />
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
