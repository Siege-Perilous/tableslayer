<script lang="ts">
  import {
    Icon,
    type StageProps,
    type AnnotationLayerData,
    FormControl,
    Input,
    ColorPickerSwatch,
    ColorPicker,
    Popover,
    Spacer,
    Button,
    Link,
    ConfirmActionButton,
    IconButton,
    Label,
    Text,
    MapLayerType,
    StageMode,
    InputSlider,
    RadioButton
  } from '@tableslayer/ui';
  import {
    IconTrash,
    IconArrowBack,
    IconEye,
    IconEyeOff,
    IconPlus,
    IconPencil,
    IconEraser
  } from '@tabler/icons-svelte';
  import { queuePropertyUpdate, flushQueuedPropertyUpdates } from '$lib/utils';
  import { setPreference, getPreference } from '$lib/utils/gameSessionPreferences';

  let {
    stageProps,
    selectedAnnotationId = $bindable(),
    handleSelectActiveControl,
    onAnnotationDeleted,
    onAnnotationUpdated,
    onAnnotationCreated
  }: {
    stageProps: StageProps;
    selectedAnnotationId: string | undefined;
    handleSelectActiveControl: (control: string) => void;
    onAnnotationDeleted?: (annotationId: string) => void;
    onAnnotationUpdated?: (annotation: AnnotationLayerData) => void;
    onAnnotationCreated?: () => void;
  } = $props();

  let editingAnnotationId = $derived(selectedAnnotationId);
  let editingAnnotation = $derived(stageProps.annotations.layers.find((a) => a.id === editingAnnotationId));

  // Get line width from preferences or active annotation
  let lineWidth = $state(getPreference('annotationLineWidth') || 50);

  // Update line width when active annotation changes
  $effect(() => {
    if (stageProps.annotations.activeLayer) {
      const activeAnnotation = stageProps.annotations.layers.find(
        (layer) => layer.id === stageProps.annotations.activeLayer
      );
      if (activeAnnotation && activeAnnotation.lineWidth) {
        lineWidth = activeAnnotation.lineWidth;
      }
    }
  });

  const selectAnnotationForEdit = (annotationId: string) => {
    selectedAnnotationId = annotationId;
    // Also make it the active annotation for drawing
    setActiveAnnotation(annotationId);
  };

  const backToList = () => {
    selectedAnnotationId = undefined;
  };

  const handleAnnotationDelete = async (annotationId: string) => {
    // Remove from local state
    const updatedLayers = stageProps.annotations.layers.filter((layer) => layer.id !== annotationId);
    queuePropertyUpdate(stageProps, ['annotations', 'layers'], updatedLayers, 'control');

    // If this was the active layer, clear it
    if (stageProps.annotations.activeLayer === annotationId) {
      queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
    }

    // Reset selected annotation if we just deleted it
    if (selectedAnnotationId === annotationId) {
      selectedAnnotationId = undefined;
    }

    // Call the deletion callback if provided
    if (onAnnotationDeleted) {
      onAnnotationDeleted(annotationId);
    }
  };

  const createNewAnnotation = () => {
    if (onAnnotationCreated) {
      onAnnotationCreated();
    }
  };

  const updateAnnotation = (annotationId: string, updates: Partial<AnnotationLayerData>, saveToDb: boolean = true) => {
    const annotation = stageProps.annotations.layers.find((a) => a.id === annotationId);
    if (!annotation) return;

    const updatedAnnotation = { ...annotation, ...updates };
    const updatedLayers = stageProps.annotations.layers.map((layer) =>
      layer.id === annotationId ? updatedAnnotation : layer
    );

    queuePropertyUpdate(stageProps, ['annotations', 'layers'], updatedLayers, 'control');

    // Only save to database for persistent properties (not lineWidth or other local properties)
    if (onAnnotationUpdated && saveToDb) {
      const persistentUpdates = Object.keys(updates).filter((key) => key !== 'lineWidth');
      if (persistentUpdates.length > 0) {
        onAnnotationUpdated(updatedAnnotation);
      }
    }
  };

  const toggleAnnotationVisibility = (annotationId: string) => {
    const annotation = stageProps.annotations.layers.find((a) => a.id === annotationId);
    if (!annotation) return;

    const newVisibility = annotation.visibility === StageMode.DM ? StageMode.Player : StageMode.DM;
    updateAnnotation(annotationId, { visibility: newVisibility });
  };

  const handleLineWidthChange = (value: number) => {
    lineWidth = value;
    setPreference('annotationLineWidth', value);

    // Update the active annotation's line width (don't save to DB - lineWidth is local only)
    if (stageProps.annotations.activeLayer) {
      updateAnnotation(stageProps.annotations.activeLayer, { lineWidth: value }, false);
    }
  };

  const setActiveAnnotation = (annotationId: string) => {
    // Update the line width first for the selected annotation
    const annotation = stageProps.annotations.layers.find((layer) => layer.id === annotationId);
    if (annotation) {
      if (annotation.lineWidth) {
        lineWidth = annotation.lineWidth;
        setPreference('annotationLineWidth', annotation.lineWidth);
      }

      // Update the annotation with the current line width to ensure it's synced
      updateAnnotation(annotationId, { lineWidth: lineWidth }, false);
    }

    // Set both properties in the correct order
    // First set the tool type
    queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Annotation, 'control');

    // Then set the specific annotation layer
    queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], annotationId, 'control');

    // Force the queued updates to be applied immediately
    flushQueuedPropertyUpdates();
  };
