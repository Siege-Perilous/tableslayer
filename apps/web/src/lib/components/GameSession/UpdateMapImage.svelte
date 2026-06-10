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
  import { useUploadFileMutation } from '$lib/queries';
  import type { SceneSettings, SessionDocClient } from '$lib/realtime';
  import { resetGridOrigin } from '$lib/utils';
  import { extractDimensionsFromFilename } from '$lib/utils/gridDimensions';
  import { GridMode } from '@tableslayer/stage';

  let {
    sceneId,
    client
  }: {
    sceneId: string;
    client: SessionDocClient | null;
  } = $props();

  const uploadFile = useUploadFileMutation();

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    if (!sceneId || !client) {
      devWarn('No sceneId/client available, cannot update map image');
      input.value = '';
      return;
    }

    const pickedFile = input.files[0];
    input.value = '';

    const currentMapLocation = client.scene(sceneId)?.settings.mapLocation ?? null;

    const uploadedFile = await handleMutation({
      mutation: () =>
        uploadFile.mutateAsync({
          file: pickedFile,
          folder: 'map',
          id: sceneId,
          currentUrl: currentMapLocation
        }),
      formLoadingState: () => {},
      toastMessages: {
        success: { title: 'Map updated' },
        error: { title: 'Error uploading file', body: (err) => err.message || 'Unknown error' }
      }
    });

    if (!uploadedFile) return;

    // The doc is the source of truth — one settings write propagates the new
    // map (and grid mode) to every client and the persister.
    const settings: Partial<SceneSettings> = { mapLocation: uploadedFile.location };
    const dimensions = extractDimensionsFromFilename(pickedFile.name);
    if (dimensions.width !== undefined && dimensions.height !== undefined) {
      settings.gridMode = GridMode.MapDefined;
      settings.gridMapDefinedX = dimensions.width;
      settings.gridMapDefinedY = dimensions.height;
      resetGridOrigin();
    }
    client.write.setSceneSettings(sceneId, settings);
  }
</script>

<input
  type="file"
  accept="image/*,video/*,.gif,.mp4,.webm,.mov,.avi"
  bind:this={hiddenFileInput}
  onchange={handleFileChange}
  style="display: none;"
/>
