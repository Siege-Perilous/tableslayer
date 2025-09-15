<script lang="ts">
  import * as THREE from 'three';
  import { getContext } from 'svelte';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { type AnnotationLayerData, type AnnotationsLayerProps } from './types';
  import { StageMode, type Callbacks, type DisplayProps } from '../Stage/types';
  import LayerInput from '../LayerInput/LayerInput.svelte';
  import { SceneLayer } from '../Scene/types';
  import AnnotationMaterial from './AnnotationMaterial.svelte';
  import { LazyBrushManager } from '../../helpers/lazyBrush';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: AnnotationsLayerProps;
    mode: StageMode;
    isActive: boolean;
    display: DisplayProps;
    sceneZoom: number;
  }

  const { props, mode, isActive, display, sceneZoom, ...meshProps }: Props = $props();

  const onAnnotationUpdate = getContext<Callbacks>('callbacks').onAnnotationUpdate;

  let mesh: THREE.Mesh = $state(new THREE.Mesh());
  let drawing = false;

  // Export drawing state so parent can check it
  export function isDrawing() {
    return drawing;
  }

  // If mouse leaves the drawing area, we need to reset the start position
  // when it re-enters the drawing area to prevent the drawing from "jumping"
  // to the new point
  let lastPos: THREE.Vector2 | null = null;

  // Track if cursors are hidden to avoid redundant resets
  let cursorsHidden = false;

  // Initialize lazy brush for smooth drawing
  // Base values for zoom level 1.0
  const BASE_RADIUS = 20;
  const BASE_FRICTION = 0.05;

  const lazyBrush = new LazyBrushManager({
    radius: BASE_RADIUS,
    enabled: true,
    friction: BASE_FRICTION
  });

  // Adjust lazy brush settings based on zoom level
  $effect(() => {
    // Scale radius inversely with zoom - less smoothing when zoomed in
    // At zoom 2x, radius is 25 (half)
    // At zoom 0.5x, radius is 100 (double)
    const adjustedRadius = BASE_RADIUS / sceneZoom;

    // Adjust friction based on zoom - more responsive when zoomed in
    // At high zoom (>2), reduce friction for more immediate response
    // At low zoom (<0.5), increase friction for smoother lines
    const adjustedFriction =
      sceneZoom > 2 ? BASE_FRICTION * 0.5 : sceneZoom < 0.5 ? BASE_FRICTION * 1.5 : BASE_FRICTION;

    lazyBrush.updateConfig({
      radius: Math.max(5, Math.min(100, adjustedRadius)), // Clamp between 5 and 100
      friction: adjustedFriction
    });
  });

  // Reference to the child layers
  let layers: AnnotationMaterial[] = $state([]);

  // Get the currently active layer
  let activeLayer = $derived(
    layers.find((layer) => {
      if (!layer) return false;
      return layer.getId() === props.activeLayer;
    })
  );

  // Whenever the tool type changes, we need to reset the drawing state
  $effect(() => {
    if (!isActive) {
      lastPos = null;
      drawing = false;
      lazyBrush.reset();
      // Reset cursor for all layers to ensure no ghosting
      if (!cursorsHidden) {
        layers.forEach((layer) => {
          if (layer) {
            layer.revertChanges();
            layer.resetCursor();
          }
        });
        cursorsHidden = true;
      }
    } else {
      // Tool is active again
      cursorsHidden = false;
    }
  });

  // Also reset cursor when active layer becomes null
  $effect(() => {
    if (!props.activeLayer && layers.length > 0) {
      // No active layer selected, reset all cursors and revert changes
      lastPos = null; // Reset last position to prevent cursor from appearing
      if (!cursorsHidden) {
        layers.forEach((layer) => {
          if (layer) {
            layer.revertChanges();
            layer.resetCursor();
          }
        });
        cursorsHidden = true;
      }
    } else if (props.activeLayer) {
      // Active layer selected again
      cursorsHidden = false;
    }
  });

  function onMouseDown(e: Event, p: THREE.Vector2 | null) {
    e.preventDefault();
    lastPos = p;
    drawing = true;

    // Start a new stroke with lazy brush
    if (p) {
      // Need to adjust for display offset before starting stroke
      const adjustedP = p.clone();
      adjustedP.add(new THREE.Vector2(display.resolution.x / 2, display.resolution.y / 2));
      lazyBrush.startStroke(adjustedP);
    }

    draw(e, p);
  }

  function onMouseUp() {
    // If we have just finished drawing, save the annotation
    if (props.activeLayer && drawing) {
      onAnnotationUpdate(props.activeLayer, toPng());
    }

    // Reset the drawing state
    drawing = false;
    lazyBrush.endStroke();
    // Don't reset lastPos here to prevent cursor jumping
  }

  function onMouseLeave() {
    lastPos = null;
    drawing = false;
    lazyBrush.reset();

    // Revert changes and hide cursor
    if (activeLayer && !cursorsHidden) {
      activeLayer.revertChanges();
      activeLayer.resetCursor();
    }
  }

  function draw(_: Event, p: THREE.Vector2 | null) {
    // If the mouse is not within the drawing area, hide cursor
    if (!p) {
      // Reset cursor for all layers when mouse leaves (only if not already hidden)
      if (!cursorsHidden) {
        layers.forEach((layer) => {
          if (layer) {
            layer.resetCursor();
          }
        });
      }
      return;
    }

    // Only process if we have an active layer and the annotation tool is active
    if (!activeLayer || !isActive || !props.activeLayer) {
      // Make sure all cursors are hidden when not active (only if not already hidden)
      if (!cursorsHidden) {
        layers.forEach((layer) => {
          if (layer) {
            layer.resetCursor();
          }
        });
        cursorsHidden = true;
      }
      return;
    }

    // Tool is active and we have a valid position
    cursorsHidden = false;

    p.add(new THREE.Vector2(display.resolution.x / 2, display.resolution.y / 2));

    // Use lazy brush for smooth drawing when drawing is active
    if (drawing && lazyBrush.enabled) {
      // Update lazy brush and get smoothed points
      const segments = lazyBrush.updateStroke(p);

      // Draw each segment (segments come as pairs: [lastPoint, newPoint])
      for (let i = 0; i < segments.length; i += 2) {
        if (segments[i] && segments[i + 1]) {
          // Draw from last point to new point
          activeLayer.drawPath(segments[i + 1], segments[i], true);
        }
      }

      // Update cursor to show brush position
      const brushPos = lazyBrush.getBrushPosition();
      if (brushPos) {
        activeLayer.drawPath(brushPos, brushPos, false);
      } else {
        // Show cursor at actual position if no brush position
        activeLayer.drawPath(p, p, false);
      }
    } else if (drawing && !lazyBrush.enabled) {
      // Drawing but lazy brush is disabled
      if (!lastPos) {
        lastPos = p.clone();
      }
      activeLayer.drawPath(p, lastPos, true);
      lastPos = p.clone();
    } else {
      // Just hovering, show cursor
      activeLayer.drawPath(p, p, false);
    }
  }

  function isVisible(layer: AnnotationLayerData) {
    // Don't show DM layers to players
    return !(mode === StageMode.Player && layer.visibility === StageMode.DM);
  }

  /**
   * Clears the annotation layer
   */
  export function clear(layerId: string) {
    if (layerId) {
      const layer = layers.find((layer) => layer.getId() === layerId);
      if (layer) {
        layer.clear();
        onAnnotationUpdate(layerId, toPng());
      }
    }
  }

  /**
   * Serializes the annotation layer image data into a binary buffer
   * @return A binary buffer
   */
  export async function toPng(): Promise<Blob> {
    // For now, return the active layer's PNG or an empty blob
    return (await activeLayer?.toPng()) ?? new Blob();
  }
</script>

<LayerInput
  id="annotation"
  {isActive}
  layerSize={{ width: 1, height: 1 }}
  target={mesh}
  {onMouseDown}
  onMouseMove={draw}
  {onMouseUp}
  {onMouseLeave}
/>

<!--
Invisible mesh used for input detection.
The plane geometry is larger than the map size to allow cursor
events to be detected outside of the fog of war layer.
-->
<T.Mesh bind:ref={mesh} name="annotationInput" layers={isActive ? [SceneLayer.Input] : undefined}>
  <T.MeshBasicMaterial visible={false} />
  <T.PlaneGeometry args={[2 * display.resolution.x, 2 * display.resolution.y]} />
</T.Mesh>

<T.Mesh name="annotationLayer" scale={[display.resolution.x, display.resolution.y, 1]} {...meshProps}>
  {#each props.layers as layer, index (layer.id)}
    <T.Mesh
      name={layer.id}
      visible={isVisible(layer)}
      position.z={(props.layers.length - index) * 0.001}
      {...meshProps}
    >
      <AnnotationMaterial bind:this={layers[index]} props={layer} {display} lineWidth={props.lineWidth} />
      <T.PlaneGeometry />
    </T.Mesh>
  {/each}
</T.Mesh>
