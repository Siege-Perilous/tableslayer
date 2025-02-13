<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { type GridLayerProps } from './types';
  import { type DisplayProps } from '../Stage/types';
  import GridMaterial from './GridMaterial.svelte';
  import { SceneLayer } from '../Scene/types';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    grid: GridLayerProps;
    display: DisplayProps;
    sceneZoom: number;
  }

  const { grid, display, sceneZoom, ...meshProps }: Props = $props();
</script>

<T.Mesh name="gridLayer" scale={[display.resolution.x, display.resolution.y, 1]} {...meshProps}>
  <GridMaterial {grid} {display} {sceneZoom} />
  <T.PlaneGeometry />
</T.Mesh>
