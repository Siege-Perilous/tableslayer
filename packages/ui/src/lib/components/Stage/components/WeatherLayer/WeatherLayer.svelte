<script lang="ts">
  import { T } from '@threlte/core';
  import * as THREE from 'three';
  import { type WeatherProps } from './types';
  import WeatherMaterial from './WeatherMaterial.svelte';
  import { ParticleType, type ParticleProps } from '../ParticleSystem/types';
  import ParticleSystem from '../ParticleSystem/ParticleSystem.svelte';
  interface Props {
    props: WeatherProps;
    resolution: { x: number; y: number };
  }

  const { props, resolution }: Props = $props();

  const particleProps: ParticleProps = {
    count: 1000,
    type: ParticleType.Circle,
    lifetime: 10,
    spawnArea: { width: 1000, height: 1000 },
    velocity: { x: 0, y: 0, z: 0 },
    forces: { x: () => 0, y: () => 0, z: () => 0 },
    color: '#ffffff'
  };

  // Create a separate perspective camera
  const camera = new THREE.PerspectiveCamera(75, resolution.x / resolution.y, 0.1, 1000);
  camera.position.z = 5;
</script>

<ParticleSystem props={particleProps} />
