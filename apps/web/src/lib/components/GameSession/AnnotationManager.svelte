<script lang="ts">
  import {
    Icon,
    type StageProps,
    type AnnotationLayerData,
    Input,
    Spacer,
    Button,
    ConfirmActionButton,
    IconButton,
    Text,
    MapLayerType,
    StageMode,
    decodeRLE
  } from '@tableslayer/ui';
  import { IconTrash, IconEye, IconEyeOff, IconPlus, IconGripVertical } from '@tabler/icons-svelte';
  import { queuePropertyUpdate, flushQueuedPropertyUpdates } from '$lib/utils';
  import { setPreferenceDebounced } from '$lib/utils/gameSessionPreferences';
  import { flip } from 'svelte/animate';
  import { sineOut } from 'svelte/easing';
  import { useDragAndDrop } from '$lib/composables/useDragAndDrop.svelte';
  import { onDestroy } from 'svelte';

  let {
    stageProps,
    selectedAnnotationId = $bindable(),
    onAnnotationDeleted,
    onAnnotationUpdated,
    onAnnotationCreated,
    handleOpacityChange = $bindable(),
    handleBrushSizeChange = $bindable(),
    handleColorChange = $bindable(),
    annotationMasks = {}
  }: {
    stageProps: StageProps;
    selectedAnnotationId: string | undefined;
    onAnnotationDeleted?: (annotationId: string) => void;
    onAnnotationUpdated?: (annotation: AnnotationLayerData) => void;
    onAnnotationCreated?: () => void;
    handleOpacityChange?: (value: number) => void;
    handleBrushSizeChange?: (value: number) => void;
    handleColorChange?: (color: string, opacity: number) => void;
    annotationMasks?: Record<string, string | null>;
  } = $props();

  // Store thumbnail blob URLs for annotations
  let thumbnailUrls = $state<Record<string, string>>({});

  // Track mask data and color to detect changes
  let thumbnailCache = $state<Record<string, { maskData: string; color: string }>>({});

  // Generate thumbnails from RLE mask data
  async function generateThumbnail(annotationId: string, maskBase64: string, color: string): Promise<void> {
    try {
      // Decode base64 to Uint8Array
      const maskData = Uint8Array.from(atob(maskBase64), (c) => c.charCodeAt(0));

      // Extract dimensions (first 8 bytes)
      const view = new DataView(maskData.buffer, maskData.byteOffset, maskData.byteLength);
      const width = view.getUint32(0, true);
      const height = view.getUint32(4, true);

      // Get RLE data (skip dimensions)
      const rleData = maskData.slice(8);

      // Decode RLE to binary mask
      const binaryMask = decodeRLE(rleData, width * height);

      // Calculate thumbnail dimensions based on scene aspect ratio
      const sceneWidth = stageProps.display.resolution.x;
      const sceneHeight = stageProps.display.resolution.y;
      const aspectRatio = sceneWidth / sceneHeight;

      // Use a max dimension and calculate the other based on aspect ratio
      const maxDimension = 96;
      let thumbWidth: number, thumbHeight: number;

      if (aspectRatio >= 1) {
        // Landscape or square
        thumbWidth = maxDimension;
        thumbHeight = Math.round(maxDimension / aspectRatio);
      } else {
        // Portrait
        thumbHeight = maxDimension;
        thumbWidth = Math.round(maxDimension * aspectRatio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create image data for the mask
      const imageData = ctx.createImageData(width, height);
      const pixels = imageData.data;

      // Convert binary mask to RGBA (use color with alpha from mask)
      const rgb = parseInt(color.slice(1), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;

      for (let i = 0; i < binaryMask.length; i++) {
        const idx = i * 4;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = binaryMask[i]; // Use mask value as alpha
      }

      // Create a temporary canvas for the full-size image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      tempCtx.putImageData(imageData, 0, 0);

      // Draw scaled down to thumbnail
      ctx.clearRect(0, 0, thumbWidth, thumbHeight);
      ctx.drawImage(tempCanvas, 0, 0, thumbWidth, thumbHeight);

      // Convert to blob URL
      canvas.toBlob((blob) => {
        if (blob) {
          // Revoke old URL if it exists to prevent memory leaks
          if (thumbnailUrls[annotationId]) {
            URL.revokeObjectURL(thumbnailUrls[annotationId]);
          }
          const url = URL.createObjectURL(blob);
          thumbnailUrls[annotationId] = url;
          thumbnailUrls = { ...thumbnailUrls }; // Trigger reactivity
        }
      });
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
    }
  }

  // Generate thumbnails when masks or colors change
  $effect(() => {
    for (const annotation of stageProps.annotations.layers) {
      const maskData = annotationMasks[annotation.id];
      const color = annotation.color;

      if (maskData && color) {
        const cached = thumbnailCache[annotation.id];
        // Only regenerate if mask or color changed
        if (!cached || cached.maskData !== maskData || cached.color !== color) {
          thumbnailCache[annotation.id] = { maskData, color };
          generateThumbnail(annotation.id, maskData, color);
        }
      }
    }
  });

  // Clean up blob URLs on destroy
  onDestroy(() => {
    for (const url of Object.values(thumbnailUrls)) {
      URL.revokeObjectURL(url);
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

  // Export handlers for external use (e.g., DrawingSliders)
  const handleOpacityChangeInternal = (annotationId: string, value: number) => {
    updateAnnotation(annotationId, { opacity: value });
  };

  const handleColorChangeInternal = (annotationId: string, color: string, opacity: number) => {
    updateAnnotation(annotationId, { color, opacity });
  };

  // Bind handlers for external components
  $effect(() => {
    const activeLayer = stageProps.annotations.activeLayer;
    if (activeLayer) {
      handleOpacityChange = (value: number) => handleOpacityChangeInternal(activeLayer, value);
      handleBrushSizeChange = handleLineWidthChange;
      handleColorChange = (color: string, opacity: number) => handleColorChangeInternal(activeLayer, color, opacity);
    } else {
      handleOpacityChange = undefined;
      handleBrushSizeChange = undefined;
      handleColorChange = undefined;
    }
  });

  // Initialize drag and drop composable
  const dragAndDrop = useDragAndDrop<AnnotationLayerData>({
    onReorder: reorderAnnotations,
    getItemId: (item) => item.id
  });

  // Calculate preview aspect ratio from scene dimensions
  let previewAspectRatio = $derived(stageProps.display.resolution.x / stageProps.display.resolution.y);

  const setActiveAnnotation = (annotationId: string) => {
    // Don't activate if we're dragging
    if (dragAndDrop.draggedItem) return;

    // Set both properties in the correct order
    // First set the tool type
    queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Annotation, 'control');

    // Then set the specific annotation layer
    queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], annotationId, 'control');

    // Force the queued updates to be applied immediately
    flushQueuedPropertyUpdates();
  };

  function reorderAnnotations(fromId: string, toId: string) {
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
  }
</script>

<div class="annotationManager">
  <div class="annotationManager__header">
    {#if stageProps.annotations.layers.length > 0}
      <Button onclick={createNewAnnotation}>
        {#snippet start()}
          <Icon Icon={IconPlus} size="1.25rem" />
        {/snippet}
        Layer
      </Button>
    {/if}
  </div>
  <div class="annotationManager__content">
    <div class="annotationManager__list">
      {#each stageProps.annotations.layers as annotation (annotation.id)}
        <button
          animate:flip={{ delay: 100, duration: 200, easing: sineOut }}
          class="annotationManager__listItem"
          class:annotationManager__listItem--active={stageProps.annotations.activeLayer === annotation.id}
          class:annotationManager__listItem--dragging={dragAndDrop.draggedItem === annotation.id}
          class:annotationManager__listItem--dragOver={dragAndDrop.draggedOverItem === annotation.id}
          data-drag-id={annotation.id}
          draggable="true"
          ondragstart={(e) => dragAndDrop.handleDragStart(e, annotation.id)}
          ondragover={(e) => dragAndDrop.handleDragOver(e, annotation.id)}
          ondragleave={dragAndDrop.handleDragLeave}
          ondrop={(e) => dragAndDrop.handleDrop(e, annotation.id)}
          ondragend={(e) => dragAndDrop.handleDragEnd(e)}
          onclick={() => setActiveAnnotation(annotation.id)}
        >
          <div class="annotationManager__controls">
            <div
              class="annotationManager__dragHandle"
              role="button"
              tabindex="-1"
              aria-label="Drag handle for reordering annotation layer"
              ontouchstart={(e) => {
                e.stopPropagation();
                const dragElement = e.currentTarget.closest('[data-drag-id]') as HTMLElement | null;
                if (dragElement) {
                  dragAndDrop.handleTouchStart(e, annotation.id, dragElement);
                }
              }}
            >
              <Icon Icon={IconGripVertical} size="1.25rem" color="var(--fgMuted)" />
            </div>
            <IconButton
              variant="ghost"
              onclick={() => toggleAnnotationVisibility(annotation.id)}
              title={annotation.visibility === StageMode.Player ? 'Hide from players' : 'Show to players'}
            >
              <Icon
                Icon={annotation.visibility === StageMode.Player ? IconEye : IconEyeOff}
                size="1.25rem"
                color={annotation.visibility === StageMode.Player ? 'var(--fg)' : 'var(--fgMuted)'}
              />
            </IconButton>
            <div
              class="annotationManager__preview"
              style:aspect-ratio={previewAspectRatio}
              style:transform="rotate({stageProps.scene.rotation}deg)"
              title={annotation.name || 'Annotation layer'}
            >
              {#if thumbnailUrls[annotation.id]}
                <img
                  src={thumbnailUrls[annotation.id]}
                  alt={annotation.name || 'Annotation layer preview'}
                  class="annotationManager__previewImage"
                />
              {:else if annotation.url}
                <div
                  class="annotationManager__previewLegacy"
                  style:background-color={annotation.color}
                  style:opacity={annotation.opacity}
                  style:--mask-url="url({annotation.url})"
                ></div>
              {:else}
                <div
                  class="annotationManager__previewEmpty"
                  style:background-color={annotation.color}
                  style:opacity={annotation.opacity}
                ></div>
              {/if}
            </div>
            <Input
              value={annotation.name || ''}
              variant="transparent"
              placeholder="Untitled"
              class="annotationManager__nameInput"
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
    container-type: inline-size;
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
    border-color: var(--contrastHigh);
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

  .annotationManager__preview {
    width: 3rem;
    border-radius: var(--radius-2);
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
    background-color: var(--contrastLowest);
  }

  .annotationManager__previewImage {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .annotationManager__previewLegacy {
    width: 100%;
    height: 100%;
    -webkit-mask-image: var(--mask-url);
    mask-image: var(--mask-url);
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }

  .annotationManager__previewEmpty {
    width: 100%;
    height: 100%;
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
    .annotationManager__nameInput {
      cursor: text !important;
    }
  }
</style>
