<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, type Props as ThrelteProps } from '@threlte/core';
  import type { Size } from '../../types';
  import type { FogLayerProps } from './types';
  import { clippingPlaneStore } from '../../helpers/clippingPlaneStore.svelte';

  import vertexShader from '../../shaders/default.vert?raw';
  import fragmentShader from '../../shaders/FractalNoise.frag?raw';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: FogLayerProps;
    mapSize: Size | null;
  }

  const { props, mapSize, ...meshProps }: Props = $props();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uFogColor: { value: new THREE.Color(props.color) },
      uOpacity: { value: props.opacity },
      uFogSpeed: { value: props.speed },
      uPersistence: { value: props.persistence },
      uLacunarity: { value: props.lacunarity },
      uFrequency: { value: props.frequency },
      uOffset: { value: props.offset },
      uAmplitude: { value: props.amplitude },
      uLevels: { value: props.levels },
      uClippingPlanes: new THREE.Uniform(
        clippingPlaneStore.value.map((p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant))
      )
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false
  });

  // Update uniforms when props change
  $effect(() => {
    material.uniforms.uFogColor.value.set(props.color);
    material.uniforms.uOpacity.value = props.opacity;
    material.uniforms.uFogSpeed.value = props.speed;
    material.uniforms.uPersistence.value = props.persistence;
    material.uniforms.uLacunarity.value = props.lacunarity;
    material.uniforms.uFrequency.value = props.frequency;
    material.uniforms.uOffset.value = props.offset;
    material.uniforms.uAmplitude.value = props.amplitude;
    material.uniforms.uLevels.value = props.levels;
  });

  useTask((dt) => {
    material.uniforms.uTime.value += dt;
  });
</script>

<T.Mesh {...meshProps}>
  <T.ShaderMaterial is={material} />
  <T.PlaneGeometry />
</T.Mesh>
