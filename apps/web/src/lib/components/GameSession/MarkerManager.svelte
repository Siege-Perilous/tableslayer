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
    Link,
    Editor,
    ConfirmActionButton,
    IconButton,
    Loader,
    MarkerVisibility,
    MarkerShape,
    MarkerSize
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
    IconX
  } from '@tabler/icons-svelte';
  import { useUploadFileMutation, useDeleteMarkerMutation } from '$lib/queries';
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
  const deleteMarker = useDeleteMarkerMutation();

  let activeMarkerId = $state<string | null>(null);
  let formIsLoading = $state(false);
  let editingMarkerId = $derived(selectedMarker ? selectedMarker.id : null);
  const markersUnlocked = $derived(stageProps.activeLayer === MapLayerType.Marker);

  const openMarkerImageDialog = (markerId: string) => {
    activeMarkerId = markerId;
    const fileInput = document.getElementById(`marker-image-input-${markerId}`) as HTMLInputElement;
    fileInput?.click();
  };

  const selectMarkerForEdit = (markerId: string) => {
    selectedMarker = stageProps.marker.markers.find((marker) => marker.id === markerId);
  };

  const backToList = () => {
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

    const newFileUrl = `https://files.tableslayer.com/cdn-cgi/image/w=512,h=512,fit=cover,gravity=auto/${uploadedFile.location}`;
    console.log('New file URL:', newFileUrl);
    stageProps.marker.markers.forEach((marker) => {
      if (marker.id === markerId) {
        marker.imageUrl = newFileUrl;
      }
    });
  };

  const handleMarkerDelete = async (markerId: string) => {
    await handleMutation({
      mutation: () => $deleteMarker.mutateAsync({ partyId: partyId, markerId: markerId }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => {
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
        <IconButton variant="ghost" onclick={() => (marker.imageUrl = null)}>
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
    <div>
      <FormControl label="Markers lock" name="isEditing">
        {#snippet input({ inputProps })}
          <RadioButton
            {...inputProps}
            selected={markersUnlocked ? 'true' : 'false'}
            options={[
              { label: 'on', value: 'false' },
              { label: 'off', value: 'true' }
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
  <div class="markerManager__content">
    {#if editingMarkerId !== null}
      <Link onclick={backToList} class="markerManager__backButton">
        List all markers
        <Icon Icon={IconArrowBack} size="1rem" />
      </Link>
      <div class="markerManager__editView">
        <div class="markerManager__marker">
          {#if selectedMarker}
            {@const marker = stageProps.marker.markers.find((m) => m.id === editingMarkerId)}
            {#if marker}
              <!-- Forces rerender if ID changes -->
              {#key marker.id}
                <Spacer />
                <div class="markerManager__formGrid">
                  <FormControl label="Change image" name="imageLocation">
                    {#snippet input({ inputProps })}
                      {@render imagePreview(marker, inputProps)}
                    {/snippet}
                  </FormControl>

                  <FormControl label="Visible to" name="visibility">
                    {#snippet input(inputProps)}
                      <RadioButton
                        {...inputProps}
                        selected={marker.visibility.toString()}
                        options={[
                          { label: 'DM', value: MarkerVisibility.DM.toString() },
                          { label: 'Everyone', value: MarkerVisibility.Always.toString() }
                        ]}
                        onSelectedChange={(value) => {
                          if (selectedMarker) {
                            selectedMarker.visibility = Number(value);
                          }
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
                  <FormControl label="Background color" name="shapeColor">
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
                          { label: circle, value: MarkerShape.Circle.toString() },
                          { label: square, value: MarkerShape.Square.toString() },
                          { label: triangle, value: MarkerShape.Triangle.toString() }
                        ]}
                        onSelectedChange={(value) => {
                          if (selectedMarker) {
                            selectedMarker.shape = Number(value);
                          }
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
                          if (selectedMarker) {
                            selectedMarker.size = Number(value);
                          }
                        }}
                      />
                    {/snippet}
                  </FormControl>
                </div>
                <Spacer />
                <Editor debug={false} bind:content={marker.note} />
                <Spacer />

                <ConfirmActionButton action={() => handleMarkerDelete(marker.id)} actionButtonText="Confirm delete">
                  {#snippet trigger({ triggerProps })}
                    <Button
                      as="div"
                      variant="danger"
                      disabled={formIsLoading}
                      isLoading={formIsLoading}
                      {...triggerProps}>Delete marker</Button
                    >
                  {/snippet}
                  {#snippet actionMessage()}
                    hello
                  {/snippet}
                </ConfirmActionButton>
              {/key}
            {/if}
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
                onclick={() =>
                  marker.visibility === MarkerVisibility.Always
                    ? (marker.visibility = MarkerVisibility.DM)
                    : (marker.visibility = MarkerVisibility.Always)}
              >
                <Icon
                  Icon={marker.visibility === MarkerVisibility.Always ? IconEye : IconEyeOff}
                  size="1.25rem"
                  color={marker.visibility === MarkerVisibility.Always ? 'var(--fg)' : 'var(--fgMuted)'}
                />
              </IconButton>
              {@render imagePreview(marker)}
              <button class="markerManager__title" onclick={() => selectMarkerForEdit(marker.id)}>{marker.title}</button
              >
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
    text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
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
</style>
