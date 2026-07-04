<script lang="ts">
  import * as THREE from 'three';
  import type { GridLayerProps } from './types';
  import type { DisplayProps } from '../Stage/types';
  import { clippingPlaneStore } from '../../helpers/clippingPlaneStore.svelte';
  import fragmentShader from '../../shaders/GridShader.frag?raw';
  import vertexShader from '../../shaders/default.vert?raw';
  import { T, useThrelte } from '@threlte/core';

  interface Props {
    grid: GridLayerProps;
    display: DisplayProps;
    sceneZoom: number;
    /** Display pixels per local pixel (map.zoom when anchored to the map in MapDefined mode) */
    localScale?: number;
  }

  let { invalidate } = useThrelte();
  const { grid, display, sceneZoom, localScale = 1 }: Props = $props();

  let material = new THREE.ShaderMaterial({
    defines: {
      NUM_CLIPPING_PLANES: 4
    },
    uniforms: {
      uOpacity: new THREE.Uniform(grid.opacity),
      uGridType: new THREE.Uniform(grid.gridType),
      uGridMode: new THREE.Uniform(grid.gridMode || 0),
      uSpacing_in: new THREE.Uniform(grid.spacing),
      uPadding_px: new THREE.Uniform(display.padding),
      uLineThickness: new THREE.Uniform(grid.lineThickness),
      uLineColor: new THREE.Uniform(new THREE.Color(grid.lineColor)),
      uShadowOpacity: new THREE.Uniform(grid.shadowOpacity),
      uShadowBlur: new THREE.Uniform(grid.shadowBlur),
      uShadowSpread: new THREE.Uniform(grid.shadowSpread),
      uShadowColor: new THREE.Uniform(new THREE.Color(grid.shadowColor)),
      uSceneScale: new THREE.Uniform(1),
      uResolution_px: new THREE.Uniform(new THREE.Vector2(0, 0)),
      uDisplaySize_in: new THREE.Uniform(new THREE.Vector2(0, 0)),
      uFixedGridCountX: new THREE.Uniform(grid.fixedGridCount?.x || 24),
      uFixedGridCountY: new THREE.Uniform(grid.fixedGridCount?.y || 17),
      uClippingPlanes: new THREE.Uniform(
        clippingPlaneStore.value.map((p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant))
      )
    }
  });

  $effect(() => {
    material.uniforms.uOpacity.value = grid.opacity;
    // The shader works in local pixels; fold localScale into the scene scale
    // and express the line thickness in local pixels so on-screen thickness
    // stays constant (both are identity in FillSpace where localScale is 1)
    material.uniforms.uSceneScale.value = sceneZoom * localScale;
    material.uniforms.uGridType.value = grid.gridType;
    material.uniforms.uGridMode.value = grid.gridMode || 0;
    material.uniforms.uSpacing_in.value = grid.spacing;
    material.uniforms.uPadding_px.value = display.padding;
    material.uniforms.uLineThickness.value = grid.lineThickness / localScale;
    // Use .set() to avoid allocating new objects
    material.uniforms.uLineColor.value.set(grid.lineColor);
    material.uniforms.uShadowOpacity.value = grid.shadowOpacity;
    material.uniforms.uShadowBlur.value = grid.shadowBlur;
    material.uniforms.uShadowSpread.value = grid.shadowSpread;
    material.uniforms.uShadowColor.value.set(grid.shadowColor);
    material.uniforms.uResolution_px.value.set(display.resolution.x, display.resolution.y);
    material.uniforms.uDisplaySize_in.value.set(display.size.x, display.size.y);
    material.uniforms.uFixedGridCountX.value = grid.fixedGridCount?.x || 24;
    material.uniforms.uFixedGridCountY.value = grid.fixedGridCount?.y || 17;
    // Update clipping planes in place to avoid allocating new Vector4 objects
    const planes = clippingPlaneStore.value;
    for (let i = 0; i < planes.length; i++) {
      const p = planes[i];
      material.uniforms.uClippingPlanes.value[i].set(p.normal.x, p.normal.y, p.normal.z, p.constant);
    }
    material.uniformsNeedUpdate = true;

    invalidate();
  });
</script>

{#snippet attachMaterial()}
  {material}
{/snippet}

<!-- Export the material to be used in the parent component -->
<T is={material} {fragmentShader} {vertexShader} transparent={true} depthTest={false}>
  {@render attachMaterial()}
</T>
