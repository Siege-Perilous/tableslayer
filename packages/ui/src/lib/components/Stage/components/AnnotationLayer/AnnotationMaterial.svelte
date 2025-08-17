<script lang="ts">
  import * as THREE from 'three';
  import { T } from '@threlte/core';
  import DrawingMaterial from '../DrawingLayer/DrawingMaterial.svelte';
  import { type AnnotationLayerData } from './types';
  import { clippingPlaneStore } from '../../helpers/clippingPlaneStore.svelte';
  import { DrawMode, ToolType, InitialState } from '../DrawingLayer/types';
  import type { DisplayProps } from '../Stage/types';

  import annotationFragmentShader from '../../shaders/Annotations.frag?raw';
  import annotationVertexShader from '../../shaders/default.vert?raw';

  interface Props {
    props: AnnotationLayerData;
    display: DisplayProps;
    lineWidth?: number;
  }

  const { props, display, lineWidth = 50 }: Props = $props();

  let size = $derived({ width: display.resolution.x, height: display.resolution.y });

  let drawMaterial: DrawingMaterial;

  // Material used for rendering the annotations
  let annotationMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uMaskTexture: { value: null },
      uColor: { value: new THREE.Color(props.color) },
      uOpacity: { value: props.opacity },
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
    annotationMaterial.uniforms.uColor.value = new THREE.Color(props.color);
    annotationMaterial.uniforms.uOpacity.value = props.opacity;
    annotationMaterial.uniforms.uClippingPlanes.value = clippingPlaneStore.value.map(
      (p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant)
    );
  });

  /**
   * Returns the ID of the annotation layer
   * @returns The ID of the annotation layer
   */
  export function getId() {
    return props.id;
  }

  /**
   * Reverts the changes made to the annotation layer
   */
  export function revertChanges() {
    drawMaterial.revert();
  }

  /**
   * Resets the cursor position to hide it
   */
  export function resetCursor() {
    if (drawMaterial) {
      drawMaterial.resetCursor();
    }
  }

  /**
   * Clears the annotation layer
   */
  export function clear() {
    drawMaterial.clear();
  }

  /**
   * Draws a path on the annotation layer
   * @param start The start position of the path
   * @param last The last position of the path
   * @param persist Whether to persist the current state
   */
  export function drawPath(start: THREE.Vector2, last: THREE.Vector2 | null = null, persist: boolean = false) {
    drawMaterial.drawPath(start, last, persist);
  }

  /**
   * Serializes the current annotation layer state to a binary buffer
   * @returns A binary buffer representation of the annotation layer texture
   */
  export async function toPng(): Promise<Blob> {
    return drawMaterial.toPng();
  }
</script>

<DrawingMaterial
  bind:this={drawMaterial}
  props={{
    url: props.url,
    opacity: props.opacity,
    tool: {
      mode: DrawMode.Draw,
      size: lineWidth,
      type: ToolType.Brush
    }
  }}
  initialState={InitialState.Clear}
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
