<script lang="ts" module>
  import { handleMutation } from '$lib/factories';
  let hiddenFileInput: HTMLInputElement | null = null;
  export const openFileDialog = async () => {
    console.log('openFileDialog called, hiddenFileInput:', hiddenFileInput);
    if (hiddenFileInput) {
      hiddenFileInput.click();
    } else {
      console.warn('hiddenFileInput not available yet');
      // Try again after a short delay to allow for component rendering
      setTimeout(() => {
        console.log('Retry openFileDialog, hiddenFileInput:', hiddenFileInput);
        hiddenFileInput?.click();
      }, 100);
    }
  };
</script>

<script lang="ts">
  import { useUploadFileMutation, useUpdateSceneMutation } from '$lib/queries';
  import { hasThumb, generateLargeImageUrl } from '$lib/utils';
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

    // Ensure we have a valid sceneId before processing
    if (!sceneId) {
      console.warn('No sceneId provided, cannot update map image');
      input.value = '';
      return;
    }

    console.log('Processing map image upload for scene:', sceneId);
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
          console.log('[UpdateMapImage] Map updated successfully:', {
            sceneName: updatedScene.name,
            sceneId: updatedScene.id,
            newMapLocation: updatedScene.mapLocation,
            hasThumb: hasThumb(updatedScene),
            thumbUrl: hasThumb(updatedScene) ? updatedScene.thumb.resizedUrl : null
          });
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

          // Also update the stageProps with the new map URL so Stage components re-render
          const currentSceneData = partyData.getSceneData(sceneId);
          if (currentSceneData && currentSceneData.stageProps && updatedScene.mapLocation) {
            const newMapUrl = generateLargeImageUrl(updatedScene.mapLocation);
            const updatedStageProps = {
              ...currentSceneData.stageProps,
              map: {
                ...currentSceneData.stageProps.map,
                url: newMapUrl
              }
            };
            partyData.updateSceneStageProps(sceneId, updatedStageProps);
            console.log('[UpdateMapImage] Updated stageProps map URL for Stage sync:', {
              sceneId,
              oldUrl: currentSceneData.stageProps.map.url,
              newUrl: newMapUrl,
              mapLocation: updatedScene.mapLocation
            });
          }
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
