<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask } from '@threlte/core';
  import DrawingMaterial from '../DrawingLayer/DrawingMaterial.svelte';
  import { type FogOfWarLayerProps } from './types';
  import type { Size } from '../../types';
  import { clippingPlaneStore } from '../../helpers/clippingPlaneStore.svelte';

  import fogVertexShader from '../../shaders/default.vert?raw';
  import fogFragmentShader from '../../shaders/Fog.frag?raw';

  interface Props {
    props: FogOfWarLayerProps;
    mapSize: Size | null;
  }

  const { props, mapSize }: Props = $props();

  let drawMaterial: DrawingMaterial;

  // Material used for rendering the fog of war
  let fogMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uMaskTexture: { value: null },
      uTime: { value: 0.0 },
      uBaseColor: { value: new THREE.Color(props.noise.baseColor) },
      uFogColor1: { value: new THREE.Color(props.noise.fogColor1) },
      uFogColor2: { value: new THREE.Color(props.noise.fogColor2) },
      uFogColor3: { value: new THREE.Color(props.noise.fogColor3) },
      uFogColor4: { value: new THREE.Color(props.noise.fogColor4) },
      uFogSpeed: { value: props.noise.speed },
      uEdgeMinMipMapLevel: { value: props.edge.minMipMapLevel },
      uEdgeMaxMipMapLevel: { value: props.edge.maxMipMapLevel },
      uEdgeFrequency: { value: props.edge.frequency },
      uEdgeAmplitude: { value: props.edge.amplitude },
      uEdgeOffset: { value: props.edge.offset },
      uEdgeSpeed: { value: props.edge.speed },
      uPersistence: { value: props.noise.persistence },
      uLacunarity: { value: props.noise.lacunarity },
      uFrequency: { value: props.noise.frequency },
      uOffset: { value: props.noise.offset },
      uAmplitude: { value: props.noise.amplitude },
      uLevels: { value: props.noise.levels },
      uOpacity: { value: props.opacity },
      uClippingPlanes: new THREE.Uniform(
        clippingPlaneStore.value.map((p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant))
      )
    },
    transparent: true,
    fragmentShader: fogFragmentShader,
    vertexShader: fogVertexShader
  });

  // Whenever the fog of war props change, we need to update the material
  $effect(() => {
    fogMaterial.uniforms.uOpacity.value = props.opacity;

    fogMaterial.uniforms.uBaseColor.value = new THREE.Color(props.noise.baseColor);
    fogMaterial.uniforms.uFogColor1.value = new THREE.Color(props.noise.fogColor1);
    fogMaterial.uniforms.uFogColor2.value = new THREE.Color(props.noise.fogColor2);
    fogMaterial.uniforms.uFogColor3.value = new THREE.Color(props.noise.fogColor3);
    fogMaterial.uniforms.uFogColor4.value = new THREE.Color(props.noise.fogColor4);

    fogMaterial.uniforms.uEdgeMinMipMapLevel.value = props.edge.minMipMapLevel;
    fogMaterial.uniforms.uEdgeMaxMipMapLevel.value = props.edge.maxMipMapLevel;
    fogMaterial.uniforms.uEdgeFrequency.value = props.edge.frequency;
    fogMaterial.uniforms.uEdgeAmplitude.value = props.edge.amplitude;
    fogMaterial.uniforms.uEdgeOffset.value = props.edge.offset;
    fogMaterial.uniforms.uEdgeSpeed.value = props.edge.speed;
    fogMaterial.uniforms.uFogSpeed.value = props.noise.speed;
    fogMaterial.uniforms.uFrequency.value = props.noise.frequency;
    fogMaterial.uniforms.uPersistence.value = props.noise.persistence;
    fogMaterial.uniforms.uLacunarity.value = props.noise.lacunarity;
    fogMaterial.uniforms.uLevels.value = props.noise.levels;
    fogMaterial.uniforms.uOffset.value = props.noise.offset;
    fogMaterial.uniforms.uAmplitude.value = props.noise.amplitude;

    fogMaterial.uniforms.uClippingPlanes.value = clippingPlaneStore.value.map(
      (p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant)
    );
  });

  useTask((delta) => {
    fogMaterial.uniforms.uTime.value += delta;
  });

  /**
   * Reverts the changes made to the fog of war
   */
  export function revertChanges() {
    drawMaterial.render('revert', true);
  }

  /**
   * Clears the fog of war
   */
  export function clear() {
    drawMaterial.render('clear', true);
  }

  /**
   * Fills the fog of war
   */
  export function fill() {
    drawMaterial.render('fill', true);
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
  {props}
  {mapSize}
  onRender={(texture) => {
    fogMaterial.uniforms.uMaskTexture.value = texture;
    fogMaterial.uniformsNeedUpdate = true;
  }}
/>

{#snippet attachMaterial()}
  {fogMaterial}
{/snippet}

<T is={fogMaterial}>
  {@render attachMaterial()}
</T>
