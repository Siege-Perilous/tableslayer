<script lang="ts" module>
  import { handleMutation } from '$lib/factories';
  let hiddenFileInput: HTMLInputElement | null = null;
  export const openFileDialog = async () => {
    hiddenFileInput?.click();
  };
</script>

<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  import { useUploadFileMutation, useUpdateSceneMutation } from '$lib/queries';
  let { sceneId, dbName, partyId }: { sceneId: string; dbName: string; partyId: string } = $props();

  const uploadFile = useUploadFileMutation();
  const updateScene = useUpdateSceneMutation();

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const pickedFile = input.files[0];
    input.value = '';

    const uploadedFile = await handleMutation({
      mutation: () => $uploadFile.mutateAsync({ file: pickedFile, folder: 'map' }),
      formLoadingState: () => console.log('Uploading file...'),
      toastMessages: {
        success: { title: 'File uploaded' },
        error: { title: 'Error uploading file', body: (err) => err.message || 'Unknown error' }
      }
    });

    if (!uploadedFile) return;

    await handleMutation({
      mutation: () =>
        $updateScene.mutateAsync({
          dbName,
          sceneId,
          partyId,
          sceneData: {
            mapLocation: uploadedFile.location
          }
        }),
      onSuccess: () => {
        input.value = '';
        invalidateAll();
      },
      formLoadingState: () => console.log('Updating map...'),
      toastMessages: {
        success: { title: 'Map updated' },
        error: { title: 'Error updating map', body: (err) => err.message || 'Unknown error' }
      }
    });
  }
</script>

<input type="file" accept="image/*" bind:this={hiddenFileInput} onchange={handleFileChange} style="display: none;" />
