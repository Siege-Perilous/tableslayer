<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte } from '@threlte/core';
  import { getContext, onDestroy } from 'svelte';
  import chroma from 'chroma-js';
  import DrawingMaterial from '../DrawingLayer/DrawingMaterial.svelte';
  import { type AnnotationLayerData, AnnotationEffect } from './types';
  import { clippingPlaneStore } from '../../helpers/clippingPlaneStore.svelte';
  import { DrawMode, ToolType, InitialState, peekRLEDimensions } from '../DrawingLayer/types';
  import { convertMaskToMapSpace, rleToDataTexture } from '../../helpers/annotationSpaceConversion';
  import type { MapTransform } from '../../helpers/mapSpace';
  import type { DisplayProps, PerformanceTier } from '../Stage/types';

  import annotationEffectsFragmentShader from '../../shaders/AnnotationEffects.frag?raw';
  import annotationVertexShader from '../../shaders/default.vert?raw';

  interface Props {
    props: AnnotationLayerData;
    display: DisplayProps;
    lineWidthPixels: number;
    /** True while the user is actively drawing on this layer (skip mask re-apply) */
    isDrawingThisLayer?: () => boolean;
    /**
     * Set in MapDefined mode, where the annotation texture is map-sized. A
     * persisted mask whose dimensions equal the real display resolution is
     * legacy display-space data and is re-projected into map space on load.
     */
    conversion?: { realDisplay: DisplayProps; map: MapTransform };
    /** Fired after a legacy mask has been re-projected, so it can be persisted once */
    onMaskConverted?: () => void;
  }

  const {
    props,
    display,
    lineWidthPixels,
    isDrawingThisLayer = () => false,
    conversion,
    onMaskConverted
  }: Props = $props();

  const { renderer } = useThrelte();

  let size = $derived({ width: display.resolution.x, height: display.resolution.y });

  let drawMaterial: DrawingMaterial;

  const stage = getContext<{ performanceTier: PerformanceTier }>('stage');

  // Shader tier index: 0 = high, 1 = medium, 2 = low
  const shaderTier = $derived({ high: 0, medium: 1, low: 2 }[stage.performanceTier ?? 'high']);

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
      uPerformanceTier: { value: shaderTier },
      uClippingPlanes: new THREE.Uniform(
        clippingPlaneStore.value.map((p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant))
      )
    },
    transparent: true,
    depthWrite: false, // Prevent transparent overlay from affecting depth buffer
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
    material.uniforms.uPerformanceTier.value = shaderTier;
    // Update clipping planes in place to avoid allocating new Vector4 objects
    const planes = clippingPlaneStore.value;
    for (let i = 0; i < planes.length; i++) {
      const p = planes[i];
      material.uniforms.uClippingPlanes.value[i].set(p.normal.x, p.normal.y, p.normal.z, p.constant);
    }
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

  /**
   * Loads RLE mask data into the drawing buffer. In MapDefined mode, a mask
   * persisted at the real display resolution (legacy display-space data) is
   * re-projected into the map-sized texture and persisted once via
   * onMaskConverted; everything else loads directly.
   */
  const applyMask = async (rleData: Uint8Array, width: number, height: number) => {
    const dims = peekRLEDimensions(rleData);
    const isLegacyDisplaySpace =
      conversion !== undefined &&
      dims !== null &&
      (dims.width !== size.width || dims.height !== size.height) &&
      dims.width === conversion.realDisplay.resolution.x &&
      dims.height === conversion.realDisplay.resolution.y;

    if (isLegacyDisplaySpace) {
      const { texture } = rleToDataTexture(rleData);
      const target = convertMaskToMapSpace(renderer, texture, dims, size, conversion.map);
      drawMaterial.loadTexture(target.texture);
      texture.dispose();
      target.dispose();
      onMaskConverted?.();
      return;
    }

    return drawMaterial.fromRLE(rleData, width, height);
  };

  export const fromRLE = async (rleData: Uint8Array, width: number, height: number) => {
    return applyMask(rleData, width, height);
  };

  // Declarative mask application: load on mount and whenever the mask reference
  // or canvas size changes (DrawingMaterial clears its render targets on resize).
  // queueMicrotask defers past the current effect flush so this always runs
  // AFTER DrawingMaterial's own resize/clear effect.
  let appliedMask: Uint8Array | null = null;
  let appliedWidth = 0;
  let appliedHeight = 0;
  $effect(() => {
    const mask = props.mask;
    const { width, height } = size;
    if (!mask) {
      // Undo of a layer's first-ever stroke removes the mask entirely; clear the
      // canvas or the drawn pixels would survive the revert
      if (!appliedMask) return;
      queueMicrotask(() => {
        if (!drawMaterial || props.mask || isDrawingThisLayer()) return;
        appliedMask = null;
        drawMaterial.clear();
      });
      return;
    }
    if (mask === appliedMask && width === appliedWidth && height === appliedHeight) return;

    queueMicrotask(() => {
      if (!drawMaterial || !props.mask) return;
      if (isDrawingThisLayer()) return; // a commit follows the stroke anyway
      appliedMask = props.mask;
      appliedWidth = width;
      appliedHeight = height;
      applyMask(props.mask, 1024, 1024);
    });
  });

  onDestroy(() => {
    material.dispose();
  });
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
