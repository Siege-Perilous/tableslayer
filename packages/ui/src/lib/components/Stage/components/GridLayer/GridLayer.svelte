<script lang="ts">
  import * as THREE from 'three';
  import { T } from '@threlte/core';
  import { type GridLayerProps } from './types';
  import { type DisplayProps } from '../Stage/types';
  import { GridMaterial } from '../../materials/GridMaterial';
  import { onMount } from 'svelte';

  interface Props {
    props: GridLayerProps;
    z: number;
    display: DisplayProps;
    sceneScale: number;
  }

  const { props, z, display, sceneScale }: Props = $props();

  // svelte-ignore non_reactive_update
  let quad: THREE.Mesh;
  let gridMaterial = new GridMaterial(props, display);

  onMount(() => {
    if (quad) {
      quad.material = gridMaterial;
    }
  });

  $effect(() => {
    // The line widths scale inversely with the scene scale so they always appear the same width
    gridMaterial.uniforms.uSceneScale.value = sceneScale;
    gridMaterial.updateProps(props, display);
  });
</script>

<T.Mesh bind:ref={quad} position={[0, 0, z]} scale={[display.resolution.x, display.resolution.y, 1]}>
  <T.PlaneGeometry />
</T.Mesh>
