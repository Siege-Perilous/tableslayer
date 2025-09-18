<script lang="ts" module>
  import { handleMutation } from '$lib/factories';
  import { devWarn } from '$lib/utils/debug';
  let hiddenFileInput: HTMLInputElement | null = null;
  export const openFileDialog = async () => {
    if (hiddenFileInput) {
      hiddenFileInput.click();
    } else {
      devWarn('hiddenFileInput not available yet');
      // Try again after a short delay to allow for component rendering
      setTimeout(() => {
        hiddenFileInput?.click();
      }, 100);
    }
  };
</script>

<script lang="ts">
  import { useUploadFileMutation, useUpdateSceneMutation } from '$lib/queries';
  import { GridMode } from '@tableslayer/ui';
  import { hasThumb, generateLargeImageUrl } from '$lib/utils';
  import type { usePartyData } from '$lib/utils/yjs/stores';
  import { extractDimensionsFromFilename } from '$lib/utils/gridDimensions';

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
      devWarn('No sceneId provided, cannot update map image');
      input.value = '';
      return;
    }

    const pickedFile = input.files[0];
    input.value = '';

    // Get current map location from Y.js scenes list if available
    const currentMapLocation = partyData?.getScenesList()?.find((s) => s.id === sceneId)?.mapLocation || null;

    const uploadedFile = await handleMutation({
      mutation: () =>
        $uploadFile.mutateAsync({
          file: pickedFile,
          folder: 'map',
          id: sceneId,
          currentUrl: currentMapLocation
        }),
      formLoadingState: () => {},
      toastMessages: {
        success: { title: 'File uploaded' },
        error: { title: 'Error uploading file', body: (err) => err.message || 'Unknown error' }
      }
    });

    if (!uploadedFile) return;

    // Extract dimensions from filename
    const dimensions = extractDimensionsFromFilename(pickedFile.name);

    // Prepare scene update data
    const sceneUpdateData: any = {
      mapLocation: uploadedFile.location
    };

    // If dimensions are found, set Fixed Count mode
    if (dimensions.width !== undefined && dimensions.height !== undefined) {
      sceneUpdateData.gridMode = GridMode.MapDefined;
      sceneUpdateData.gridMapDefinedX = dimensions.width;
      sceneUpdateData.gridMapDefinedY = dimensions.height;
    }

    await handleMutation({
      mutation: () =>
        $updateScene.mutateAsync({
          sceneId,
          partyId,
          sceneData: sceneUpdateData
        }),
      onSuccess: (response) => {
        input.value = '';
        // Update Y.js with the updated scene data instead of invalidateAll()
        if (partyData && response?.scene) {
          const updatedScene = response.scene;
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
          }
        } else {
          devWarn(
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

<input
  type="file"
  accept="image/*,video/*,.gif,.mp4,.webm,.mov,.avi"
  bind:this={hiddenFileInput}
  onchange={handleFileChange}
  style="display: none;"
/>
