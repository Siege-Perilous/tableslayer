<script lang="ts">
  import {
    Title,
    RadioButton,
    Icon,
    Text,
    type StageProps,
    type Marker,
    FormControl,
    Input,
    ColorPickerSwatch,
    ColorPicker,
    Popover,
    Button
  } from '@tableslayer/ui';
  import { IconTriangle, IconCircle, IconSquare, IconPhoto } from '@tabler/icons-svelte';
  import { useUploadFileMutation, useUpdateMarkerMutation } from '$lib/queries';
  import { handleMutation } from '$lib/factories';
  import { invalidateAll } from '$app/navigation';

  let {
    stageProps = $bindable(),
    selectedMarker,
    partyId = ''
  }: {
    stageProps: StageProps;
    selectedMarker: Marker | undefined;
    partyId: string;
  } = $props();

  let uploadFile = useUploadFileMutation();
  let updateMarker = useUpdateMarkerMutation();
  let activeMarkerId = $state<string | null>(null);
  let formIsLoading = $state(false);

  const openMarkerImageDialog = (markerId: string) => {
    activeMarkerId = markerId;
    const fileInput = document.getElementById(`marker-image-input-${markerId}`) as HTMLInputElement;
    fileInput?.click();
  };

  const handleMarkerImageUpload = async (event: Event, markerId: string) => {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const pickedFile = input.files[0];
    input.value = '';

    formIsLoading = true;

    // Upload the file
    const uploadedFile = await handleMutation({
      mutation: () => $uploadFile.mutateAsync({ file: pickedFile, folder: 'marker' }),
      formLoadingState: (loading) => (formIsLoading = loading),
      toastMessages: {
        success: { title: 'Image uploaded' },
        error: { title: 'Error uploading image', body: (error) => error.message }
      }
    });

    if (!uploadedFile) {
      formIsLoading = false;
      return;
    }

    // Update the marker with the new image location
    await handleMutation({
      mutation: () =>
        $updateMarker.mutateAsync({
          partyId: partyId,
          markerId: markerId,
          markerData: { imageLocation: uploadedFile.location }
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => {
        invalidateAll();
      },
      toastMessages: {
        success: { title: 'Marker image updated' },
        error: { title: 'Error updating marker image', body: (error) => error.message }
      }
    });
  };
</script>

<div class="markerManager">
  <div class="markerManager__header">
    <Title as="h2" size="sm">Markers</Title>
  </div>
  <div>
    <Text>Selected Marker: {selectedMarker ? selectedMarker.name : 'None'}</Text>
  </div>
  <div class="markerManager__content">
    {#if stageProps.marker.markers.length === 0}
      <Text>No markers on this scene</Text>
    {:else}
      {#each stageProps.marker.markers as marker, index (marker.id)}
        <div class="markerManager__marker">
          <div class="markerManager__formGrid">
            <FormControl label="Name" name="name">
              {#snippet input(inputProps)}
                <Input {...inputProps} bind:value={marker.name} />
              {/snippet}
            </FormControl>
            <FormControl label="Abbreviation" name="text">
              {#snippet input(inputProps)}
                <Input {...inputProps} bind:value={marker.text} />
              {/snippet}
            </FormControl>
            <FormControl label="Shape" name="shape">
              {#snippet input(inputProps)}
                <RadioButton
                  {...inputProps}
                  selected={marker.shape.toString()}
                  options={[
                    { label: circle, value: '1' },
                    { label: square, value: '2' },
                    { label: triangle, value: '3' }
                  ]}
                  onSelectedChange={(value) => {
                    stageProps.marker.markers[index].shape = Number(value);
                  }}
                />
              {/snippet}
            </FormControl>
            <FormControl label="Size" name="size">
              {#snippet input(inputProps)}
                <RadioButton
                  {...inputProps}
                  selected={marker.size.toString()}
                  options={[
                    { label: 'S', value: '1' },
                    { label: 'M', value: '2' },
                    { label: 'L', value: '3' }
                  ]}
                  onSelectedChange={(value) => {
                    stageProps.marker.markers[index].size = Number(value);
                  }}
                />
              {/snippet}
            </FormControl>
            <div class="markerManager__colorPicker">
              <FormControl label="Color" name="shapeColor">
                {#snippet start()}
                  <Popover>
                    {#snippet trigger()}
                      <ColorPickerSwatch color={marker.shapeColor} />
                    {/snippet}
                    {#snippet content()}
                      <ColorPicker showOpacity={false} bind:hex={marker.shapeColor} />
                    {/snippet}
                  </Popover>
                {/snippet}
                {#snippet input(inputProps)}
                  <Input {...inputProps} bind:value={marker.shapeColor} />
                {/snippet}
              </FormControl>
            </div>
          </div>

          <div class="markerManager__imageSection">
            {#if marker.imageUrl}
              <div class="markerManager__imagePreview" style:background-image={`url('${marker.imageUrl}')`}>
                <button class="markerManager__changeImageBtn" onclick={() => openMarkerImageDialog(marker.id)}>
                  Change Image
                </button>
              </div>
            {:else}
              <Button
                onclick={() => openMarkerImageDialog(marker.id)}
                isLoading={formIsLoading && activeMarkerId === marker.id}
              >
                {#snippet start()}
                  <Icon Icon={IconPhoto} size="1.25rem" />
                {/snippet}
                Add Image
              </Button>
            {/if}
            <input
              type="file"
              id={`marker-image-input-${marker.id}`}
              accept="image/*"
              style="display: none;"
              onchange={(e) => handleMarkerImageUpload(e, marker.id)}
            />
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

{#snippet circle()}
  <Icon Icon={IconCircle} size="1.25rem" />
{/snippet}
{#snippet triangle()}
  <Icon Icon={IconTriangle} size="1.25rem" />
{/snippet}
{#snippet square()}
  <Icon Icon={IconSquare} size="1.25rem" />
{/snippet}

<style>
  .markerManager {
    padding: 1rem 2rem;
  }
  .markerManager__formGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .markerManager__colorPicker {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .markerManager__imageSection {
    margin-top: 1rem;
    width: 100%;
  }
  .markerManager__imagePreview {
    width: 100%;
    height: 120px;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    background-color: var(--contrastLow);
    border-radius: var(--radius-2);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    position: relative;
  }
  .markerManager__changeImageBtn {
    background: var(--bgSecondary);
    color: var(--fg);
    border: none;
    padding: 0.5rem;
    border-radius: var(--radius-1);
    cursor: pointer;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    opacity: 0.8;
    transition: opacity 0.2s;
  }
  .markerManager__changeImageBtn:hover {
    opacity: 1;
  }
  .markerManager__marker {
    padding: 1rem 0;
    border-bottom: var(--borderThin);
  }
  .markerManager__marker:last-child {
    border-bottom: none;
  }
</style>
