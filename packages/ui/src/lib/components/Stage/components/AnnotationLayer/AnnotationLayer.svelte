<script lang="ts">
  import * as THREE from 'three';
  import { getContext, onDestroy } from 'svelte';
  import { T } from '@threlte/core';
  import { type AnnotationLayerData, type AnnotationsLayerProps, AnnotationEffect } from './types';
  import { StageMode, type Callbacks, type DisplayProps } from '../Stage/types';
  import LayerInput from '../LayerInput/LayerInput.svelte';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';
  import AnnotationMaterial from './AnnotationMaterial.svelte';
  import { LazyBrushManager } from '../../helpers/lazyBrush';
  import { ToolType } from '../DrawingLayer/types';
  import toolOutlineVertexShader from '../../shaders/default.vert?raw';
  import toolOutlineFragmentShader from '../../shaders/ToolOutline.frag?raw';

  interface Props {
    props: AnnotationsLayerProps;
    mode: StageMode;
    isActive: boolean;
    display: DisplayProps;
    sceneZoom: number;
  }

  const { props, mode, isActive, display, sceneZoom }: Props = $props();

  const onAnnotationUpdate = getContext<Callbacks>('callbacks').onAnnotationUpdate;

  // Outline styling (same as fog of war)
  const OUTLINE_COLOR = '#FFFFFF';
  const OUTLINE_OPACITY = 1;
  const OUTLINE_THICKNESS = 2;

  // Convert percentage-based lineWidth to texture pixels for outline
  const lineWidthPixels = $derived.by(() => {
    const textureSize = Math.min(display.resolution.x, display.resolution.y);
    return Math.round(textureSize * ((props.lineWidth ?? 2.0) / 100));
  });

  let mesh: THREE.Mesh = $state(new THREE.Mesh());
  let outlineMesh: THREE.Mesh = $state(new THREE.Mesh());
  let drawing = false;

  // Export drawing state so parent can check it
  export function isDrawing() {
    return drawing;
  }

  // If mouse leaves the drawing area, we need to reset the start position
  // when it re-enters the drawing area to prevent the drawing from "jumping"
  // to the new point
  let lastPos: THREE.Vector2 | null = null;

  // Track the last screen position for the persist button
  let lastScreenPos: { x: number; y: number } | null = null;

  // Track if cursors are hidden to avoid redundant resets
  let cursorsHidden = false;

  // Initialize lazy brush for smooth drawing
  // Base values for zoom level 1.0
  const BASE_RADIUS = 20;
  const BASE_FRICTION = 0.05;

  // Smoothing enabled defaults to true if not specified
  const smoothingEnabled = $derived(props.smoothingEnabled ?? true);

  const lazyBrush = new LazyBrushManager({
    radius: BASE_RADIUS,
    enabled: smoothingEnabled,
    friction: BASE_FRICTION
  });

  // Outline material for brush cursor (same as fog of war)
  const outlineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uStart: { value: new THREE.Vector2(Infinity, Infinity) },
      uEnd: { value: new THREE.Vector2(Infinity, Infinity) },
      uBrushSize: { value: lineWidthPixels },
      uTextureSize: { value: new THREE.Vector2(display.resolution.x, display.resolution.y) },
      uShapeType: { value: ToolType.Brush },
      uOutlineColor: { value: new THREE.Color(OUTLINE_COLOR) },
      uOutlineOpacity: { value: OUTLINE_OPACITY },
      uOutlineThickness: { value: OUTLINE_THICKNESS }
    },
    vertexShader: toolOutlineVertexShader,
    fragmentShader: toolOutlineFragmentShader,
    transparent: true,
    depthTest: false
  });

  onDestroy(() => {
    outlineMaterial.dispose();
  });

  // Adjust lazy brush settings based on zoom level and smoothing toggle
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
      friction: adjustedFriction,
      enabled: smoothingEnabled
    });
  });

  // Update outline material uniforms when props change
  $effect(() => {
    outlineMaterial.uniforms.uTextureSize.value = new THREE.Vector2(display.resolution.x, display.resolution.y);
    outlineMaterial.uniforms.uBrushSize.value = lineWidthPixels;
  });

  // Hide outline when tool is not active
  $effect(() => {
    if (!isActive || !props.activeLayer) {
      outlineMesh.visible = false;
      outlineMaterial.uniforms.uStart.value.set(Infinity, Infinity);
      outlineMaterial.uniforms.uEnd.value.set(Infinity, Infinity);
    }
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

    // Track screen position for persist button
    if (e instanceof MouseEvent) {
      lastScreenPos = { x: e.clientX, y: e.clientY };
    } else if (e instanceof TouchEvent && e.touches[0]) {
      lastScreenPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

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
      onAnnotationUpdate(props.activeLayer, toPng(), lastScreenPos || undefined);
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

    // Hide outline
    outlineMesh.visible = false;
    outlineMaterial.uniforms.uStart.value.set(Infinity, Infinity);
    outlineMaterial.uniforms.uEnd.value.set(Infinity, Infinity);
  }

  function draw(e: Event, p: THREE.Vector2 | null) {
    // Track screen position during drawing for persist button
    if (drawing) {
      if (e instanceof MouseEvent) {
        lastScreenPos = { x: e.clientX, y: e.clientY };
      } else if (e instanceof TouchEvent && e.touches[0]) {
        lastScreenPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }

    // If the mouse is not within the drawing area, hide cursor and outline
    if (!p) {
      // Reset cursor for all layers when mouse leaves (only if not already hidden)
      if (!cursorsHidden) {
        layers.forEach((layer) => {
          if (layer) {
            layer.resetCursor();
          }
        });
      }
      // Hide outline
      outlineMesh.visible = false;
      outlineMaterial.uniforms.uStart.value.set(Infinity, Infinity);
      outlineMaterial.uniforms.uEnd.value.set(Infinity, Infinity);
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
      // Hide outline
      outlineMesh.visible = false;
      outlineMaterial.uniforms.uStart.value.set(Infinity, Infinity);
      outlineMaterial.uniforms.uEnd.value.set(Infinity, Infinity);
      return;
    }

    // Tool is active and we have a valid position
    cursorsHidden = false;

    p.add(new THREE.Vector2(display.resolution.x / 2, display.resolution.y / 2));

    // Show outline at cursor position
    outlineMesh.visible = true;
    outlineMaterial.uniforms.uStart.value.copy(p);
    outlineMaterial.uniforms.uEnd.value.copy(p);

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
        // Update outline to follow lazy brush position
        outlineMaterial.uniforms.uStart.value.copy(brushPos);
        outlineMaterial.uniforms.uEnd.value.copy(brushPos);
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

  function hasEffect(layer: AnnotationLayerData) {
    // Check if the layer has an effect (not None)
    return layer.effect?.type !== undefined && layer.effect.type !== AnnotationEffect.None;
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

  /**
   * Exports the active annotation layer state as RLE-encoded data
   * @returns RLE encoded Uint8Array
   */
  export async function toRLE(): Promise<Uint8Array> {
    return (await activeLayer?.toRLE()) ?? new Uint8Array();
  }

  /**
   * Loads RLE-encoded data into the active annotation layer
   * @param rleData RLE encoded data
   * @param width Image width
   * @param height Image height
   */
  export async function fromRLE(rleData: Uint8Array, width: number, height: number) {
    return activeLayer?.fromRLE(rleData, width, height);
  }

  /**
   * Loads RLE-encoded data into a specific annotation layer by ID
   * @param layerId The ID of the annotation layer
   * @param rleData RLE encoded data
   */
  export async function loadMask(layerId: string, rleData: Uint8Array) {
    // Filter out null entries that may exist before components are rendered
    const layer = layers.find((layer) => layer && layer.getId() === layerId);
    if (layer) {
      return layer.fromRLE(rleData, 1024, 1024);
    }
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

<!-- Brush outline for annotation tool -->
<T.Mesh
  bind:ref={outlineMesh}
  name="annotationToolOutline"
  layers={[SceneLayer.Overlay]}
  scale={[display.resolution.x, display.resolution.y, 1]}
  renderOrder={SceneLayerOrder.Cursor}
>
  <T is={outlineMaterial} transparent={true} depthTest={false} />
  <T.PlaneGeometry />
</T.Mesh>

<!--
Effect annotations render on Main layer (under fog, with post-processing).
Color annotations render on Overlay layer (over fog, no post-processing).
-->
<T.Mesh name="annotationLayer" scale={[display.resolution.x, display.resolution.y, 1]}>
  {#each props.layers as layer, index (layer.id)}
    <T.Mesh
      name={layer.id}
      visible={isVisible(layer)}
      position.z={(props.layers.length - index) * 0.001}
      layers={hasEffect(layer) ? [SceneLayer.Main] : [SceneLayer.Overlay]}
      renderOrder={hasEffect(layer) ? SceneLayerOrder.EffectAnnotation : SceneLayerOrder.Annotation}
    >
      <AnnotationMaterial bind:this={layers[index]} props={layer} {display} lineWidth={props.lineWidth} />
      <T.PlaneGeometry />
    </T.Mesh>
  {/each}
</T.Mesh>
