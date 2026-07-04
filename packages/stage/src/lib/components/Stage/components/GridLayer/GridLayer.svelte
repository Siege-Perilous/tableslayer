<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { type GridLayerProps } from './types';
  import { type DisplayProps } from '../Stage/types';
  import GridMaterial from './GridMaterial.svelte';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    grid: GridLayerProps;
    display: DisplayProps;
    sceneZoom: number;
    /** Display pixels per local pixel (map.zoom when anchored to the map in MapDefined mode) */
    localScale?: number;
  }

  const { grid, display, sceneZoom, localScale = 1, ...meshProps }: Props = $props();
</script>

<T.Mesh name="gridLayer" scale={[display.resolution.x, display.resolution.y, 1]} {...meshProps}>
  <GridMaterial {grid} {display} {sceneZoom} {localScale} />
  <T.PlaneGeometry />
</T.Mesh>
