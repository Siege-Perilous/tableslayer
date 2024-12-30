<script lang="ts">
  import * as THREE from 'three';
  import fragmentShader from '../../shaders/WeatherShader.frag?raw';
  import vertexShader from '../../shaders/default.vert?raw';
  import { T, useTask, useThrelte } from '@threlte/core';
  import type { WeatherProps } from './types';

  interface Props {
    props: WeatherProps;
    resolution: { x: number; y: number };
  }

  let { invalidate } = useThrelte();
  const { props, resolution }: Props = $props();

  let time = $state(0);

  let material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: new THREE.Uniform(0),
      uOpacity: new THREE.Uniform(props.opacity),
      uAngle: new THREE.Uniform(props.angle),
      uSpeed: new THREE.Uniform(props.speed),
      uIntensity: new THREE.Uniform(props.intensity),
      uScale: new THREE.Uniform(props.scale),
      uColor: new THREE.Uniform(new THREE.Color(props.color)),
      uResolution: new THREE.Uniform(resolution)
    }
  });

  $effect(() => {
    material.uniforms.uOpacity.value = props.opacity;
    material.uniforms.uAngle.value = props.angle;
    material.uniforms.uSpeed.value = props.speed;
    material.uniforms.uScale.value = props.scale;
    material.uniforms.uIntensity.value = props.intensity;
    material.uniforms.uColor.value = new THREE.Color(props.color);
    material.uniforms.uResolution.value = resolution;
    invalidate();
  });

  useTask((dt) => {
    time += dt;
    material.uniforms.uTime.value = time;
  });
</script>

{#snippet attachMaterial()}
  {material}
{/snippet}

<!-- Export the material to be used in the parent component -->
<T is={material} {fragmentShader} {vertexShader} transparent={true} depthTest={false}>
  {@render attachMaterial()}
</T>
