<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte, type Props as ThrelteProps } from '@threlte/core';
  import { WeatherType, type WeatherLayerProps } from './types';
  import ParticleSystem from '../ParticleSystem/ParticleSystem.svelte';
  import type { Size } from '../../types';

  import SnowPreset from './presets/SnowPreset';
  import RainPreset from './presets/RainPreset';
  import LeavesPreset from './presets/LeavesPreset';
  import AshPreset from './presets/AshPreset';
  import type { ParticleSystemProps } from '../ParticleSystem/types';

  import { DepthOfFieldEffect, EffectComposer, EffectPass, KernelSize, RenderPass, CopyPass } from 'postprocessing';
  import type { PostProcessingProps } from '../Scene/types';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: WeatherLayerProps;
    postprocessing: PostProcessingProps;
    mapSize: Size | null;
  }

  const { props, mapSize, postprocessing, ...meshProps }: Props = $props();

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
  composer.outputBuffer = renderTarget;

  // Create quad material using render target texture
  const quadMaterial = $derived(
    new THREE.MeshBasicMaterial({
      map: renderTarget.texture,
      transparent: true,
      opacity: props.opacity,
      blending: THREE.CustomBlending,
      blendAlpha: 1,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcColorFactor,
      blendDst: THREE.OneFactor
    })
  );

  let particleProps = $derived.by(() => {
    let preset: ParticleSystemProps;

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

    // Override some of the preset values with the UI selections
    preset.opacity = props.opacity;
    preset.count = Math.floor(props.intensity * preset.count);

    return preset;
  });

  // Position the render target camera
  $effect(() => {
    if (!mapSize || !particleCamera) return;

    console.log('Updating particle camera');
    console.log('aspectRatio', aspectRatio);
    console.log('size', $size.width, $size.height);
    console.log('mapSize', mapSize?.width, mapSize?.height);

    particleCamera.aspect = aspectRatio;
    particleCamera.fov = props.fov;
    particleCamera.updateMatrixWorld();
    particleCamera.updateProjectionMatrix();
  });

  // Add DOF effect to the composer
  $effect(() => {
    if (!particleScene || !particleCamera) return;

    console.log('Updating composer');
    console.log('aspectRatio', aspectRatio);
    console.log('size', $size.width, $size.height);
    console.log('mapSize', mapSize?.width, mapSize?.height);

    composer.setMainCamera(particleCamera);
    composer.setMainScene(particleScene);
    composer.setSize($size.width, $size.height);
    renderTarget.setSize($size.width, $size.height);
    composer.removeAllPasses();

    // Add render pass
    const renderPass = new RenderPass(particleScene, particleCamera);
    composer.addPass(renderPass);

    // Add depth of field pass
    if (postprocessing.depthOfField.enabled) {
      const dofEffect = new DepthOfFieldEffect(particleCamera, {
        focusDistance: postprocessing.depthOfField.focus,
        focalLength: postprocessing.depthOfField.focalLength,
        bokehScale: postprocessing.depthOfField.bokehScale
      });
      dofEffect.blurPass.kernelSize = KernelSize.VERY_LARGE;
      composer.addPass(new EffectPass(particleCamera, dofEffect));
    } else {
      composer.addPass(new CopyPass(renderTarget));
    }

    composer.autoRenderToScreen = false;
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
  <T.PerspectiveCamera bind:ref={particleCamera} near={0.01} far={1} position={[0, 0, -1]} rotation.x={Math.PI} />
  <ParticleSystem props={particleProps} />
</T.Scene>

<T.Mesh bind:ref={mesh} {...meshProps} visible={props.type !== WeatherType.None}>
  <T.MeshBasicMaterial is={quadMaterial} />
  <T.PlaneGeometry args={[1, 1]} />
</T.Mesh>
