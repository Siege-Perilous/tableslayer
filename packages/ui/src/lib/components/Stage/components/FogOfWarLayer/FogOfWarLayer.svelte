<script lang="ts">
  import * as THREE from 'three';
  import { T, type Size } from '@threlte/core';
  import { ToolType, type FogOfWarLayerProps } from './types';
  import { getContext } from 'svelte';
  import InputManager from '../InputManager/InputManager.svelte';
  import type { Callbacks } from '../Stage/types';
  import FogOfWarMaterial from './FogOfWarMaterial.svelte';

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

  // If mouse leaves the drawing area, we need to reset the start position
  // when it re-enters the drawing area to prevent the drawing from "jumping"
  // to the new point
  let lastPos: THREE.Vector2 | null = null;

  function onMouseDown(e: MouseEvent, p: THREE.Vector2 | null): void {
    if (!p) return;
    drawing = true;
  }

  async function onMouseUp(e: MouseEvent, p: THREE.Vector2 | null): Promise<void> {
    lastPos = null;
    drawing = false;
  }

  function onMouseLeave(e: MouseEvent, p: THREE.Vector2 | null): void {
    lastPos = null;
    console.log('onMouseLeave');
  }

  function onMouseMove(e: MouseEvent, p: THREE.Vector2 | null): void {
    if (!material || !p) {
      lastPos = null;
      return;
    }

    // When using shapes, draw the shape outline while the mouse button is held down
    if (props.toolType === ToolType.Ellipse || props.toolType === ToolType.Rectangle) {
      // TODO
    } else {
      // Otherwise, we are using a brush. Paint with the brush when the mouse button is
      // held down and show the outline when the mouse button is up
      if (!drawing) return;

      // Flip the y-coordinate to match the canvas coordinate system
      const coords = new THREE.Vector2(p.x, mapSize.height - p.y);

      // If this is the first time the mouse has moved, set the last position to the current position
      if (!lastPos) {
        lastPos = coords;
      }

      // Draw the path between the last position and the current position
      material.drawPath(lastPos, coords, props.brushSize, props.drawMode);

      // Update the last position to the current position
      lastPos = coords;
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
    if (!material) return;
    material.fill(true);
    material.fill(true);
  }

  /**
   * Resets the fog to fill the entire layer
   */
  export function resetFog() {
    if (!material) return;
    material.fill(false);
    material.fill(false);
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

<InputManager
  {isActive}
  layerSize={mapSize}
  target={mesh}
  {onMouseDown}
  {onMouseMove}
  {onMouseLeave}
  {onMouseUp}
  {onWheel}
/>

<T.Mesh bind:ref={mesh} name="FogOfWar">
  <FogOfWarMaterial bind:this={material} {props} {mapSize} />
  <T.PlaneGeometry />
</T.Mesh>
