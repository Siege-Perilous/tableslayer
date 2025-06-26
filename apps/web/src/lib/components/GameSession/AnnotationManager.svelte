<script lang="ts">
  import {
    Icon,
    type StageProps,
    type AnnotationLayerData,
    Input,
    ColorPicker,
    Popover,
    Spacer,
    Button,
    ConfirmActionButton,
    IconButton,
    Text,
    Label,
    MapLayerType,
    StageMode,
    InputSlider
  } from '@tableslayer/ui';
  import { IconTrash, IconEye, IconEyeOff, IconPlus } from '@tabler/icons-svelte';
  import { queuePropertyUpdate, flushQueuedPropertyUpdates } from '$lib/utils';
  import { setPreferenceDebounced } from '$lib/utils/gameSessionPreferences';

  let {
    stageProps,
    selectedAnnotationId = $bindable(),
    onAnnotationDeleted,
    onAnnotationUpdated,
    onAnnotationCreated
  }: {
    stageProps: StageProps;
    selectedAnnotationId: string | undefined;
    onAnnotationDeleted?: (annotationId: string) => void;
    onAnnotationUpdated?: (annotation: AnnotationLayerData) => void;
    onAnnotationCreated?: () => void;
  } = $props();

  // Line width should be reactive to the global state
  let lineWidth = $derived(stageProps.annotations.lineWidth || 50);

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

    // Save to database if requested
    if (onAnnotationUpdated && saveToDb) {
      onAnnotationUpdated(updatedAnnotation);
    }
  };

  const toggleAnnotationVisibility = (annotationId: string) => {
    const annotation = stageProps.annotations.layers.find((a) => a.id === annotationId);
    if (!annotation) return;

    const newVisibility = annotation.visibility === StageMode.DM ? StageMode.Player : StageMode.DM;
    updateAnnotation(annotationId, { visibility: newVisibility });
  };

  const handleLineWidthChange = (value: number) => {
    // Update the global state
    queuePropertyUpdate(stageProps, ['annotations', 'lineWidth'], value, 'control');
    // Save to preferences (debounced)
    setPreferenceDebounced('annotationLineWidth', value);
  };

  const setActiveAnnotation = (annotationId: string) => {
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
    {#if stageProps.annotations.layers.length > 0}
      <Button onclick={createNewAnnotation}>
        {#snippet start()}
          <Icon Icon={IconPlus} size="1.25rem" />
        {/snippet}
        Add new layer
      </Button>
    {/if}
    <div class="annotationManager__lineWidthControl">
      <Label>Line width</Label>
      <InputSlider
        value={lineWidth}
        oninput={(e) => handleLineWidthChange(Number(e.currentTarget.value))}
        min={1}
        max={200}
        step={1}
      />
    </div>
  </div>
  <div class="annotationManager__content">
    <div class="annotationManager__list">
      {#each stageProps.annotations.layers as annotation (annotation.id)}
        <button
          class="annotationManager__listItem"
          class:annotationManager__listItem--active={stageProps.annotations.activeLayer === annotation.id}
          onclick={() => setActiveAnnotation(annotation.id)}
        >
          <div class="annotationManager__controls">
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
                  style:opacity={annotation.opacity}
                  aria-label={`Change color and opacity for ${annotation.name || 'Untitled'}`}
                ></button>
              {/snippet}
              {#snippet content()}
                <ColorPicker
                  showOpacity={true}
                  hex={annotation.color +
                    Math.round(annotation.opacity * 255)
                      .toString(16)
                      .padStart(2, '0')}
                  onUpdate={(colorData) =>
                    updateAnnotation(annotation.id, {
                      color: colorData.hex.slice(0, 7), // Keep only the 6-digit hex color
                      opacity: colorData.rgba.a
                    })}
                />
              {/snippet}
            </Popover>
            <Input
              value={annotation.name || ''}
              variant="transparent"
              placeholder="Untitled"
              oninput={(e) => updateAnnotation(annotation.id, { name: e.currentTarget.value })}
            />
            <ConfirmActionButton action={() => handleAnnotationDelete(annotation.id)} actionButtonText="Confirm delete">
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
        </button>
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
    height: fit-content;
    min-height: 0;
    flex-grow: 1;
    align-content: start;
    overflow-y: auto;
    padding: 1rem 2rem 2rem 2rem;
  }

  .annotationManager__listItem {
    border-radius: 0.25rem;
    padding: 0.5rem;
    transition: border-colo;
    border: solid 1px transparent;
  }

  .annotationManager__listItem:hover {
    border-color: var(--inputBorderColor);
    cursor: pointer;
  }

  .annotationManager__listItem--active {
    background-color: var(--contrastLow);
  }

  .annotationManager__controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .annotationManager__header {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 3rem;
    padding: 1rem 2rem;
    border-bottom: var(--borderThin);
    position: sticky;
    top: 0;
    width: 100%;
    background-color: var(--bgColorBlur);
    backdrop-filter: blur(10px);
  }
  .annotationManager__lineWidthControl {
    display: flex;
    gap: 1rem;
    text-wrap: nowrap;
    align-items: center;
  }

  .annotationManager__colorPreview {
    min-width: 1.5rem;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .annotationManager__colorPreview:hover {
    border-color: var(--fgPrimary);
  }

  :global {
    .annotationManager__controls > :global(input) {
      flex: 1;
      min-width: 0;
      max-width: 15rem;
    }

    .annotationManager__controls > :global(button) {
      white-space: nowrap;
    }
  }
</style>
