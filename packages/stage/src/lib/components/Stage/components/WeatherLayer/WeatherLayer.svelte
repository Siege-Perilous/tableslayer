<script lang="ts">
  import * as THREE from 'three';
  import { onMount, onDestroy, untrack } from 'svelte';
  import { T, useTask, useThrelte, type Props as ThrelteProps } from '@threlte/core';
  import { WeatherType, type WeatherLayerPreset } from './types';
  import ParticleSystem from '../ParticleSystem/ParticleSystem.svelte';
  import { PERFORMANCE_TIER_SETTINGS, type StageProps } from '../Stage/types';
  import { mapClippingPlaneStore } from '../../helpers/clippingPlaneStore.svelte';

  import SnowPreset from './presets/SnowPreset';
  import RainPreset from './presets/RainPreset';
  import LeavesPreset from './presets/LeavesPreset';
  import AshPreset from './presets/AshPreset';
  import DustStormPreset from './presets/DustStormPreset';
  import EmbersPreset from './presets/EmbersPreset';
  import BlizzardPreset from './presets/BlizzardPreset';
  import FirefliesPreset from './presets/FirefliesPreset';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: StageProps;
    size: { x: number; y: number };
  }

  const { props, size, ...meshProps }: Props = $props();

  const { renderer, renderStage } = useThrelte();

  // Lower tiers render particles at reduced resolution and count; the render
  // target is stretched over the full-size quad, which upscales softly
  const tierSettings = $derived(PERFORMANCE_TIER_SETTINGS[props.performanceTier ?? 'high']);

  let weatherType: WeatherType | null = $state(null);
  let weatherPreset: WeatherLayerPreset = $state(RainPreset);
  // Use $state.raw() for Three.js objects to prevent proxy interference with internal properties
  let mesh: THREE.Mesh = $state.raw(new THREE.Mesh());
  let particleScene = $state.raw(new THREE.Scene());
  let particleCamera = $state.raw(new THREE.PerspectiveCamera(90, 1, 0.01, 10));
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

  // Constrain the weather to the map bounds
  $effect(() => {
    quadMaterial.clippingPlanes = mapClippingPlaneStore.value;
  });

  onMount(() => {
    if (particleCamera && particleScene) {
      renderTarget.setSize(
        Math.round(size.x * tierSettings.weatherResolutionScale),
        Math.round(size.y * tierSettings.weatherResolutionScale)
      );
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
        case WeatherType.DustStorm:
          weatherPreset = { ...DustStormPreset };
          break;
        case WeatherType.Embers:
          weatherPreset = { ...EmbersPreset };
          break;
        case WeatherType.Blizzard:
          weatherPreset = { ...BlizzardPreset };
          break;
        case WeatherType.Fireflies:
          weatherPreset = { ...FirefliesPreset };
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

  // Update the camera and render target when size or tier changes
  $effect(() => {
    particleCamera.aspect = size.x / size.y;
    particleCamera.fov = weatherPreset.fov;
    particleCamera.updateProjectionMatrix();
    renderTarget.setSize(
      Math.round(size.x * tierSettings.weatherResolutionScale),
      Math.round(size.y * tierSettings.weatherResolutionScale)
    );
  });

  // Render particle scene directly to render target (bypasses unnecessary EffectComposer overhead)
  useTask(
    () => {
      if (props.weather.type === WeatherType.None) return;
      if (!particleScene || !particleCamera || !size) return;

      particleScene.visible = true;
      renderer.setRenderTarget(renderTarget);
      renderer.clear();
      renderer.render(particleScene, particleCamera);
      renderer.setRenderTarget(null);
      particleScene.visible = false;
    },
    { stage: renderStage }
  );
</script>

<!-- Remove the stencil mesh and keep only the particle scenes -->
<T.Scene is={particleScene} visible={false}>
  <T.PerspectiveCamera is={particleCamera} manual />
  <ParticleSystem
    props={weatherPreset.particles}
    opacity={weatherPreset.opacity}
    intensity={weatherPreset.intensity * tierSettings.weatherParticleScale}
  />
  {#if weatherPreset.secondaryParticles}
    <ParticleSystem
      props={weatherPreset.secondaryParticles}
      opacity={weatherPreset.secondaryParticles.opacity}
      intensity={weatherPreset.intensity * tierSettings.weatherParticleScale}
    />
  {/if}
</T.Scene>

<T.Mesh bind:ref={mesh} {...meshProps} visible={props.weather.type !== WeatherType.None}>
  <T.MeshBasicMaterial is={quadMaterial} />
  <T.PlaneGeometry args={[size.x, size.y]} />
</T.Mesh>
