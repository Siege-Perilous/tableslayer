<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte } from '@threlte/core';
  import { onDestroy } from 'svelte';
  import vertexShader from '../../shaders/PingShader.vert?raw';
  import fragmentShader from '../../shaders/PingShader.frag?raw';
  import type { PingLayerProps } from './types';
  import { clippingPlaneStore } from '../../helpers/clippingPlaneStore.svelte';

  interface Props {
    props: PingLayerProps;
  }

  let { invalidate } = useThrelte();
  const { props }: Props = $props();

  let time = $state(0);
  let material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: new THREE.Uniform(0),
      uColor: new THREE.Uniform(new THREE.Color(props.color)),
      uOpacity: new THREE.Uniform(props.opacity),
      uPulseSpeed: new THREE.Uniform(props.pulseSpeed),
      uPulseAmplitude: new THREE.Uniform(props.pulseAmplitude),
      uSharpness: new THREE.Uniform(props.sharpness),
      uThickness: new THREE.Uniform(props.thickness),
      uClippingPlanes: new THREE.Uniform(
        clippingPlaneStore.value.map((p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant))
      )
    }
  });

  $effect(() => {
    material.uniforms.uColor.value = new THREE.Color(props.color);
    material.uniforms.uOpacity.value = props.opacity;
    material.uniforms.uPulseSpeed.value = props.pulseSpeed;
    material.uniforms.uPulseAmplitude.value = props.pulseAmplitude;
    material.uniforms.uSharpness.value = props.sharpness;
    material.uniforms.uThickness.value = props.thickness;
    material.uniforms.uClippingPlanes.value = clippingPlaneStore.value.map(
      (p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant)
    );

    invalidate();
  });

  useTask((dt) => {
    if (!material) return;
    time += dt;
    material.uniforms.uTime.value = time;
  });

  onDestroy(() => {
    if (material) {
      material.dispose();
    }
  });
</script>

{#snippet attachMaterial()}
  {material}
{/snippet}

<!-- Export the material to be used in the parent component -->
<T is={material} {fragmentShader} {vertexShader} transparent={true} depthTest={false}>
  {@render attachMaterial()}
</T>
