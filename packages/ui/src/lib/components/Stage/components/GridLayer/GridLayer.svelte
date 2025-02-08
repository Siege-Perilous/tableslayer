<script lang="ts">
  import { T } from '@threlte/core';
  import { type GridLayerProps } from './types';
  import { type DisplayProps } from '../Stage/types';
  import GridMaterial from './GridMaterial.svelte';
  import { SceneLayer } from '../Scene/types';
  interface Props {
    grid: GridLayerProps;
    display: DisplayProps;
    sceneZoom: number;
  }

  const { grid, display, sceneZoom }: Props = $props();
</script>

<T.Mesh name="gridLayer" scale={[display.resolution.x, display.resolution.y, 1]} layers={[SceneLayer.Overlay]}>
  <GridMaterial {grid} {display} {sceneZoom} />
  <T.PlaneGeometry />
</T.Mesh>