</script>

<div class="annotationManager">
  <div class="annotationManager__header">
    <Label>Drawing size</Label>
    <InputSlider
      value={lineWidth}
      oninput={(e) => handleLineWidthChange(Number(e.currentTarget.value))}
      min={1}
      max={200}
      step={1}
    />
  </div>
  <div class="annotationManager__content">
    {#if editingAnnotationId !== undefined && editingAnnotation}
      <Link onclick={backToList} class="annotationManager__backButton">
        List all annotations
        <Icon Icon={IconArrowBack} size="1rem" />
      </Link>
      <div class="annotationManager__editView">
        <div class="annotationManager__annotation">
          <Spacer />
          <div class="annotationManager__formGrid">
            <FormControl label="Name" name="name">
              {#snippet input(inputProps)}
                <Input
                  {...inputProps}
                  value={editingAnnotation.name}
                  oninput={(e) => updateAnnotation(editingAnnotation.id, { name: e.currentTarget.value })}
                />
              {/snippet}
            </FormControl>

            <FormControl label="Visible to" name="visibility">
              {#snippet input(inputProps)}
                <RadioButton
                  {...inputProps}
                  selected={editingAnnotation.visibility.toString()}
                  options={[
                    { label: 'DM', value: StageMode.DM.toString() },
                    { label: 'Everyone', value: StageMode.Player.toString() }
                  ]}
                  onSelectedChange={(value) => {
                    updateAnnotation(editingAnnotation.id, { visibility: Number(value) });
                  }}
                />
              {/snippet}
            </FormControl>
          </div>
          <Spacer />
          <div class="annotationManager__colorPicker">
            <FormControl label="Color" name="color">
              {#snippet start()}
                <Popover>
                  {#snippet trigger()}
                    <ColorPickerSwatch color={editingAnnotation.color} />
                  {/snippet}
                  {#snippet content()}
                    <ColorPicker
                      showOpacity={false}
                      hex={editingAnnotation.color}
                      onUpdate={(colorData) => updateAnnotation(editingAnnotation.id, { color: colorData.hex })}
                    />
                  {/snippet}
                </Popover>
              {/snippet}
              {#snippet input(inputProps)}
                <Input
                  {...inputProps}
                  value={editingAnnotation.color}
                  oninput={(e) => updateAnnotation(editingAnnotation.id, { color: e.currentTarget.value })}
                />
              {/snippet}
            </FormControl>
          </div>
          <Spacer />
          <FormControl label="Opacity" name="opacity">
            {#snippet input(inputProps)}
              <InputSlider
                {...inputProps}
                value={editingAnnotation.opacity}
                min={0}
                max={1}
                step={0.1}
                oninput={(e) => updateAnnotation(editingAnnotation.id, { opacity: Number(e.currentTarget.value) })}
              />
            {/snippet}
          </FormControl>
          <Spacer />

          <ConfirmActionButton
            action={() => handleAnnotationDelete(editingAnnotation.id)}
            actionButtonText="Confirm delete"
          >
            {#snippet trigger({ triggerProps })}
              <Button as="div" variant="danger" {...triggerProps}>Delete annotation</Button>
            {/snippet}
            {#snippet actionMessage()}
              Delete annotation?
            {/snippet}
          </ConfirmActionButton>
        </div>
      </div>
    {:else}
      <div class="annotationManager__list">
        {#each stageProps.annotations.layers as annotation (annotation.id)}
          <div
            class="annotationManager__listItem"
            class:annotationManager__listItem--active={stageProps.annotations.activeLayer === annotation.id}
          >
            <div class="annotationManager__read">
              <IconButton variant="ghost" onclick={() => toggleAnnotationVisibility(annotation.id)}>
                <Icon
                  Icon={annotation.visibility === StageMode.Player ? IconEye : IconEyeOff}
                  size="1.25rem"
                  color={annotation.visibility === StageMode.Player ? 'var(--fg)' : 'var(--fgMuted)'}
                />
              </IconButton>
              <button
                class="annotationManager__colorPreview"
                style:background-color={annotation.color}
                onclick={() => setActiveAnnotation(annotation.id)}
                aria-label={`Set ${annotation.name || 'Untitled'} as active layer`}
              ></button>
              <button class="annotationManager__title" onclick={() => selectAnnotationForEdit(annotation.id)}>
                {annotation.name || 'Untitled'}
              </button>
              <div class="annotationManager__editIcon">
                <ConfirmActionButton
                  action={() => handleAnnotationDelete(annotation.id)}
                  actionButtonText="Confirm delete"
                >
                  {#snippet trigger({ triggerProps })}
                    <IconButton as="div" variant="ghost" {...triggerProps}>
                      <Icon Icon={IconTrash} />
                    </IconButton>
                  {/snippet}
                  {#snippet actionMessage()}
                    Delete annotation {annotation.name}?
                  {/snippet}
                </ConfirmActionButton>
              </div>
            </div>
          </div>
        {:else}
          <div>
            <Text weight={700}>No annotation layers in this scene</Text>
            <Spacer size="0.5rem" />
            <Text color="var(--fgMuted)">
              Annotations allow you to draw notes and diagrams on top of your maps. Each layer can have its own color
              and visibility settings.
            </Text>
            <Spacer />
            <Button onclick={createNewAnnotation}>
              {#snippet start()}
                <Icon Icon={IconPlus} size="1.25rem" />
              {/snippet}
              Create annotation layer
            </Button>
          </div>
        {/each}
        {#if stageProps.annotations.layers.length > 0}
          <Spacer />
          <Button onclick={createNewAnnotation} variant="ghost">
            {#snippet start()}
              <Icon Icon={IconPlus} size="1.25rem" />
            {/snippet}
            Add new layer
          </Button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .annotationManager {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .annotationManager__content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex-grow: 1;
    overflow-y: auto;
  }

  .annotationManager__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: 1rem;
    height: fit-content;
    min-height: 0;
    flex-grow: 1;
    align-content: start;
    overflow-y: auto;
    padding: 2rem;
  }

  .annotationManager__editView {
    grid-column: 1 / -1;
  }

  .annotationManager__listItem {
    border-radius: 0.25rem;
    padding: 0.5rem;
    border: 2px solid transparent;
  }

  .annotationManager__listItem--active {
    border-color: var(--fgPrimary);
    background-color: var(--contrastLow);
  }

  .annotationManager__listItem:hover .annotationManager__editIcon {
    opacity: 1;
  }

  .annotationManager__formGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .annotationManager__header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 2rem;
    border-bottom: var(--borderThin);
    position: sticky;
    top: 0;
    width: 100%;
  }

  .annotationManager__colorPicker {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .annotationManager__colorPreview {
    min-width: 2rem;
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
    border: 2px solid var(--borderColor);
    cursor: pointer;
  }

  .annotationManager__colorPreview:hover {
    border-color: var(--fgPrimary);
  }

  .annotationManager__read {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .annotationManager__annotation {
    width: 100%;
    padding: 0 2rem;
  }

  .annotationManager__editIcon {
    margin-left: auto;
    opacity: 0;
  }

  .annotationManager__title {
    font-size: 0.875rem;
    cursor: pointer;
  }

  .annotationManager__title:hover {
    text-decoration: underline;
  }

  :global {
    .annotationManager__backButton {
      display: block;
      padding: 1rem 2rem;
      border-bottom: var(--borderThin);
    }
  }
</style>
