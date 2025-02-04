<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte } from '@threlte/core';
  import { WeatherType, type WeatherLayerProps } from './types';
  import ParticleSystem from '../ParticleSystem/ParticleSystem.svelte';
  import { DEG2RAD } from 'three/src/math/MathUtils';
  import type { Size } from '../../types';

  import SnowPreset from './presets/SnowPreset';
  import RainPreset from './presets/RainPreset';
  import type { ParticleSystemProps } from '../ParticleSystem/types';

  interface Props {
    props: WeatherLayerProps;
    mapSize: Size | null;
  }

  const { props, mapSize }: Props = $props();

  const { renderer } = useThrelte();

  let mesh: THREE.Mesh = $state(new THREE.Mesh());
  let scene: THREE.Scene | undefined = $state(undefined);
  let rtCamera: THREE.PerspectiveCamera | undefined = $state(undefined);

  const aspectRatio = $derived((mapSize?.width ?? 1) / (mapSize?.height ?? 1));

  // Create render target
  const renderTarget = $derived(
    new THREE.WebGLRenderTarget(mapSize?.width ?? 1, mapSize?.height ?? 1, {
      format: THREE.RGBAFormat,
      stencilBuffer: false
    })
  );

  // Create quad material using render target texture
  const quadMaterial = $derived(
    new THREE.MeshBasicMaterial({
      map: renderTarget.texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending
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
      case WeatherType.Custom:
        preset = { ...(props.custom || RainPreset) };
        break;
      default:
        // Fallback to rain preset
        preset = { ...RainPreset };
    }

    // Override some of the preset values with the UI selections
    preset.opacity = props.opacity;
    preset.count = Math.floor(props.intensity * 1000);
    preset.color = props.color;

    return preset;
  });

  // Position the render target camera
  $effect(() => {
    if (!mapSize || !rtCamera) return;
    rtCamera.aspect = aspectRatio;
    rtCamera.fov = props.fov;
    rtCamera.position.set(0, 0, -1 / 2 / Math.tan((DEG2RAD * props.fov) / 2));
    rtCamera.far = -rtCamera.position.z;
    rtCamera.lookAt(0, 0, 0);
  });

  // Custom render task
  useTask((state) => {
    if (!scene || !rtCamera) return;

    scene.visible = true;

    // Render particles to render target
    renderer.setRenderTarget(renderTarget);
    renderer.clear();
    renderer.render(scene, rtCamera);

    // Restore original render target
    renderer.setRenderTarget(null);

    scene.visible = false;
    quadMaterial.needsUpdate = true;
  });
</script>

<!-- Hidden scene that renders to the render target -->
<T.Scene bind:ref={scene} visible={false}>
  <T.PerspectiveCamera bind:ref={rtCamera} />
  <ParticleSystem props={particleProps} />
</T.Scene>

<T.Mesh bind:ref={mesh} name="WeatherLayer" renderOrder={50} visible={props.type !== WeatherType.None}>
  <T.MeshBasicMaterial is={quadMaterial} />
  <T.PlaneGeometry args={[1, 1]} />
</T.Mesh>
