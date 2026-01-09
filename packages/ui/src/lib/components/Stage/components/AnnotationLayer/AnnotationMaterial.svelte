<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask } from '@threlte/core';
  import chroma from 'chroma-js';
  import DrawingMaterial from '../DrawingLayer/DrawingMaterial.svelte';
  import { type AnnotationLayerData, AnnotationEffect } from './types';
  import { clippingPlaneStore } from '../../helpers/clippingPlaneStore.svelte';
  import { DrawMode, ToolType, InitialState } from '../DrawingLayer/types';
  import type { DisplayProps } from '../Stage/types';

  import annotationEffectsFragmentShader from '../../shaders/AnnotationEffects.frag?raw';
  import annotationVertexShader from '../../shaders/default.vert?raw';

  interface Props {
    props: AnnotationLayerData;
    display: DisplayProps;
    lineWidth?: number;
  }

  const { props, display, lineWidth = 2.0 }: Props = $props();

  const lineWidthPixels = $derived.by(() => {
    const textureSize = Math.min(display.resolution.x, display.resolution.y);
    return Math.round(textureSize * (lineWidth / 100));
  });

  let size = $derived({ width: display.resolution.x, height: display.resolution.y });

  let drawMaterial: DrawingMaterial;

  const hexToRGB = (hex: string): THREE.Vector3 => {
    const [r, g, b] = chroma(hex).gl();
    return new THREE.Vector3(r, g, b);
  };

  // Hardcoded color for Magic effect (saturated purple)
  const MAGIC_EFFECT_COLOR = '#9333ea';

  // Use hardcoded color for Magic effect, otherwise use layer color
  let colorUniform = $derived(
    props.effect?.type === AnnotationEffect.Magic ? hexToRGB(MAGIC_EFFECT_COLOR) : hexToRGB(props.color)
  );

  const getEffectType = () => props.effect?.type ?? AnnotationEffect.None;
  const getEffectSpeed = () => props.effect?.speed ?? 1.0;
  const getEffectIntensity = () => props.effect?.intensity ?? 1.0;
  const getEffectSoftness = () => props.effect?.softness ?? 0.5;
  const getEffectBorder = () => props.effect?.border ?? 0.5;
  const getEffectRoughness = () => props.effect?.roughness ?? 0.0;

  let material = new THREE.ShaderMaterial({
    defines: {
      NUM_CLIPPING_PLANES: 4
    },
    uniforms: {
      uMaskTexture: { value: null },
      uTime: { value: 0.0 },
      uEffectType: { value: getEffectType() },
      uBaseColor: { value: hexToRGB(props.color) },
      uOpacity: { value: props.opacity },
      uSpeed: { value: getEffectSpeed() },
      uIntensity: { value: getEffectIntensity() },
      uSoftness: { value: getEffectSoftness() },
      uBorder: { value: getEffectBorder() },
      uRoughness: { value: getEffectRoughness() },
      uEdgeMinMipMapLevel: { value: 0 },
      uEdgeMaxMipMapLevel: { value: 4 },
      uClippingPlanes: new THREE.Uniform(
        clippingPlaneStore.value.map((p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant))
      )
    },
    transparent: true,
    fragmentShader: annotationEffectsFragmentShader,
    vertexShader: annotationVertexShader
  });

  $effect(() => {
    material.uniforms.uBaseColor.value.copy(colorUniform);
    material.uniforms.uOpacity.value = props.opacity;
    material.uniforms.uEffectType.value = getEffectType();
    material.uniforms.uSpeed.value = getEffectSpeed();
    material.uniforms.uIntensity.value = getEffectIntensity();
    material.uniforms.uSoftness.value = getEffectSoftness();
    material.uniforms.uBorder.value = getEffectBorder();
    material.uniforms.uRoughness.value = getEffectRoughness();
    material.uniforms.uClippingPlanes.value = clippingPlaneStore.value.map(
      (p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant)
    );
    material.uniformsNeedUpdate = true;
  });

  useTask((delta) => {
    material.uniforms.uTime.value += delta;
  });

  export const getId = () => props.id;

  export const revertChanges = () => {
    drawMaterial.revert();
  };

  export const resetCursor = () => {
    if (drawMaterial) {
      drawMaterial.resetCursor();
    }
  };

  export const clear = () => {
    drawMaterial.clear();
  };

  export const drawPath = (start: THREE.Vector2, last: THREE.Vector2 | null = null, persist: boolean = false) => {
    drawMaterial.drawPath(start, last, persist);
  };

  export const toPng = async (): Promise<Blob> => {
    return drawMaterial.toPng();
  };

  export const toRLE = async (): Promise<Uint8Array> => {
    return drawMaterial.toRLE();
  };

  export const fromRLE = async (rleData: Uint8Array, width: number, height: number) => {
    return drawMaterial.fromRLE(rleData, width, height);
  };
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
      size: lineWidthPixels,
      type: ToolType.Brush
    }
  }}
  initialState={InitialState.Clear}
  {size}
  onRender={(texture) => {
    material.uniforms.uBaseColor.value.copy(colorUniform);
    material.uniforms.uMaskTexture.value = texture;
    material.uniformsNeedUpdate = true;
  }}
/>

{#snippet attachMaterial()}
  {material}
{/snippet}

<T is={material}>
  {@render attachMaterial()}
</T>
