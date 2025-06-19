<script lang="ts">
  import * as THREE from 'three';
  import { T } from '@threlte/core';
  import DrawingMaterial from '../DrawingLayer/DrawingMaterial.svelte';
  import { type AnnotationLayer } from './types';
  import type { Size } from '../../types';
  import { clippingPlaneStore } from '../../helpers/clippingPlaneStore.svelte';

  import { DrawMode, ToolType } from '../DrawingLayer/types';

  interface Props {
    props: AnnotationLayer;
    mapSize: Size | null;
  }

  const { props, mapSize }: Props = $props();

  let drawMaterial: DrawingMaterial;

  // Material used for rendering the fog of war
  let annotationMaterial = new THREE.MeshBasicMaterial();

  // Whenever the fog of war props change, we need to update the material
  $effect(() => {
    // fogMaterial.uniforms.uClippingPlanes.value = clippingPlaneStore.value.map(
    //   (p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant)
    // );
  });

  /**
   * Reverts the changes made to the fog of war
   */
  export function revertChanges() {
    drawMaterial.revert();
  }

  /**
   * Clears the fog of war
   */
  export function clear() {
    drawMaterial.clear();
  }

  /**
   * Draws a path on the fog of war
   * @param start The start position of the path
   * @param last The last position of the path
   * @param persist Whether to persist the current state
   */
  export function drawPath(start: THREE.Vector2, last: THREE.Vector2 | null = null, persist: boolean = false) {
    drawMaterial.drawPath(start, last, persist);
  }

  /**
   * Serializes the current fog of war state to a binary buffer
   * @returns A binary buffer representation of the fog of war textuare
   */
  export async function toPng(): Promise<Blob> {
    return drawMaterial.toPng();
  }
</script>

<DrawingMaterial
  bind:this={drawMaterial}
  props={{
    url: props.url,
    opacity: 1,
    tool: {
      mode: DrawMode.Draw,
      size: 10,
      type: ToolType.Brush
    }
  }}
  {mapSize}
  onRender={(texture) => {
    annotationMaterial.map = texture;
    annotationMaterial.needsUpdate = true;
  }}
/>

{#snippet attachMaterial()}
  {annotationMaterial}
{/snippet}

<T is={annotationMaterial}>
  {@render attachMaterial()}
</T>
