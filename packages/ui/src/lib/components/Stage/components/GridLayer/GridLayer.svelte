<script lang="ts">
  import * as THREE from 'three';
  import { T, useThrelte } from '@threlte/core';
  import { type GridProps } from './types';
  import { GridMaterial } from '../../materials/GridMaterial';
  import { onMount } from 'svelte';

  interface Props {
    props: GridProps;
    resolution: { x: number; y: number };
  }

  const { props, resolution }: Props = $props();
  const { size } = useThrelte();

  let quad: THREE.Mesh;
  let gridMaterial = new GridMaterial(props);

  onMount(() => {
    if (quad) {
      quad.material = gridMaterial;
    }
  });

  $effect(() => {
    gridMaterial.resolution = new THREE.Vector2($size.width, $size.height);
    gridMaterial.updateProps(props);
  });
</script>

<T.Mesh bind:ref={quad} position={[0, 0, -1]} scale={[resolution.x, resolution.y, 1]}>
  <T.PlaneGeometry />
</T.Mesh>
