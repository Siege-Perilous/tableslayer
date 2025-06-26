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
  import { IconTrash, IconEye, IconEyeOff, IconPlus, IconGripVertical } from '@tabler/icons-svelte';
  import { queuePropertyUpdate, flushQueuedPropertyUpdates } from '$lib/utils';
  import { setPreferenceDebounced } from '$lib/utils/gameSessionPreferences';
  import { onDestroy } from 'svelte';
  import { flip } from 'svelte/animate';
  import { sineOut } from 'svelte/easing';

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

  // Drag and drop state
  let draggedItem: string | null = $state(null);
  let draggedOverItem: string | null = $state(null);
  let touchStartY: number = 0;
  let dragElement: HTMLElement | null = null;
  let dragPreviewElement: HTMLElement | null = null;

  // Clean up on destroy
  onDestroy(() => {
    cleanupDragPreview();
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
    // Don't activate if we're dragging
    if (draggedItem) return;

    // Set both properties in the correct order
    // First set the tool type
    queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Annotation, 'control');

    // Then set the specific annotation layer
    queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], annotationId, 'control');

    // Force the queued updates to be applied immediately
    flushQueuedPropertyUpdates();
  };

  // Clean up drag preview element
  const cleanupDragPreview = () => {
    if (dragPreviewElement) {
      try {
        document.body.removeChild(dragPreviewElement);
      } catch {
        // Element might already be removed
      }
      dragPreviewElement = null;
    }
  };

  // Apply styles to the drag preview clone
  const applyDragPreviewStyles = (preview: HTMLElement, original: HTMLElement, event: DragEvent) => {
    const rect = original.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    Object.assign(preview.style, {
      width: `${original.offsetWidth}px`,
      height: `${original.offsetHeight}px`,
      position: 'fixed',
      borderColor: 'var(--fgPrimary)',
      backgroundColor: 'var(--bg)',
      cursor: 'grabbing',
      zIndex: '1000',
      pointerEvents: 'none',
      left: `${event.clientX - offsetX}px`,
      top: `${event.clientY - offsetY}px`,
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
    });

    return { offsetX, offsetY };
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent, itemId: string) => {
    draggedItem = itemId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', ''); // Required for Firefox

      // Create an invisible drag image
      const emptyImg = new Image();
      emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer.setDragImage(emptyImg, 0, 0);

      // Create the custom drag preview
      const original = e.currentTarget as HTMLElement;
      const preview = original.cloneNode(true) as HTMLElement;
      const { offsetX, offsetY } = applyDragPreviewStyles(preview, original, e);

      // Add to DOM
      document.body.appendChild(preview);
      dragPreviewElement = preview;

      // Add event listener to move the preview with the cursor
      const handleDragMove = (moveEvent: DragEvent) => {
        if (dragPreviewElement) {
          dragPreviewElement.style.left = moveEvent.clientX - offsetX + 'px';
          dragPreviewElement.style.top = moveEvent.clientY - offsetY + 'px';
        }
      };

      document.addEventListener('dragover', handleDragMove);

      // Store the cleanup function for later
      (e.currentTarget as HTMLElement & { _dragMoveHandler?: (e: DragEvent) => void })._dragMoveHandler =
        handleDragMove;
    }
  };

  const handleDragOver = (e: DragEvent, itemId: string) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (draggedItem && draggedItem !== itemId) {
      draggedOverItem = itemId;
    }
  };

  const handleDragLeave = () => {
    draggedOverItem = null;
  };

  const handleDrop = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== targetId) {
      reorderAnnotations(draggedItem, targetId);
    }
    draggedItem = null;
    draggedOverItem = null;
  };

  const handleDragEnd = (e: DragEvent) => {
    // Clean up the drag preview
    cleanupDragPreview();

    // Remove the drag move handler
    const handler = (e.currentTarget as HTMLElement & { _dragMoveHandler?: (e: DragEvent) => void })?._dragMoveHandler;
    if (handler) {
      document.removeEventListener('dragover', handler);
      delete (e.currentTarget as HTMLElement & { _dragMoveHandler?: (e: DragEvent) => void })._dragMoveHandler;
    }

    draggedItem = null;
    draggedOverItem = null;
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: TouchEvent, itemId: string, element: HTMLElement) => {
    const touch = e.touches[0];
    touchStartY = touch.clientY;
    draggedItem = itemId;
    dragElement = element;

    // Add touch move listener to track dragging
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!draggedItem || !dragElement) return;

    e.preventDefault(); // Prevent scrolling while dragging

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - touchStartY;

    // Visual feedback - translate the element
    dragElement.style.transform = `translateY(${deltaY}px)`;
    dragElement.style.opacity = '0.8';
    dragElement.style.zIndex = '1000';

    // Find which item we're over
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const listItem = elementBelow?.closest('.annotationManager__listItem');

    if (listItem && listItem !== dragElement) {
      const targetId = listItem.getAttribute('data-annotation-id');
      if (targetId && targetId !== draggedItem) {
        draggedOverItem = targetId;
      }
    }
  };

  const handleTouchEnd = () => {
    if (!draggedItem || !dragElement) return;

    // Reset visual state
    dragElement.style.transform = '';
    dragElement.style.opacity = '';
    dragElement.style.zIndex = '';

    // Perform the reorder if we have a target
    if (draggedOverItem && draggedItem !== draggedOverItem) {
      reorderAnnotations(draggedItem, draggedOverItem);
    }

    // Clean up
    dragElement.removeEventListener('touchmove', handleTouchMove);
    dragElement.removeEventListener('touchend', handleTouchEnd);

    draggedItem = null;
    draggedOverItem = null;
    dragElement = null;

    // Also clean up any drag preview that might exist
    cleanupDragPreview();
  };

  const reorderAnnotations = (fromId: string, toId: string) => {
    const layers = [...stageProps.annotations.layers];
    const fromIndex = layers.findIndex((l) => l.id === fromId);
    const toIndex = layers.findIndex((l) => l.id === toId);

    if (fromIndex === -1 || toIndex === -1) return;

    // Remove the item from its current position
    const [movedItem] = layers.splice(fromIndex, 1);

    // Insert it at the new position
    layers.splice(toIndex, 0, movedItem);

    // Update the annotations
    queuePropertyUpdate(stageProps, ['annotations', 'layers'], layers, 'control');

    // Trigger save if callback provided
    if (onAnnotationUpdated) {
      layers.forEach((layer) => onAnnotationUpdated(layer));
    }
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
          animate:flip={{ delay: 100, duration: 200, easing: sineOut }}
          class="annotationManager__listItem"
          class:annotationManager__listItem--active={stageProps.annotations.activeLayer === annotation.id}
          class:annotationManager__listItem--dragging={draggedItem === annotation.id}
          class:annotationManager__listItem--dragOver={draggedOverItem === annotation.id}
          data-annotation-id={annotation.id}
          draggable="true"
          ondragstart={(e) => handleDragStart(e, annotation.id)}
          ondragover={(e) => handleDragOver(e, annotation.id)}
          ondragleave={handleDragLeave}
          ondrop={(e) => handleDrop(e, annotation.id)}
          ondragend={(e) => handleDragEnd(e)}
          ontouchstart={(e) => handleTouchStart(e, annotation.id, e.currentTarget)}
          onclick={() => setActiveAnnotation(annotation.id)}
        >
          <div class="annotationManager__controls">
            <div class="annotationManager__dragHandle">
              <Icon Icon={IconGripVertical} size="1.25rem" color="var(--fgMuted)" />
            </div>
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
            <div class="annotationManager__deleteButton">
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
    padding: 2rem;
  }

  .annotationManager__listItem {
    padding: 0.5rem;
    transition:
      border-color 0.2s,
      opacity 0.2s;
    border: solid 1px transparent;
    margin-bottom: 0.5rem;
    border-radius: var(--radius-1);
    position: relative;
  }

  .annotationManager__listItem:hover {
    border-color: var(--inputBorderColor);
    cursor: pointer;
  }

  .annotationManager__listItem--active {
    background-color: var(--contrastLow);
  }

  .annotationManager__listItem--dragging {
    opacity: 0.3;
    cursor: grabbing;
    border-color: var(--contrastMedium);
  }

  .annotationManager__listItem--dragOver {
    border-color: var(--fg);
    border-style: dashed;
    background-color: var(--contrastLow);
  }

  .annotationManager__listItem--dragOver::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: linear-gradient(
      135deg,
      transparent 10%,
      transparent 10%,
      transparent 50%,
      var(--bg) 50%,
      var(--contrastMedium) 50%,
      transparent 60%,
      transparent 100%
    );
    background-size: 14.14px 14.14px;
    opacity: 0.3;
    pointer-events: none;
    border-radius: var(--radius-1);
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

  .annotationManager__deleteButton {
    margin-left: auto;
  }

  .annotationManager__dragHandle {
    cursor: grab;
    display: flex;
    align-items: center;
    touch-action: none;
  }

  .annotationManager__listItem--dragging .annotationManager__dragHandle {
    cursor: grabbing;
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
