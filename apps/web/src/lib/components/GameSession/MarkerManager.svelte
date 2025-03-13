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
    Editor,
    ConfirmActionButton
  } from '@tableslayer/ui';
  import {
    IconTriangle,
    IconChevronRight,
    IconCircle,
    IconSquare,
    IconPhotoCirclePlus,
    IconArrowBack
  } from '@tabler/icons-svelte';
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
  const markersUnlocked = $derived(stageProps.activeLayer === MapLayerType.Marker);

  // Set editingMarkerIndex when selectedMarker changes
  $effect(() => {
    if (selectedMarker) {
      const index = stageProps.marker.markers.findIndex((marker) => marker.id === selectedMarker?.id);
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
  <div class="markerManager__header">
    <div>
      <FormControl label="Lock" name="isEditing">
        {#snippet input({ inputProps })}
          <RadioButton
            {...inputProps}
            selected={markersUnlocked ? 'true' : 'false'}
            options={[
              { label: 'off', value: 'true' },
              { label: 'on', value: 'false' }
            ]}
            onSelectedChange={(value) => {
              if (value === 'true') {
                stageProps.activeLayer = MapLayerType.Marker;
              } else {
                stageProps.activeLayer = MapLayerType.None;
              }
            }}
          />
        {/snippet}
      </FormControl>
    </div>
    <div>
      <FormControl label="Snap to grid" name="snapToGrid">
        {#snippet input({ inputProps })}
          <RadioButton
            {...inputProps}
            selected={stageProps.marker.snapToGrid.toString()}
            options={[
              { label: 'on', value: 'true' },
              { label: 'off', value: 'false' }
            ]}
            onSelectedChange={(value) => {
              stageProps.marker.snapToGrid = value === 'true';
            }}
          />
        {/snippet}
      </FormControl>
    </div>
  </div>

  <Spacer />
  <div class="markerManager__content">
    {#if editingMarkerIndex !== null}
      <div class="markerManager__editView">
        <div class="markerManager__marker">
          {#if stageProps.marker.markers[editingMarkerIndex]}
            {@const marker = stageProps.marker.markers[editingMarkerIndex]}
            <Button variant="ghost" onclick={backToList} class="markerManager__backButton">
              {#snippet start()}
                <Icon Icon={IconArrowBack} size="1rem" />
              {/snippet}
              View all markers
            </Button>

            <ConfirmActionButton action={() => handleMarkerDelete(marker.id)} actionButtonText="Confirm delete">
              {#snippet trigger({ triggerProps })}
                <Button as="div" variant="danger" {...triggerProps}>Delete marker</Button>
              {/snippet}
              {#snippet actionMessage()}
                hello
              {/snippet}
            </ConfirmActionButton>
            <div class="markerManager__formGrid">
              <FormControl label="Change image" name="imageLocation">
                {#snippet input({ inputProps })}
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
                      <span class="markerManager__imagePreviewLabel">{marker.label}</span>
                      <div class="markerManager__imagePreviewIcon">
                        <Icon Icon={IconPhotoCirclePlus} size="1.5rem" />
                      </div>
                    </button>
                    <input
                      type="file"
                      {...inputProps}
                      id={`marker-image-input-${marker.id}`}
                      accept="image/*"
                      style="display: none;"
                      onchange={(e) => handleMarkerImageUpload(e, marker.id)}
                    />
                  </div>
                {/snippet}
              </FormControl>

              <FormControl label="Visible to" name="visibility">
                {#snippet input(inputProps)}
                  <RadioButton
                    {...inputProps}
                    selected={marker.visibility.toString()}
                    options={[
                      { label: 'Always', value: '0' },
                      { label: 'DM', value: '1' },
                      { label: 'Player', value: '2' }
                    ]}
                    onSelectedChange={(value) => {
                      stageProps.marker.markers[editingMarkerIndex].visibility = Number(value);
                    }}
                  />
                {/snippet}
              </FormControl>
              <FormControl label="Label" name="label">
                {#snippet input(inputProps)}
                  <Input {...inputProps} bind:value={marker.label} maxlength={3} placeholder="ABC" />
                {/snippet}
              </FormControl>
              <FormControl label="Title" name="title">
                {#snippet input(inputProps)}
                  <Input {...inputProps} bind:value={marker.title} />
                {/snippet}
              </FormControl>
            </div>
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
                      stageProps.marker.markers[editingMarkerIndex].size = Number(value);
                    }}
                  />
                {/snippet}
              </FormControl>
            </div>
            <Spacer />
            <Editor debug={false} bind:content={marker.note} />
          {/if}
        </div>
      </div>
    {:else}
      {#each stageProps.marker.markers as marker, index (marker.id)}
        <button
          class="markerManager__listItem"
          onclick={() => selectMarkerForEdit(index)}
          tabindex="0"
          aria-label={`Edit marker ${marker.title}`}
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
            >
              <span class="markerManager__imagePreviewLabel">{marker.label}</span>
            </div>
            <div class="markerManager__title">{marker.title}</div>
            <div class="markerManager__editIcon">
              <Icon Icon={IconChevronRight} size="1rem" />
            </div>
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
    padding: 0 2rem;
    border-radius: 0.25rem;
  }

  .markerManager__listItem:hover .markerManager__editIcon {
    opacity: 1;
  }
  .markerManager__formGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .markerManager__header {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1rem 2rem;
    border-bottom: var(--borderThin);
    position: sticky;
    top: 0;
    width: 100%;
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
    display: block;
    opacity: 1;
    color: #fff;
    filter: drop-shadow(0px 0px 1px rgba(0, 0, 0, 0.5));
  }

  .markerManager__imagePreview:hover .markerManager__imagePreviewLabel {
    display: none;
  }

  .markerManager__imagePreviewIcon {
    opacity: 0;
    display: none;
    transition: opacity 0.2s;
  }
  .markerManager__imagePreviewLabel {
    font-size: 0.875rem;
    font-weight: 900;
    color: #fff;
    -webkit-text-stroke: 1px rgba(0, 0, 0, 0.2);
    text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
  }
  .markerManager__read {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  .markerManager__marker {
    width: 100%;
    padding: 0 2rem;
  }
  .markerManager__editIcon {
    margin-left: auto;
    opacity: 0;
  }
</style>
