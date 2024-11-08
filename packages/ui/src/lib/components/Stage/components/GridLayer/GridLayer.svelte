<script lang="ts">
  import * as THREE from 'three';
  import { T } from '@threlte/core';
  import { type GridLayerProps } from './types';
  import { GridMaterial } from '../../materials/GridMaterial';
  import { onMount } from 'svelte';

  interface Props {
    props: GridLayerProps;
    resolution: { x: number; y: number };
    sceneScale: number;
  }

  const { props, resolution, sceneScale }: Props = $props();

  let quad: THREE.Mesh;
  let gridMaterial = new GridMaterial(props);

  onMount(() => {
    if (quad) {
      quad.material = gridMaterial;
    }
  });

  $effect(() => {
    gridMaterial.uniforms.uResolution.value = new THREE.Vector2(resolution.x, resolution.y);
    gridMaterial.uniforms.sceneScale.value = sceneScale;
    gridMaterial.updateProps(props);
  });
</script>

<T.Mesh bind:ref={quad} position={[0, 0, -1]} scale={[resolution.x, resolution.y, 1]}>
  <T.PlaneGeometry />
</T.Mesh>
