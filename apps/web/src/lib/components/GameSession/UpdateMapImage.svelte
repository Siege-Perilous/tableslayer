<script lang="ts" module>
  let hiddenFileInput: HTMLInputElement | null = null;
  export const openFileDialog = async () => {
    hiddenFileInput?.click();
  };
</script>

<script lang="ts">
  import { createUpdateSceneMapImageMutation } from '$lib/queries';
  import { addToast } from '@tableslayer/ui';
  import { invalidateAll } from '$app/navigation';
  let { sceneId, dbName }: { sceneId: string; dbName: string } = $props();

  const updateSceneMapImage = createUpdateSceneMapImageMutation();

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const pickedFile = input.files[0];
    input.value = '';

    try {
      await $updateSceneMapImage.mutateAsync({
        sceneId,
        dbName,
        file: pickedFile
      });

      await invalidateAll();

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
