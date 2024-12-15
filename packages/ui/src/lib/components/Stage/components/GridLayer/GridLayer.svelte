<script lang="ts">
  import { T } from '@threlte/core';
  import { type GridLayerProps } from './types';
  import { type DisplayProps } from '../Stage/types';
  import GridMaterial from '../../materials/GridMaterial.svelte';

  interface Props {
    grid: GridLayerProps;
    display: DisplayProps;
    sceneZoom: number;
  }

  const { grid, display, sceneZoom }: Props = $props();

  $inspect(sceneZoom);
</script>

<T.Mesh scale={[display.resolution.x, display.resolution.y, 1]}>
  <GridMaterial {grid} {display} {sceneZoom} />
  <T.PlaneGeometry />
</T.Mesh>
