<script lang="ts">
  import * as THREE from 'three';
  import { onMount, onDestroy, untrack } from 'svelte';
  import { T, useTask, useThrelte, type Props as ThrelteProps } from '@threlte/core';
  import { WeatherType, type WeatherLayerPreset } from './types';
  import ParticleSystem from '../ParticleSystem/ParticleSystem.svelte';
  import type { StageProps } from '../Stage/types';

  import SnowPreset from './presets/SnowPreset';
  import RainPreset from './presets/RainPreset';
  import LeavesPreset from './presets/LeavesPreset';
  import AshPreset from './presets/AshPreset';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: StageProps;
    size: { x: number; y: number };
  }

  const { props, size, ...meshProps }: Props = $props();

  const { renderer, renderStage } = useThrelte();
  let weatherType: WeatherType | null = $state(null);
  let weatherPreset: WeatherLayerPreset = $state(RainPreset);
  let mesh: THREE.Mesh = $state(new THREE.Mesh());
  let particleScene = $state(new THREE.Scene());
  let particleCamera = $state(new THREE.PerspectiveCamera(90, 1, 0.01, 10));
  particleCamera.position.set(0, 0, -1);
  particleCamera.rotation.x = Math.PI;

  // Render target for particle scene
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter
  });

  // Material for displaying particles
  const quadMaterial = new THREE.MeshBasicMaterial({
    map: renderTarget.texture,
    transparent: true,
    blending: THREE.NormalBlending
  });

  onMount(() => {
    if (particleCamera && particleScene) {
      renderTarget.setSize(size.x, size.y);
    }
  });

  onDestroy(() => {
    renderTarget.dispose();
    quadMaterial.dispose();
  });

  // If weather type changes, update the preset
  $effect(() => {
    if (props.weather.type === weatherType) {
      return;
    }

    untrack(() => {
      weatherType = props.weather.type;
      switch (weatherType) {
        case WeatherType.Snow:
          weatherPreset = { ...SnowPreset };
          break;
        case WeatherType.Rain:
          weatherPreset = { ...RainPreset };
          break;
        case WeatherType.Leaves:
          weatherPreset = { ...LeavesPreset };
          break;
        case WeatherType.Custom:
          weatherPreset = { ...(props.weather.custom || RainPreset) };
          break;
        case WeatherType.Ash:
          weatherPreset = { ...AshPreset };
          break;
        default:
          // Fallback to rain preset
          weatherPreset = { ...RainPreset };
      }
    });
  });

  // Overrides for fov, intensity, and opacity set in the UI
  $effect(() => {
    if (props.weather.fov) {
      weatherPreset.fov = props.weather.fov;
    }

    if (props.weather.intensity) {
      weatherPreset.intensity = props.weather.intensity;
    }

    if (props.weather.opacity) {
      weatherPreset.opacity = props.weather.opacity;
    }
  });

  // Update the camera and render target when size changes
  $effect(() => {
    particleCamera.aspect = size.x / size.y;
    particleCamera.fov = weatherPreset.fov;
    particleCamera.updateProjectionMatrix();
    renderTarget.setSize(size.x, size.y);
  });

  // Render particle scene directly to render target (bypasses unnecessary EffectComposer overhead)
  useTask(
    () => {
      if (!particleScene || !particleCamera || !size) return;

      particleScene.visible = true;
      renderer.setRenderTarget(renderTarget);
      renderer.clear();
      renderer.render(particleScene, particleCamera);
      renderer.setRenderTarget(null);
      particleScene.visible = false;
      quadMaterial.needsUpdate = true;
    },
    { stage: renderStage }
  );
</script>

<!-- Remove the stencil mesh and keep only the particle scenes -->
<T.Scene is={particleScene} visible={false}>
  <T.PerspectiveCamera is={particleCamera} manual />
  <ParticleSystem props={weatherPreset.particles} opacity={weatherPreset.opacity} intensity={weatherPreset.intensity} />
</T.Scene>

<T.Mesh bind:ref={mesh} {...meshProps} visible={props.weather.type !== WeatherType.None}>
  <T.MeshBasicMaterial is={quadMaterial} />
  <T.PlaneGeometry args={[size.x, size.y]} />
</T.Mesh>
