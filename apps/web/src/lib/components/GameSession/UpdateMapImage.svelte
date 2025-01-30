<script lang="ts" module>
  let hiddenFileInput: HTMLInputElement | null = null;
  export const openFileDialog = async () => {
    hiddenFileInput?.click();
  };
</script>

<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  import { useUploadFileMutation, useUpdateSceneMutation } from '$lib/queries';
  import { addToast } from '@tableslayer/ui';
  let { sceneId, dbName, partyId }: { sceneId: string; dbName: string; partyId: string } = $props();

  const uploadFile = useUploadFileMutation();
  const updateScene = useUpdateSceneMutation();

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const pickedFile = input.files[0];
    input.value = '';

    try {
      const uploadedFile = await $uploadFile.mutateAsync({
        file: pickedFile,
        folder: 'map'
      });

      await $updateScene.mutateAsync({
        dbName,
        sceneId,
        partyId,
        sceneData: {
          mapLocation: uploadedFile.location
        }
      });

      input.value = '';
      invalidateAll();
      addToast({
        data: {
          title: 'Map updated',
          type: 'success'
        }
      });
    } catch (error: unknown) {
      console.error('Error uploading map image:', error);
      addToast({
        data: {
          title: 'Error updating map',
          body: error instanceof Error ? error.message : 'Unknown error',
          type: 'danger'
        }
      });
    }
  }
</script>

<input type="file" accept="image/*" bind:this={hiddenFileInput} onchange={handleFileChange} style="display: none;" />
