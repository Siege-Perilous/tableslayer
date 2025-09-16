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
    Button,
    Link,
    Editor,
    ConfirmActionButton,
    IconButton,
    Loader,
    MarkerVisibility,
    MarkerShape,
    MarkerSize,
    Label,
    Text,
    MapLayerType
  } from '@tableslayer/ui';
  import {
    IconTriangle,
    IconTrash,
    IconCircle,
    IconSquare,
    IconPhotoCirclePlus,
    IconArrowBack,
    IconEye,
    IconEyeOff,
    IconX,
    IconPokerChip,
    IconHandFinger,
    IconLocationPin
  } from '@tabler/icons-svelte';
  import { useUploadFileMutation, useDeleteMarkerMutation } from '$lib/queries';
  import { queuePropertyUpdate, extractLocationFromUrl, throttle } from '$lib/utils';
  import { handleMutation } from '$lib/factories';

  let {
    stageProps,
    selectedMarkerId = $bindable(),
    partyId = '',
    handleSelectActiveControl,
    socketUpdate,
    updateMarkerAndSave,
    onMarkerDeleted,
    pinnedMarkerIds = [],
    onPinToggle
  }: {
    stageProps: StageProps;
    selectedMarkerId: string | undefined;
    partyId: string;
    handleSelectActiveControl: (control: string) => void;
    socketUpdate: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateMarkerAndSave: (markerId: string, updateFn: (marker: any) => void) => void;
    onMarkerDeleted?: (markerId: string) => void;
    pinnedMarkerIds?: string[];
    onPinToggle?: (markerId: string, pinned: boolean) => void;
  } = $props();

  const uploadFile = useUploadFileMutation();
  const deleteMarker = useDeleteMarkerMutation();

  let activeMarkerId = $state<string | null>(null);
  let formIsLoading = $state(false);
  let editingMarkerId = $derived(selectedMarkerId);

  // Create throttled update function for editor changes
  const throttledNoteUpdate = throttle((markerId: string) => {
    updateMarkerAndSave(markerId, () => {});
    socketUpdate();
  }, 500);

  const openMarkerImageDialog = (markerId: string) => {
    activeMarkerId = markerId;
    const fileInput = document.getElementById(`marker-image-input-${markerId}`) as HTMLInputElement;
    fileInput?.click();
  };

  const selectMarkerForEdit = (markerId: string) => {
    selectedMarkerId = markerId;
  };

  const backToList = () => {
    selectedMarkerId = undefined;
  };

  const handleMarkerImageUpload = async (event: Event, markerId: string) => {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const pickedFile = input.files[0];
    input.value = '';

    formIsLoading = true;

    // Find the current marker to get its existing image URL
    const currentMarker = stageProps.marker.markers.find((m) => m.id === markerId);
    const currentImageLocation = currentMarker?.imageUrl ? extractLocationFromUrl(currentMarker.imageUrl) : null;

    // Upload the file
    const uploadedFile = await handleMutation({
      mutation: () =>
        $uploadFile.mutateAsync({
          file: pickedFile,
          folder: 'marker',
          id: markerId,
          currentUrl: currentImageLocation
        }),
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

    const newFileUrl = `https://files.tableslayer.com/cdn-cgi/image/w=512,h=512,fit=cover,gravity=auto/${uploadedFile.location}`;
    updateMarkerAndSave(markerId, (marker) => {
      marker.imageUrl = newFileUrl;
    });
  };

  const handleMarkerDelete = async (markerId: string) => {
    await handleMutation({
      mutation: () => $deleteMarker.mutateAsync({ partyId: partyId, markerId: markerId }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => {
        // Call the deletion callback if provided (for Y.js sync)
        // The callback will handle removing the marker from stageProps
        if (onMarkerDeleted) {
          onMarkerDeleted(markerId);
        } else {
          // Fallback - only update locally if no callback provided
          const updatedMarkers = stageProps.marker.markers.filter((marker) => marker.id !== markerId);
          stageProps.marker.markers = updatedMarkers;
          queuePropertyUpdate(stageProps, ['marker', 'markers'], updatedMarkers, 'marker');
        }

        // Reset selected marker if we just deleted it
        if (selectedMarkerId === markerId) {
          selectedMarkerId = undefined;
        }
      },
      toastMessages: {
        success: { title: 'Marker deleted' },
        error: { title: 'Error deleting marker', body: (error) => error.message }
      }
    });
  };
</script>

{#snippet imagePreview(marker: Marker, inputProps = {})}
  <div class="markerManager__image">
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
    {#if formIsLoading}
      <Loader />
    {:else if marker.imageUrl !== null}
      <div class="markerManager__imageRemove">
        <IconButton variant="ghost" onclick={() => updateMarkerAndSave(marker.id, (m) => (m.imageUrl = null))}>
          <Icon Icon={IconX} size="1.25rem" />
        </IconButton>
      </div>
    {/if}
    <input
      type="file"
      {...inputProps}
      id={`marker-image-input-${marker.id}`}
      accept="image/*"
      style="display: none;"
      disabled={formIsLoading}
      onchange={(e) => handleMarkerImageUpload(e, marker.id)}
    />
  </div>
{/snippet}

<div class="markerManager">
  <div class="markerManager__header">
    <Label>Snap to grid</Label>
    <RadioButton
      selected={stageProps.marker.snapToGrid.toString()}
      options={[
        { label: 'on', value: 'true' },
        { label: 'off', value: 'false' }
      ]}
      onSelectedChange={(value) => {
        queuePropertyUpdate(stageProps, ['marker', 'snapToGrid'], value === 'true', 'control');
      }}
    />
  </div>
  <div class="markerManager__content">
    {#if editingMarkerId !== undefined}
      <Link onclick={backToList} class="markerManager__backButton">
        List all markers
        <Icon Icon={IconArrowBack} size="1rem" />
      </Link>
      <div class="markerManager__editView">
        <div class="markerManager__marker">
          {#if stageProps.marker.markers}
            {#each stageProps.marker.markers.filter((m) => m.id === editingMarkerId) as marker (marker.id)}
              <!-- Forces rerender if ID changes -->
              <Spacer />
              <div class="markerManager__formGrid">
                <FormControl label="Change image" name="imageLocation">
                  {#snippet input({ inputProps })}
                    {@render imagePreview(marker, inputProps)}
                  {/snippet}
                </FormControl>

                <div class="markerManager__colorPicker">
                  <FormControl label="Background color" name="shapeColor">
                    {#snippet start()}
                      <Popover>
                        {#snippet trigger()}
                          <ColorPickerSwatch color={marker.shapeColor} />
                        {/snippet}
                        {#snippet content()}
                          <ColorPicker
                            showOpacity={false}
                            hex={marker.shapeColor}
                            onUpdate={(colorData) =>
                              updateMarkerAndSave(marker.id, (m) => (m.shapeColor = colorData.hex))}
                          />
                        {/snippet}
                      </Popover>
                    {/snippet}
                    {#snippet input(inputProps)}
                      <Input
                        {...inputProps}
                        value={marker.shapeColor}
                        oninput={(e) => updateMarkerAndSave(marker.id, (m) => (m.shapeColor = e.currentTarget.value))}
                      />
                    {/snippet}
                  </FormControl>
                </div>
                <FormControl label="Visibility" name="visibility">
                  {#snippet input(inputProps)}
                    <RadioButton
                      {...inputProps}
                      selected={marker.visibility.toString()}
                      options={[
                        { label: 'DM', value: MarkerVisibility.DM.toString() },
                        { label: 'Everyone', value: MarkerVisibility.Always.toString() },
                        { label: 'On hover', value: MarkerVisibility.Hover.toString() }
                      ]}
                      onSelectedChange={(value) => {
                        updateMarkerAndSave(marker.id, (m) => (m.visibility = Number(value)));
                        // If changing to DM-only, automatically unpin the marker
                        if (Number(value) === MarkerVisibility.DM && pinnedMarkerIds.includes(marker.id)) {
                          onPinToggle(marker.id, false);
                        }
                        socketUpdate();
                      }}
                    />
                  {/snippet}
                </FormControl>
                {#if marker.visibility !== MarkerVisibility.DM && onPinToggle}
                  <FormControl label="Pin tooltip for players?" name="pin">
                    {#snippet input(inputProps)}
                      <RadioButton
                        {...inputProps}
                        selected={pinnedMarkerIds.includes(marker.id) ? 'pinned' : 'unpinned'}
                        options={[
                          { label: 'Yes', value: 'pinned' },
                          { label: 'No', value: 'unpinned' }
                        ]}
                        onSelectedChange={(value) => {
                          onPinToggle(marker.id, value === 'pinned');
                        }}
                      />
                    {/snippet}
                  </FormControl>
                {/if}
                <FormControl label="Label" name="label">
                  {#snippet input(inputProps)}
                    <Input
                      {...inputProps}
                      value={marker.label}
                      maxlength={3}
                      placeholder="ABC"
                      oninput={(e) => updateMarkerAndSave(marker.id, (m) => (m.label = e.currentTarget.value))}
                    />
                  {/snippet}
                </FormControl>
                <FormControl label="Title" name="title">
                  {#snippet input(inputProps)}
                    <Input
                      {...inputProps}
                      value={marker.title}
                      oninput={(e) => updateMarkerAndSave(marker.id, (m) => (m.title = e.currentTarget.value))}
                    />
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
                        { label: circle, value: MarkerShape.Circle.toString() },
                        { label: square, value: MarkerShape.Square.toString() },
                        { label: triangle, value: MarkerShape.Triangle.toString() }
                      ]}
                      onSelectedChange={(value) => {
                        updateMarkerAndSave(marker.id, (m) => (m.shape = Number(value)));
                        socketUpdate();
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
                        { label: 'S', value: MarkerSize.Small.toString() },
                        { label: 'M', value: MarkerSize.Medium.toString() },
                        { label: 'L', value: MarkerSize.Large.toString() }
                      ]}
                      onSelectedChange={(value) => {
                        updateMarkerAndSave(marker.id, (m) => (m.size = Number(value)));
                        socketUpdate();
                      }}
                    />
                  {/snippet}
                </FormControl>
              </div>
              <Spacer />
              <div
                onblur={() => {
                  // Save when editor loses focus
                  updateMarkerAndSave(marker.id, () => {});
                }}
              >
                <Editor
                  debug={false}
                  bind:content={marker.note}
                  editable={true}
                  onChange={() => throttledNoteUpdate(marker.id)}
                />
              </div>
              <Spacer />

              <ConfirmActionButton action={() => handleMarkerDelete(marker.id)} actionButtonText="Confirm delete">
                {#snippet trigger({ triggerProps })}
                  <Button
                    as="div"
                    variant="danger"
                    disabled={formIsLoading}
                    isLoading={formIsLoading}
                    {...triggerProps}
                  >
                    Delete marker
                  </Button>
                {/snippet}
                {#snippet actionMessage()}
                  Delete marker?
                {/snippet}
              </ConfirmActionButton>
            {/each}
          {/if}
        </div>
      </div>
    {:else}
      <div class="markerManager__list">
        {#each stageProps.marker.markers as marker (marker.id)}
          <div class="markerManager__listItem">
            <div class="markerManager__read">
              <IconButton
                variant="ghost"
                onclick={() => {
                  updateMarkerAndSave(marker.id, (m) => {
                    // Cycle through: Always -> Hover -> DM -> Always
                    if (m.visibility === MarkerVisibility.Always) {
                      m.visibility = MarkerVisibility.Hover;
                    } else if (m.visibility === MarkerVisibility.Hover) {
                      m.visibility = MarkerVisibility.DM;
                      // If changing to DM-only, automatically unpin the marker
                      if (pinnedMarkerIds.includes(marker.id)) {
                        onPinToggle(marker.id, false);
                      }
                    } else {
                      m.visibility = MarkerVisibility.Always;
                    }
                  });
                  socketUpdate();
                }}
                title={marker.visibility === MarkerVisibility.Always
                  ? 'Visible to everyone'
                  : marker.visibility === MarkerVisibility.Hover
                    ? 'Hover reveal'
                    : 'DM only'}
              >
                <Icon
                  Icon={marker.visibility === MarkerVisibility.Always
                    ? IconEye
                    : marker.visibility === MarkerVisibility.Hover
                      ? IconHandFinger
                      : IconEyeOff}
                  size="1.25rem"
                  color={marker.visibility === MarkerVisibility.Always ? 'var(--fg)' : 'var(--fgMuted)'}
                />
              </IconButton>
              {@render imagePreview(marker)}
              <button class="markerManager__title" onclick={() => selectMarkerForEdit(marker.id)}>
                {marker.title}
              </button>
              <div class="markerManager__editIcon">
                <ConfirmActionButton action={() => handleMarkerDelete(marker.id)} actionButtonText="Confirm delete">
                  {#snippet trigger({ triggerProps })}
                    <IconButton as="div" variant="ghost" {...triggerProps}>
                      <Icon Icon={IconTrash} />
                    </IconButton>
                  {/snippet}
                  {#snippet actionMessage()}
                    Delete marker {marker.title}?
                  {/snippet}
                </ConfirmActionButton>
              </div>
            </div>
          </div>
        {:else}
          <div>
            <Text weight={700}>No markers in this scene</Text>
            <Spacer size="0.5rem" />
            <Text color="var(--fgMuted)">
              Markers allow you to mark important locations. You can can use them for GM only notes — or in a pinch — as
              table viewable tokens.
            </Text>
            <Spacer size="1rem" />
            <Text color="var(--fgMuted)">Like the rest of Table Slayer, only the GM has control over markers.</Text>
            <Spacer />
            {#if stageProps.activeLayer === MapLayerType.Marker}
              <div class="markerManager__markerHint">
                <Icon Icon={IconLocationPin} size="2rem" />
                Click on the map to add a marker
              </div>
            {:else}
              <Button onclick={() => handleSelectActiveControl('marker')}>
                {#snippet start()}
                  <Icon Icon={IconPokerChip} size="1.25rem" />
                {/snippet}
                Add a marker
              </Button>
            {/if}
          </div>
        {/each}
      </div>
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
    height: 100%;
    display: flex;
    flex-direction: column;
    container-type: inline-size;
  }

  .markerManager__content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex-grow: 1;
    overflow-y: auto;
  }
  .markerManager__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    display: grid;
    gap: 1rem;
    height: fit-content;
    min-height: 0;
    flex-grow: 1;
    align-content: start;
    overflow-y: auto;
    padding: 2rem;
  }
  .markerManager__editView {
    grid-column: 1 / -1;
  }
  .markerManager__listItem {
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

  @container (max-width: 420px) {
    .markerManager__formGrid {
      grid-template-columns: 1fr;
    }
  }
  .markerManager__header {
    display: flex;
    align-items: center;
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
  .markerManager__imagePreview {
    min-width: 2.5rem;
    width: 2.5rem;
    min-height: 2.5rem;
    min-height: 2.5rem;
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
    -webkit-text-stroke: 2px rgba(0, 0, 0, 0.8);
    paint-order: stroke fill;
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
  .markerManager__title {
    font-size: 0.875rem;
    cursor: pointer;
  }
  .markerManager__title:hover {
    text-decoration: underline;
  }
  .markerManager__image {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  :global {
    .markerManager__backButton {
      display: block;
      padding: 1rem 2rem;
      border-bottom: var(--borderThin);
    }
    .markerManager__listItem .markerManager__imageRemove {
      display: none;
    }
  }
  .markerManager__markerHint {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    border-radius: 0.25rem;
    background-color: var(--contrastLow);
    color: var(--fgDanger);
  }
</style>
