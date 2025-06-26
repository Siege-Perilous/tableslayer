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
    <div class="annotationManager__list">
      {#each stageProps.annotations.layers as annotation (annotation.id)}
        <div
          class="annotationManager__listItem"
          class:annotationManager__listItem--active={stageProps.annotations.activeLayer === annotation.id}
        >
          <div class="annotationManager__controls">
            <div class="annotationManager__topRow">
              <IconButton variant="ghost" onclick={() => toggleAnnotationVisibility(annotation.id)}>
                <Icon
                  Icon={annotation.visibility === StageMode.Player ? IconEye : IconEyeOff}
                  size="1.25rem"
                  color={annotation.visibility === StageMode.Player ? 'var(--fg)' : 'var(--fgMuted)'}
                />
              </IconButton>
              <Popover>
                {#snippet trigger()}
                  <button
                    class="annotationManager__colorPreview"
                    style:background-color={annotation.color}
                    aria-label={`Change color for ${annotation.name || 'Untitled'}`}
                  ></button>
                {/snippet}
                {#snippet content()}
                  <ColorPicker
                    showOpacity={false}
                    hex={annotation.color}
                    onUpdate={(colorData) => updateAnnotation(annotation.id, { color: colorData.hex })}
                  />
                {/snippet}
              </Popover>
              <Input
                value={annotation.name || ''}
                placeholder="Untitled"
                oninput={(e) => updateAnnotation(annotation.id, { name: e.currentTarget.value })}
                class="annotationManager__nameInput"
              />
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
            <div class="annotationManager__bottomRow">
              <Label>Opacity</Label>
              <InputSlider
                value={annotation.opacity}
                min={0}
                max={1}
                step={0.1}
                oninput={(e) => updateAnnotation(annotation.id, { opacity: Number(e.currentTarget.value) })}
                class="annotationManager__opacitySlider"
              />
              <Button
                variant="ghost"
                size="small"
                onclick={() => setActiveAnnotation(annotation.id)}
                class="annotationManager__selectButton"
              >
                {stageProps.annotations.activeLayer === annotation.id ? 'Active' : 'Select'}
              </Button>
            </div>
          </div>
        </div>
      {:else}
        <div>
          <Text weight={700}>No annotation layers in this scene</Text>
          <Spacer size="0.5rem" />
          <Text color="var(--fgMuted)}">
            Annotations allow you to draw notes and diagrams on top of your maps. Each layer can have its own color and
            visibility settings.
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
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: fit-content;
    min-height: 0;
    flex-grow: 1;
    align-content: start;
    overflow-y: auto;
    padding: 2rem;
  }

  .annotationManager__listItem {
    border-radius: 0.25rem;
    padding: 1rem;
    border: 2px solid transparent;
    background-color: var(--contrastLow);
    transition: border-color 0.2s;
  }

  .annotationManager__listItem--active {
    border-color: var(--fgPrimary);
    background-color: var(--contrastMedium);
  }

  .annotationManager__controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .annotationManager__topRow {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .annotationManager__bottomRow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
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
    background-color: var(--bgColorBlur);
    backdrop-filter: blur(10px);
  }

  .annotationManager__colorPreview {
    min-width: 2rem;
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
    border: 2px solid var(--borderColor);
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .annotationManager__colorPreview:hover {
    border-color: var(--fgPrimary);
  }

  .annotationManager__nameInput {
    flex: 1;
    min-width: 0;
  }

  .annotationManager__opacitySlider {
    flex: 1;
    min-width: 0;
    max-width: 10rem;
  }

  .annotationManager__selectButton {
    margin-left: auto;
    white-space: nowrap;
  }

  :global {
    .annotationManager__nameInput input {
      font-size: 0.875rem;
    }
  }
</style>
