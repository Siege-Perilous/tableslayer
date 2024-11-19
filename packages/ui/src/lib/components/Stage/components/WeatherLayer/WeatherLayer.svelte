<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask } from '@threlte/core';
  import { type WeatherProps } from './types';
  import { WeatherMaterial } from '../../materials/WeatherMaterial';
  import { onMount } from 'svelte';

  interface Props {
    props: WeatherProps;
    z: number;
    resolution: { x: number; y: number };
  }

  const { props, z, resolution }: Props = $props();
  let time = $state(0);

  // svelte-ignore non_reactive_update
  let quad: THREE.Mesh;
  let material = new WeatherMaterial(props);

  onMount(() => {
    if (quad) {
      quad.material = material;
    }
  });

  $effect(() => {
    material.uniforms.uResolution.value = new THREE.Vector2(resolution.x, resolution.y);
    material.updateProps(props);
  });

  useTask((dt) => {
    time += dt;
    material.uniforms.uTime.value = time;
  });
</script>

<T.Mesh bind:ref={quad} position={[0, 0, z]} scale={[resolution.x, resolution.y, 1]}>
  <T.PlaneGeometry />
</T.Mesh>
