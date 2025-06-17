<script lang="ts" module>
  import { handleMutation } from '$lib/factories';
  let hiddenFileInput: HTMLInputElement | null = null;
  export const openFileDialog = async () => {
    hiddenFileInput?.click();
  };
</script>

<script lang="ts">
  import { useUploadFileMutation, useUpdateSceneMutation } from '$lib/queries';
  import { hasThumb } from '$lib/utils';
  import type { usePartyData } from '$lib/utils/yjs/stores';

  let {
    sceneId,
    partyId,
    partyData
  }: {
    sceneId: string;
    partyId: string;
    partyData: ReturnType<typeof usePartyData> | null;
  } = $props();

  const uploadFile = useUploadFileMutation();
  const updateScene = useUpdateSceneMutation();

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const pickedFile = input.files[0];
    input.value = '';

    const uploadedFile = await handleMutation({
      mutation: () => $uploadFile.mutateAsync({ file: pickedFile, folder: 'map' }),
      formLoadingState: () => {},
      toastMessages: {
        success: { title: 'File uploaded' },
        error: { title: 'Error uploading file', body: (err) => err.message || 'Unknown error' }
      }
    });

    if (!uploadedFile) return;

    await handleMutation({
      mutation: () =>
        $updateScene.mutateAsync({
          sceneId,
          partyId,
          sceneData: {
            mapLocation: uploadedFile.location
          }
        }),
      onSuccess: (response) => {
        input.value = '';
        // Update Y.js with the updated scene data instead of invalidateAll()
        if (partyData && response?.scene) {
          const updatedScene = response.scene;
          console.log('Map updated successfully, updating Y.js:', updatedScene.name);
          partyData.updateScene(sceneId, {
            mapLocation: updatedScene.mapLocation || undefined,
            mapThumbLocation: updatedScene.mapThumbLocation || undefined,
            thumb: hasThumb(updatedScene)
              ? {
                  resizedUrl: updatedScene.thumb.resizedUrl,
                  originalUrl: updatedScene.thumb.url
                }
              : undefined
          });
        } else {
          console.warn(
            'Cannot update scene in Y.js - partyData not available or response missing scene:',
            !!partyData,
            !!response?.scene
          );
        }
      },
      formLoadingState: () => {},
      toastMessages: {
        success: { title: 'Map updated' },
        error: { title: 'Error updating map', body: (err) => err.message || 'Unknown error' }
      }
    });
  }
</script>

<input type="file" accept="image/*" bind:this={hiddenFileInput} onchange={handleFileChange} style="display: none;" />
