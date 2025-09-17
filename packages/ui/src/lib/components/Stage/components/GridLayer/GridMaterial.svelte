<script lang="ts">
  import * as THREE from 'three';
  import type { GridLayerProps } from './types';
  import type { DisplayProps } from '../Stage/types';
  import fragmentShader from '../../shaders/GridShader.frag?raw';
  import vertexShader from '../../shaders/default.vert?raw';
  import { T, useThrelte } from '@threlte/core';

  interface Props {
    grid: GridLayerProps;
    display: DisplayProps;
    sceneZoom: number;
  }

  let { invalidate } = useThrelte();
  const { grid, display, sceneZoom }: Props = $props();

  let material = new THREE.ShaderMaterial({
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
      uFixedGridCountY: new THREE.Uniform(grid.fixedGridCount?.y || 17)
    }
  });

  $effect(() => {
    material.uniforms.uOpacity.value = grid.opacity;
    material.uniforms.uSceneScale.value = sceneZoom;
    material.uniforms.uGridType.value = grid.gridType;
    material.uniforms.uGridMode.value = grid.gridMode || 0;
    material.uniforms.uSpacing_in.value = grid.spacing;
    material.uniforms.uPadding_px.value = display.padding;
    material.uniforms.uLineThickness.value = grid.lineThickness;
    material.uniforms.uLineColor.value = new THREE.Color(grid.lineColor);
    material.uniforms.uShadowOpacity.value = grid.shadowOpacity;
    material.uniforms.uShadowBlur.value = grid.shadowBlur;
    material.uniforms.uShadowSpread.value = grid.shadowSpread;
    material.uniforms.uShadowColor.value = new THREE.Color(grid.shadowColor);
    material.uniforms.uResolution_px.value = new THREE.Vector2(display.resolution.x, display.resolution.y);
    material.uniforms.uDisplaySize_in.value = new THREE.Vector2(display.size.x, display.size.y);
    material.uniforms.uFixedGridCountX.value = grid.fixedGridCount?.x || 24;
    material.uniforms.uFixedGridCountY.value = grid.fixedGridCount?.y || 17;

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
