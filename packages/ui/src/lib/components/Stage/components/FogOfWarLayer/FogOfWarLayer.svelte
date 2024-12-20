<script lang="ts">
  import * as THREE from 'three';
  import { T, type Size } from '@threlte/core';
  import { ToolType, type FogOfWarLayerProps } from './types';
  import { getContext } from 'svelte';
  import { Tool, type DrawingTool } from './tools/types';
  import InputManager from '../InputManager/InputManager.svelte';
  import type { Callbacks } from '../Stage/types';
  import FogOfWarMaterial from '../../materials/FogOfWarMaterial.svelte';

  interface Props {
    props: FogOfWarLayerProps;
    isActive: boolean;
    mapSize: Size;
  }

  const { props, isActive, mapSize }: Props = $props();

  const onBrushSizeUpdated = getContext<Callbacks>('callbacks').onBrushSizeUpdated;

  let mesh: THREE.Mesh = $state(new THREE.Mesh());
  let material: FogOfWarMaterial | undefined = $state();
  let drawing = false;
  let activeTool: DrawingTool;

  // If mouse leaves the drawing area, we need to reset the start position
  // when it re-enters the drawing area to prevent the drawing from "jumping"
  // to the new point
  let lastPos: THREE.Vector2 | null = null;
  let resetPos = false;

  // Update the active tool when the tool type changes
  $effect(() => {
    switch (props.toolType) {
      case ToolType.RoundBrush:
        activeTool = new Tool.RoundBrush(props.brushSize);
        break;
      case ToolType.SquareBrush:
        activeTool = new Tool.SquareBrush(props.brushSize);
        break;
      case ToolType.Rectangle:
        activeTool = new Tool.Rectangle();
        break;
      case ToolType.Ellipse:
        activeTool = new Tool.Ellipse();
        break;
    }
  });

  function onMouseDown(e: MouseEvent, p: THREE.Vector2 | null): void {
    if (!p) return;

    drawing = true;
    activeTool.origin = p;
  }

  async function onMouseUp(e: MouseEvent, p: THREE.Vector2 | null): Promise<void> {
    if (!p || !material) return;

    await material.persistChanges();
    lastPos = null;
    drawing = false;
  }

  function onMouseMove(e: MouseEvent, p: THREE.Vector2 | null): void {
    if (!activeTool || !material) return;

    if (!p) {
      // Mouse is outside canvas, reset the start position
      resetPos = true;
      return;
    }

    // When using shapes, draw the shape outline while the mouse button is held down
    if (props.toolType === ToolType.Ellipse || props.toolType === ToolType.Rectangle) {
      // TODO
    } else {
      // Otherwise, we are using a brush. Paint with the brush when the mouse button is
      // held down and show the outline when the mouse button is up
      if (drawing) {
        // If mouse left the canvas area, reset the line start position
        if (resetPos) {
          resetPos = false;
          activeTool.origin = p;
        }

        const coords = new THREE.Vector2(p.x, mapSize.height - p.y);

        if (!lastPos) {
          lastPos = coords;
        }

        material.drawPath(activeTool, lastPos, coords);

        lastPos = coords;
      } else {
        activeTool.updateOverlay(e, p);
      }
    }
  }

  function onWheel(e: WheelEvent) {
    const newBrushSize = Math.max(1, Math.min(props.brushSize + e.deltaY, 1000));
    onBrushSizeUpdated(newBrushSize);
  }
  /**
   * Clears all fog, revealing the entire map underneath
   */
  export function clearFog() {
    // TODO
  }

  /**
   * Resets the fog to fill the entire layer
   */
  export function resetFog() {
    // TODO
  }

  /**
   * Serializes the fog of war image data into a base-64 string
   * @return A base-64 string
   */
  export function toBase64(): string {
    // TODO
    return '';
  }
</script>

<InputManager {isActive} layerSize={mapSize} target={mesh} {onMouseDown} {onMouseMove} {onMouseUp} {onWheel} />

<T.Mesh bind:ref={mesh} name="FogOfWar">
  <FogOfWarMaterial bind:this={material} {props} {mapSize} />
  <T.PlaneGeometry />
</T.Mesh>
