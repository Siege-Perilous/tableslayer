<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte, type Props as ThrelteProps } from '@threlte/core';
  import { WeatherType, type WeatherLayerPreset, type WeatherLayerProps } from './types';
  import ParticleSystem from '../ParticleSystem/ParticleSystem.svelte';
  import type { Size } from '../../types';

  import SnowPreset from './presets/SnowPreset';
  import RainPreset from './presets/RainPreset';
  import LeavesPreset from './presets/LeavesPreset';
  import AshPreset from './presets/AshPreset';

  import { DepthOfFieldEffect, EffectComposer, EffectPass, RenderPass, CopyPass } from 'postprocessing';
  import { onMount } from 'svelte';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: WeatherLayerProps;
    mapSize: Size | null;
  }

  const { props, mapSize, ...meshProps }: Props = $props();

  const { renderer, size, renderStage } = useThrelte();

  let weatherPreset = $derived.by(() => {
    let preset: WeatherLayerPreset;

    switch (props.type) {
      case WeatherType.Snow:
        preset = { ...SnowPreset };
        break;
      case WeatherType.Rain:
        preset = { ...RainPreset };
        break;
      case WeatherType.Leaves:
        preset = { ...LeavesPreset };
        break;
      case WeatherType.Custom:
        preset = { ...(props.custom || RainPreset) };
        break;
      case WeatherType.Ash:
        preset = { ...AshPreset };
        break;
      default:
        // Fallback to rain preset
        preset = { ...RainPreset };
    }

    // Overrides for fov, intensity, and opacity set in the UI
    if (props.fov) {
      preset.fov = props.fov;
    }

    if (props.intensity) {
      preset.intensity = props.intensity;
    }

    if (props.opacity) {
      preset.opacity = props.opacity;
    }

    return preset;
  });

  let mesh: THREE.Mesh = $state(new THREE.Mesh());
  let particleScene = $state(new THREE.Scene());
  let particleCamera = $state(new THREE.PerspectiveCamera(90, 1, 0.01, 10));
  particleCamera.position.set(0, 0, -1);
  particleCamera.rotation.x = Math.PI;

  // Create render target
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    format: THREE.RGBAFormat,
    stencilBuffer: false
  });

  const composer = new EffectComposer(renderer);
  composer.autoRenderToScreen = false;
  composer.outputBuffer = renderTarget;

  // Create quad material using render target texture
  const quadMaterial = $derived(
    new THREE.MeshBasicMaterial({
      map: renderTarget.texture,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      depthWrite: true,
      depthTest: true
    })
  );

  onMount(() => {
    if (particleCamera && particleScene && mapSize) {
      composer.setMainCamera(particleCamera);
      composer.setMainScene(particleScene);
      composer.setSize(mapSize.width, mapSize.height);
      renderTarget.setSize(mapSize.width, mapSize.height);
    }
  });

  // Add DOF effect to the composer
  $effect(() => {
    if (!particleScene || !particleCamera || !mapSize) return;

    composer.removeAllPasses();

    // Add render pass
    const renderPass = new RenderPass(particleScene, particleCamera);
    composer.addPass(renderPass);

    // Add depth of field pass
    if (weatherPreset.depthOfField.enabled) {
      const dofEffect = new DepthOfFieldEffect(particleCamera, {
        focusDistance: weatherPreset.depthOfField.focus,
        focalLength: weatherPreset.depthOfField.focalLength,
        bokehScale: weatherPreset.depthOfField.bokehScale,
        resolutionX: mapSize.width,
        resolutionY: mapSize.height
      });
      dofEffect.blurPass.kernelSize = weatherPreset.depthOfField.kernelSize;
      composer.addPass(new EffectPass(particleCamera, dofEffect));
    } else {
      composer.addPass(new CopyPass(renderTarget));
    }
  });

  // If map sizes change, update the camera and render target
  $effect(() => {
    if (!mapSize) return;
    particleCamera.aspect = mapSize.width / mapSize.height;
    particleCamera.fov = weatherPreset.fov;
    particleCamera.updateProjectionMatrix();
    renderTarget.setSize(mapSize.width, mapSize.height);
    composer.setSize(mapSize.width, mapSize.height);
  });

  // Custom render task
  useTask(
    (dt) => {
      if (!particleScene || !particleCamera || !mapSize) return;

      particleScene.visible = true;

      renderer.setRenderTarget(renderTarget);
      composer.render(dt);
      renderer.setRenderTarget(null);

      particleScene.visible = false;
      quadMaterial.needsUpdate = true;
    },
    { stage: renderStage }
  );
</script>

<!-- Hidden scene that renders to the render target -->
<T.Scene is={particleScene} visible={false}>
  <T.PerspectiveCamera is={particleCamera} manual />
  <ParticleSystem props={weatherPreset.particles} opacity={weatherPreset.opacity} intensity={weatherPreset.intensity} />
</T.Scene>

<T.Mesh bind:ref={mesh} {...meshProps} visible={props.type !== WeatherType.None}>
  <T.MeshBasicMaterial is={quadMaterial} />
  <T.PlaneGeometry args={[1, 1]} />
</T.Mesh>
