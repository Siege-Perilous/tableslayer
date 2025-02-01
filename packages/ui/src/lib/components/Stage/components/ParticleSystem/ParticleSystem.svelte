<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask } from '@threlte/core';
  import { ParticleImageURLs } from './types';
  import type { ParticleSystemProps } from './types';

  import fragmentShader from '../../shaders/Particles.frag?raw';
  import vertexShader from '../../shaders/Particles.vert?raw';

  interface Props {
    props: ParticleSystemProps;
  }

  const { props }: Props = $props();

  const geometry = $derived.by(() => {
    const geometry = new THREE.BufferGeometry();

    // Initialize particle attributes
    const positions = new Float32Array(props.count * 3);
    const velocities = new Float32Array(props.count * 3);
    const sizes = new Float32Array(props.count);
    const seeds = new Float32Array(props.count);
    const ageOffsets = new Float32Array(props.count);

    // Initialize particles
    for (let i = 0; i < props.count; i++) {
      // Generate within a disk
      const radius = 0.2 + Math.random();
      const angle = Math.random() * 2 * Math.PI;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      // Random position within spawn area
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = -1;

      // Initial velocity
      velocities[i * 3] = props.initialVelocity.x;
      velocities[i * 3 + 1] = props.initialVelocity.y;
      velocities[i * 3 + 2] = props.initialVelocity.z;

      // Random age and seed
      ageOffsets[i] = Math.random() * props.lifetime;
      seeds[i] = Math.random();
      sizes[i] = Math.random() * (props.size.max - props.size.min) + props.size.min;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('ageOffset', new THREE.BufferAttribute(ageOffsets, 1));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geometry;
  });

  const material = new THREE.ShaderMaterial();
  const loader = new THREE.TextureLoader();

  // Particle texture
  const texture = $derived(loader.load(ParticleImageURLs[props.type].url));

  // Create a derived value for uniforms that updates when props change
  const uniforms = $derived({
    uTime: { value: 0 },
    uTexture: { value: texture },
    uOpacity: { value: props.opacity },
    uColor: { value: new THREE.Color(props.color) },

    uLifetime: { value: props.lifetime },
    uInitialVelocity: { value: props.initialVelocity },
    uLinearForceAmplitude: { value: props.force.linear },
    uExponentialForceAmplitude: { value: props.force.exponential },
    uSinusoidalForceAmplitude: { value: props.force.sinusoidal.amplitude },
    uSinusoidalForceFrequency: { value: props.force.sinusoidal.frequency },
    uFadeInTime: { value: props.fadeInTime },
    uFadeOutTime: { value: props.fadeOutTime }
  });

  // Update material uniforms whenever they change
  $effect(() => {
    Object.assign(material.uniforms, uniforms);
  });

  useTask((dt) => {
    material.uniforms.uTime.value += dt;
  });
</script>

<T.Points {geometry}>
  <T.ShaderMaterial
    is={material}
    {vertexShader}
    {fragmentShader}
    transparent={true}
    depthWrite={false}
    depthTest={false}
    blending={THREE.AdditiveBlending}
  />
</T.Points>
