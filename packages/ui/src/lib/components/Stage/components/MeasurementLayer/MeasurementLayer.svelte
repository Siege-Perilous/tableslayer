<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { type MeasurementLayerProps } from './types';
  import { type DisplayProps } from '../Stage/types';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';
  import { MapLayerType } from '../MapLayer/types';
  import { type GridLayerProps } from '../GridLayer/types';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: MeasurementLayerProps;
    isActive: boolean;
    display: DisplayProps;
    grid: GridLayerProps;
    activeLayer: MapLayerType;
  }

  const { props, isActive, display, grid, activeLayer }: Props = $props();

  // For now, this is a placeholder component
  // We'll add measurement functionality in subsequent steps
</script>

<!-- Measurement Layer -->
<T.Mesh
  name="measurementLayer"
  scale={[display.resolution.x, display.resolution.y, 1]}
  layers={[SceneLayer.Overlay]}
  renderOrder={SceneLayerOrder.Measurement}
  visible={props.enabled && isActive}
>
  <T.MeshBasicMaterial visible={false} />
  <T.PlaneGeometry />
</T.Mesh>
