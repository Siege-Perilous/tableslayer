<script lang="ts">
  import * as THREE from 'three';
  import { T } from '@threlte/core';
  import DrawingMaterial from '../DrawingLayer/DrawingMaterial.svelte';
  import { type AnnotationLayer } from './types';
  import { clippingPlaneStore } from '../../helpers/clippingPlaneStore.svelte';

  import { DrawMode, ToolType } from '../DrawingLayer/types';
  import type { DisplayProps } from '../Stage/types';

  import annotationFragmentShader from '../../shaders/Annotations.frag?raw';
  import annotationVertexShader from '../../shaders/default.vert?raw';

  interface Props {
    props: AnnotationLayer;
    display: DisplayProps;
    sceneZoom: number;
  }

  const { props, display, sceneZoom }: Props = $props();

  let size = $derived({ width: display.resolution.x, height: display.resolution.y });

  let drawMaterial: DrawingMaterial;

  // Material used for rendering the fog of war
  let annotationMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uMaskTexture: { value: null },
      uColor: { value: new THREE.Color(props.color) },
      uClippingPlanes: new THREE.Uniform(
        clippingPlaneStore.value.map((p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant))
      )
    },
    transparent: true,
    fragmentShader: annotationFragmentShader,
    vertexShader: annotationVertexShader
  });

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
  {size}
  onRender={(texture) => {
    annotationMaterial.uniforms.uMaskTexture.value = texture;
    annotationMaterial.needsUpdate = true;
  }}
/>

{#snippet attachMaterial()}
  {annotationMaterial}
{/snippet}

<T is={annotationMaterial}>
  {@render attachMaterial()}
</T>
