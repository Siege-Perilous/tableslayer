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

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: WeatherLayerProps;
    mapSize: Size | null;
  }

  const { props, mapSize, ...meshProps }: Props = $props();

  const { renderer, size, renderStage } = useThrelte();

  let mesh: THREE.Mesh = $state(new THREE.Mesh());
  let particleScene: THREE.Scene | undefined = $state(undefined);
  let particleCamera: THREE.PerspectiveCamera | undefined = $state(undefined);

  const aspectRatio = $derived((mapSize?.width ?? 1) / (mapSize?.height ?? 1));

  // Create render target
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    format: THREE.RGBAFormat,
    stencilBuffer: false
  });

  const composer = new EffectComposer(renderer);
  composer.autoRenderToScreen = false;
  composer.outputBuffer = renderTarget;

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

    // Intensity and opacity values passed in via the UI
    if (props.intensity) {
      console.log('intensity', props.intensity);
      preset.intensity = props.intensity;
    }

    if (props.opacity) {
      console.log('opacity', props.opacity);
      preset.opacity = props.opacity;
    }

    console.log(preset.intensity, preset.opacity);

    return preset;
  });

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

  // Position the render target camera
  $effect(() => {
    if (!mapSize || !particleCamera) return;

    particleCamera.aspect = aspectRatio;
    particleCamera.fov = weatherPreset.fov;
    particleCamera.updateMatrixWorld();
    particleCamera.updateProjectionMatrix();
  });

  // Add DOF effect to the composer
  $effect(() => {
    if (!particleScene || !particleCamera) return;

    composer.setMainCamera(particleCamera);
    composer.setMainScene(particleScene);
    composer.setSize($size.width, $size.height);
    renderTarget.setSize($size.width, $size.height);
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
        resolutionX: $size.width,
        resolutionY: $size.height
      });
      dofEffect.blurPass.kernelSize = weatherPreset.depthOfField.kernelSize;
      composer.addPass(new EffectPass(particleCamera, dofEffect));
    } else {
      composer.addPass(new CopyPass(renderTarget));
    }
  });

  // Custom render task
  useTask(
    (dt) => {
      if (!particleScene || !particleCamera) return;

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
<T.Scene bind:ref={particleScene} visible={false}>
  <T.PerspectiveCamera bind:ref={particleCamera} near={0.01} far={10} position={[0, 0, -1]} rotation.x={Math.PI} />
  <ParticleSystem props={weatherPreset.particles} opacity={weatherPreset.opacity} intensity={weatherPreset.intensity} />
</T.Scene>

<T.Mesh bind:ref={mesh} {...meshProps} visible={props.type !== WeatherType.None}>
  <T.MeshBasicMaterial is={quadMaterial} />
  <T.PlaneGeometry args={[1, 1]} />
</T.Mesh>
