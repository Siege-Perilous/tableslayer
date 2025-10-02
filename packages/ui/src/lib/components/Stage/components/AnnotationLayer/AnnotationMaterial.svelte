<script lang="ts">
  import * as THREE from 'three';
  import { T } from '@threlte/core';
  import chroma from 'chroma-js';
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

  // Helper to parse hex color to RGB vector (in sRGB space, 0-1 range)
  // Use chroma-js to avoid Three.js color space conversions
  function hexToRGB(hex: string): THREE.Vector3 {
    const [r, g, b] = chroma(hex).gl();
    console.log('[AnnotationMaterial] hexToRGB:', hex, '→', { r, g, b });
    return new THREE.Vector3(r, g, b);
  }

  // Create reactive uniform values
  let colorUniform = $derived(hexToRGB(props.color));

  // Material used for rendering the annotations
  let annotationMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uMaskTexture: { value: null },
      uColor: { value: colorUniform },
      uOpacity: { value: props.opacity },
      uClippingPlanes: new THREE.Uniform(
        clippingPlaneStore.value.map((p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant))
      )
    },
    transparent: true,
    fragmentShader: annotationFragmentShader,
    vertexShader: annotationVertexShader
  });

  console.log('[AnnotationMaterial] Material initialized with color:', props.color, colorUniform);

  // Whenever the fog of war props change, we need to update the material
  $effect(() => {
    console.log('[AnnotationMaterial] Effect running - color:', props.color, 'uniform:', colorUniform);
    // Update the uniform value in-place rather than replacing the object
    annotationMaterial.uniforms.uColor.value.copy(colorUniform);
    annotationMaterial.uniforms.uOpacity.value = props.opacity;
    annotationMaterial.uniforms.uClippingPlanes.value = clippingPlaneStore.value.map(
      (p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant)
    );
    annotationMaterial.uniformsNeedUpdate = true;
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

  /**
   * Exports the annotation layer state as RLE-encoded data
   * @returns RLE encoded Uint8Array
   */
  export async function toRLE(): Promise<Uint8Array> {
    return drawMaterial.toRLE();
  }

  /**
   * Loads RLE-encoded data into the annotation layer
   * @param rleData RLE encoded data
   * @param width Image width
   * @param height Image height
   */
  export async function fromRLE(rleData: Uint8Array, width: number, height: number) {
    return drawMaterial.fromRLE(rleData, width, height);
  }
</script>

<DrawingMaterial
  bind:this={drawMaterial}
  props={{
    url: props.url,
    opacity: {
      dm: props.opacity,
      player: props.opacity
    },
    tool: {
      mode: DrawMode.Draw,
      size: lineWidth,
      type: ToolType.Brush
    }
  }}
  initialState={InitialState.Clear}
  {size}
  onRender={(texture) => {
    console.log('[AnnotationMaterial] Texture rendered for color:', props.color);
    // Ensure color is correct when texture updates
    annotationMaterial.uniforms.uColor.value.copy(colorUniform);
    annotationMaterial.uniforms.uMaskTexture.value = texture;
    annotationMaterial.uniformsNeedUpdate = true;
  }}
/>

{#snippet attachMaterial()}
  {annotationMaterial}
{/snippet}

<T is={annotationMaterial}>
  {@render attachMaterial()}
</T>
