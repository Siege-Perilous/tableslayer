<script lang="ts">
  import {
    RadioButton,
    Icon,
    type StageProps,
    type Marker,
    FormControl,
    Input,
    ColorPickerSwatch,
    ColorPicker,
    Popover,
    Spacer,
    MapLayerType,
    Button,
    Editor
  } from '@tableslayer/ui';
  import { IconTriangle, IconCircle, IconSquare, IconPhotoCirclePlus, IconArrowBack } from '@tabler/icons-svelte';
  import { useUploadFileMutation, useUpdateMarkerMutation, useDeleteMarkerMutation } from '$lib/queries';
  import { handleMutation } from '$lib/factories';
  import { invalidateAll } from '$app/navigation';

  let {
    stageProps = $bindable(),
    selectedMarker = $bindable(),
    partyId = ''
  }: {
    stageProps: StageProps;
    selectedMarker: Marker | undefined;
    partyId: string;
  } = $props();

  const uploadFile = useUploadFileMutation();
  const updateMarker = useUpdateMarkerMutation();
  const deleteMarker = useDeleteMarkerMutation();

  let activeMarkerId = $state<string | null>(null);
  let formIsLoading = $state(false);
  let isEditing = $derived(stageProps.activeLayer === MapLayerType.Marker);
  let editingMarkerIndex = $state<number | null>(null);

  // Set editingMarkerIndex when selectedMarker changes
  $effect(() => {
    if (selectedMarker) {
      // @ts-expect-error - TS doesn't know that the marker is in the array
      const index = stageProps.marker.markers.findIndex((marker) => marker.id === selectedMarker.id);
      if (index !== -1) {
        editingMarkerIndex = index;
      }
    }
  });

  const openMarkerImageDialog = (markerId: string) => {
    activeMarkerId = markerId;
    const fileInput = document.getElementById(`marker-image-input-${markerId}`) as HTMLInputElement;
    fileInput?.click();
  };

  const selectMarkerForEdit = (index: number) => {
    editingMarkerIndex = index;
    selectedMarker = stageProps.marker.markers[index];
  };

  const backToList = () => {
    editingMarkerIndex = null;
    selectedMarker = undefined;
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

  const toggleMarkerEditing = () => {
    if (isEditing) {
      stageProps.activeLayer = MapLayerType.None;
    } else {
      stageProps.activeLayer = MapLayerType.Marker;
    }
  };

  const handleMarkerDelete = async (markerId: string) => {
    await handleMutation({
      mutation: () => $deleteMarker.mutateAsync({ partyId: partyId, markerId: markerId }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => {
        editingMarkerIndex = null;
        selectedMarker = undefined;
        invalidateAll();
      },
      toastMessages: {
        success: { title: 'Marker deleted' },
        error: { title: 'Error deleting marker', body: (error) => error.message }
      }
    });
  };
</script>

<div class="markerManager">
  <Button onclick={toggleMarkerEditing}>
    {#if isEditing}
      Editing is on
    {:else}
      Editing is off
    {/if}
  </Button>
  <Spacer />
  <div class="markerManager__content">
    {#if editingMarkerIndex !== null}
      <div class="markerManager__editView">
        <Button onclick={backToList} class="markerManager__backButton">
          <Icon Icon={IconArrowBack} size="1rem" />
          Back to list
        </Button>
        <div class="markerManager__marker">
          {#if stageProps.marker.markers[editingMarkerIndex]}
            {@const marker = stageProps.marker.markers[editingMarkerIndex]}
            <Button onclick={() => handleMarkerDelete(marker.id)} variant="danger">Delete marker</Button>
            <div class="markerManager__formGrid">
              <div class="markerManager__imageSection">
                <button
                  onclick={() => openMarkerImageDialog(marker.id)}
                  class={[
                    'markerManager__imagePreview',
                    formIsLoading && activeMarkerId === marker.id && 'markerManager__imagePreview--isLoading',
                    `markerManager__imagePreview--${marker.shape}`
                  ]}
                  aria-label="Change marker image"
                  style:background-color={marker.shapeColor}
                  style:background-image={`url('${marker.imageUrl}')`}
                >
                  <div class="markerManager__imagePreviewIcon">
                    <Icon Icon={IconPhotoCirclePlus} size="1.5rem" />
                  </div>
                </button>
                <input
                  type="file"
                  id={`marker-image-input-${marker.id}`}
                  accept="image/*"
                  style="display: none;"
                  onchange={(e) => handleMarkerImageUpload(e, marker.id)}
                />
              </div>
              <FormControl label="Label" name="text">
                {#snippet input(inputProps)}
                  <Input {...inputProps} bind:value={marker.text} />
                {/snippet}
              </FormControl>
            </div>
            <Spacer />
            <FormControl label="Name" name="name">
              {#snippet input(inputProps)}
                <Input {...inputProps} bind:value={marker.name} />
              {/snippet}
            </FormControl>
            <Spacer />
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
            <Spacer />
            <div class="markerManager__formGrid">
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
                      // @ts-expect-error - TS doesn't know that the marker is in the array
                      stageProps.marker.markers[editingMarkerIndex].shape = Number(value);
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
                      // @ts-expect-error - TS doesn't know that the marker is in the array
                      stageProps.marker.markers[editingMarkerIndex].size = Number(value);
                    }}
                  />
                {/snippet}
              </FormControl>
            </div>
            <Spacer />
            <Editor bind:content={marker.note} height="300px" />
          {/if}
        </div>
      </div>
    {:else}
      {#each stageProps.marker.markers as marker, index (marker.id)}
        <button
          class="markerManager__listItem"
          onclick={() => selectMarkerForEdit(index)}
          tabindex="0"
          aria-label={`Edit marker ${marker.name}`}
        >
          <div class="markerManager__read">
            <div
              class={[
                'markerManager__imagePreview',
                formIsLoading && activeMarkerId === marker.id && 'markerManager__imagePreview--isLoading',
                `markerManager__imagePreview--${marker.shape}`
              ]}
              style:background-color={marker.shapeColor}
              style:background-image={`url('${marker.imageUrl}')`}
            ></div>
            <div class="markerManager__name">{marker.name}</div>
          </div>
        </button>
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
  .markerManager__content {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: 1rem;
  }
  .markerManager__editView {
    grid-column: 1 / -1;
  }
  .markerManager__listItem {
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.25rem;
    transition: background-color 0.2s;
  }
  .markerManager__listItem:hover {
    background-color: var(--contrastLow);
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
    width: 100%;
  }
  .markerManager__imagePreview {
    min-width: 2.5rem;
    width: 2.5rem;
    min-height: 2.5rem;
    min-height: 2.5rem;
    filter: drop-shadow(0px 0px 1px rgba(0, 0, 0, 0.5));
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    background-color: var(--contrastLow);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
  }
  .markerManager__imagePreview:before {
    position: absolute;
    content: '';
    display: block;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .markerManager__imagePreview--1 {
    border-radius: 50%;
  }
  .markerManager__imagePreview--2 {
    border-radius: 0;
  }
  .markerManager__imagePreview--3 {
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  }

  .markerManager__imagePreview:hover .markerManager__imagePreviewIcon {
    opacity: 1;
    color: #fff;
    filter: drop-shadow(0px 0px 1px rgba(0, 0, 0, 0.5));
  }
  .markerManager__imagePreviewIcon {
    opacity: 0;
    transition: opacity 0.2s;
  }
  .markerManager__read {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  .markerManager__marker {
    width: 100%;
    max-width: 32rem;
  }
</style>
