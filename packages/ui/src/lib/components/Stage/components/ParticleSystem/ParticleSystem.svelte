<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte } from '@threlte/core';
  import { ParticleImageURLs } from './types';
  import type { ParticleProps } from './types';
  import { onMount } from 'svelte';

  interface Props {
    props: ParticleProps;
  }

  const { props }: Props = $props();
  const { invalidate } = useThrelte();

  // Create geometry with custom attributes
  const geometry = new THREE.BufferGeometry();

  // Initialize particle attributes
  const positions = new Float32Array(props.count * 3);
  const velocities = new Float32Array(props.count * 3);
  const ages = new Float32Array(props.count);
  const seeds = new Float32Array(props.count);

  // Initialize particles
  for (let i = 0; i < props.count; i++) {
    // Random position within spawn area
    positions[i * 3] = (Math.random() - 0.5) * props.spawnArea.width;
    positions[i * 3 + 1] = (Math.random() - 0.5) * props.spawnArea.height;
    positions[i * 3 + 2] = 0;

    // Initial velocity
    velocities[i * 3] = props.velocity.x;
    velocities[i * 3 + 1] = props.velocity.y;
    velocities[i * 3 + 2] = props.velocity.z;

    // Random age and seed
    ages[i] = Math.random() * props.lifetime;
    seeds[i] = Math.random();
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));

  // Create particle material
  const texture = new THREE.TextureLoader().load(ParticleImageURLs[props.type].url);
  const material = new THREE.PointsMaterial({
    size: 100,
    map: texture,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    vertexColors: true
  });

  // Update particle system
  onMount(() => {
    const positions = geometry.attributes.position.array;
    const velocities = geometry.attributes.velocity.array;
    const ages = geometry.attributes.age.array;

    for (let i = 0; i < props.count; i++) {
      // Reset particle if lifetime exceeded
      if (ages[i] > props.lifetime) {
        positions[i * 3] = (Math.random() - 0.5) * props.spawnArea.width;
        positions[i * 3 + 1] = (Math.random() - 0.5) * props.spawnArea.height;
        positions[i * 3 + 2] = -100;
        ages[i] = 0;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.velocity.needsUpdate = true;
    geometry.attributes.age.needsUpdate = true;

    invalidate();
  });

  $effect(() => {
    material.color = new THREE.Color(props.color);
  });
</script>

<T.Points {geometry} {material} />
