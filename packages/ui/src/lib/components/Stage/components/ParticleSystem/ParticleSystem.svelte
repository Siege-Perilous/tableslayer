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

  let mesh: THREE.Mesh | undefined = $state(undefined);

  const geometry = $derived.by(() => {
    const geometry = new THREE.BufferGeometry();

    // Initialize particle attributes - 4 vertices per quad
    const positions = new Float32Array(props.count * 12); // 4 vertices * 3 coords
    const uvs = new Float32Array(props.count * 8); // 4 vertices * 2 coords
    const indices = new Uint32Array(props.count * 6); // 2 triangles * 3 vertices
    const seeds = new Float32Array(props.count * 4); // 4 vertices
    const ageOffsets = new Float32Array(props.count * 4); // 4 vertices

    // Initialize particles
    for (let i = 0; i < props.count; i++) {
      const radius =
        Math.random() * (props.spawnArea.maxRadius - props.spawnArea.minRadius) + props.spawnArea.minRadius;
      const angle = Math.random() * 2 * Math.PI;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      const z = -1;

      // Quad vertex positions (same for all 4 corners initially)
      const baseIdx = i * 12;
      // Generate random size for this particle
      let size = Math.random() * (props.size.max - props.size.min) + props.size.min;
      let width = size * props.scale.x;
      let height = size * props.scale.y;

      const rotation = new THREE.Euler(
        (Math.PI / 180) * props.rotation.x,
        (Math.PI / 180) * props.rotation.y,
        (Math.PI / 180) * props.rotation.z + angle
      );

      const v1 = new THREE.Vector3(-width / 2, -height / 2, 0);
      const v2 = new THREE.Vector3(width / 2, -height / 2, 0);
      const v3 = new THREE.Vector3(-width / 2, height / 2, 0);
      const v4 = new THREE.Vector3(width / 2, height / 2, 0);

      v1.applyEuler(rotation);
      v2.applyEuler(rotation);
      v3.applyEuler(rotation);
      v4.applyEuler(rotation);

      v1.add(new THREE.Vector3(x, y, z));
      v2.add(new THREE.Vector3(x, y, z));
      v3.add(new THREE.Vector3(x, y, z));
      v4.add(new THREE.Vector3(x, y, z));

      // Set quad corners with size offset
      positions[baseIdx] = v1.x; // Bottom left x
      positions[baseIdx + 1] = v1.y; // Bottom left y
      positions[baseIdx + 2] = v1.z; // Bottom left z

      positions[baseIdx + 3] = v2.x; // Bottom right x
      positions[baseIdx + 4] = v2.y; // Bottom right y
      positions[baseIdx + 5] = v2.z; // Bottom right z

      positions[baseIdx + 6] = v3.x; // Top left x
      positions[baseIdx + 7] = v3.y; // Top left y
      positions[baseIdx + 8] = v3.z; // Top left z

      positions[baseIdx + 9] = v4.x; // Top right x
      positions[baseIdx + 10] = v4.y; // Top right y
      positions[baseIdx + 11] = v4.z; // Top right z

      // UV coordinates for quad
      const uvBaseIdx = i * 8;
      uvs[uvBaseIdx] = 0;
      uvs[uvBaseIdx + 1] = 0; // bottom left
      uvs[uvBaseIdx + 2] = 1;
      uvs[uvBaseIdx + 3] = 0; // bottom right
      uvs[uvBaseIdx + 4] = 0;
      uvs[uvBaseIdx + 5] = 1; // top left
      uvs[uvBaseIdx + 6] = 1;
      uvs[uvBaseIdx + 7] = 1; // top right

      // Indices for two triangles
      const indexBaseIdx = i * 6;
      const vertexBaseIdx = i * 4;
      indices[indexBaseIdx] = vertexBaseIdx;
      indices[indexBaseIdx + 1] = vertexBaseIdx + 1;
      indices[indexBaseIdx + 2] = vertexBaseIdx + 2;
      indices[indexBaseIdx + 3] = vertexBaseIdx + 1;
      indices[indexBaseIdx + 4] = vertexBaseIdx + 3;
      indices[indexBaseIdx + 5] = vertexBaseIdx + 2;

      // Random attributes (same for all vertices of quad)
      const seed = Math.random();
      const ageOffset = (props.lifetime * (i + 1)) / props.count;

      for (let v = 0; v < 4; v++) {
        ageOffsets[i * 4 + v] = ageOffset;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('ageOffset', new THREE.BufferAttribute(ageOffsets, 1));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

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
    uFadeOutTime: { value: props.fadeOutTime },
    uScale: { value: props.scale }
  });

  // Update material uniforms whenever they change
  $effect(() => {
    Object.assign(material.uniforms, uniforms);
  });

  useTask((dt) => {
    material.uniforms.uTime.value += dt;
  });
</script>

<T.Mesh bind:ref={mesh} {geometry}>
  <T.ShaderMaterial
    is={material}
    {vertexShader}
    {fragmentShader}
    transparent={true}
    depthWrite={false}
    depthTest={false}
    blending={THREE.AdditiveBlending}
    side={THREE.DoubleSide}
  />
</T.Mesh>
