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

  let mesh: THREE.Mesh = $state(new THREE.Mesh());
  let material: FogOfWarMaterial | undefined = $state();
  let drawing = false;

  // If mouse leaves the drawing area, we need to reset the start position
  // when it re-enters the drawing area to prevent the drawing from "jumping"
  // to the new point
  let lastPos: THREE.Vector2 | null = null;

  // Whenever the tool type changes, we need to reset the drawing state
  $effect(() => {
    if (props.toolType) {
      lastPos = null;
      drawing = false;
    }
  });

  function onMouseDown(e: MouseEvent, p: THREE.Vector2 | null): void {
    lastPos = flipY(p);
    drawing = true;
    draw(e, p);
  }

  function onMouseUp(e: MouseEvent, p: THREE.Vector2 | null): void {
    const coords = flipY(p);

    // If using shapes, draw the shape outline when the mouse button is released
    if (props.toolType === ToolType.Ellipse || props.toolType === ToolType.Rectangle) {
      if (coords && drawing) {
        material?.drawPath(coords, lastPos, true);
      }
    }

    // Reset the drawing state
    lastPos = null;
    drawing = false;
  }

  function draw(e: MouseEvent, p: THREE.Vector2 | null) {
    if (!p) {
      return;
    }

    // When using shapes, draw the shape outline while the mouse button is held down
    if (props.toolType === ToolType.Ellipse || props.toolType === ToolType.Rectangle) {
      if (p && drawing) {
        // Flip the y-coordinate to match the canvas coordinate system
        const coords = new THREE.Vector2(p.x, mapSize.height - p.y);

        material?.drawPath(coords, lastPos);
      }
    } else {
      // Flip the y-coordinate to match the canvas coordinate system
      const coords = new THREE.Vector2(p.x, mapSize.height - p.y);

      // If this is the first time the mouse has moved, set the last position to the current position
      if (!lastPos) {
        lastPos = coords.clone();
      }

      material?.drawPath(coords, lastPos, drawing);

      lastPos = coords.clone();
    }
  }

  function flipY(p: THREE.Vector2 | null): THREE.Vector2 | null {
    if (!p) return null;
    return new THREE.Vector2(p.x, mapSize.height - p.y);
  }

  /**
   * Clears all fog, revealing the entire map underneath
   */
  export function clearFog() {
    material?.render('clear', true);
  }

  /**
   * Resets the fog to fill the entire layer
   */
  export function resetFog() {
    material?.render('reset', true);
  }

  /**
   * Serializes the fog of war image data into a base-64 string
   * @return A base-64 string
   */
  export function toBase64(): string | null {
    const base64 = material?.toBase64() ?? '';
    console.log(base64);
    return base64;
  }
</script>

<InputManager {isActive} layerSize={mapSize} target={mesh} {onMouseDown} onMouseMove={draw} {onMouseUp} />

<!-- 
Invisible mesh used for input detection.
The plane geometry is larger than the map size to allow cursor 
events to be detected outside of the fog of war layer.
-->
<T.Mesh bind:ref={mesh} name="FogOfWar">
  <T.MeshBasicMaterial transparent={true} opacity={0} />
  <T.PlaneGeometry args={[mapSize.width * 10, mapSize.height * 10]} />
</T.Mesh>

<T.Mesh name="FogOfWar">
  <FogOfWarMaterial bind:this={material} {props} {mapSize} />
  <T.PlaneGeometry />
</T.Mesh>
