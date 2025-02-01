<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte, type Size } from '@threlte/core';
  import { type WeatherLayerProps } from './types';
  import ParticleSystem from '../ParticleSystem/ParticleSystem.svelte';
  import { DEG2RAD } from 'three/src/math/MathUtils';

  interface Props {
    props: WeatherLayerProps;
    mapSize: Size | null;
  }

  const { props, mapSize }: Props = $props();

  const { renderer } = useThrelte();

  let mesh: THREE.Mesh = $state(new THREE.Mesh());
  let scene: THREE.Scene | undefined = $state(undefined);

  const aspectRatio = $derived((mapSize?.width ?? 1) / (mapSize?.height ?? 1));

  // Create render target
  const renderTarget = $derived(
    new THREE.WebGLRenderTarget(mapSize?.width ?? 1, mapSize?.height ?? 1, {
      format: THREE.RGBAFormat,
      stencilBuffer: false
    })
  );

  // Create camera for render target
  const rtCamera = $derived(
    new THREE.PerspectiveCamera(props.camera.fov, aspectRatio, props.camera.near, props.camera.far)
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

  // Position the render target camera
  $effect(() => {
    if (!mapSize) return;
    rtCamera.aspect = aspectRatio;
    rtCamera.fov = props.camera.fov;
    rtCamera.position.z = -1 / 2 / Math.tan((DEG2RAD * props.camera.fov) / 2);
    rtCamera.far = -rtCamera.position.z;
    rtCamera.lookAt(0, 0, 0);

    console.log(rtCamera.position.z);
  });

  // Custom render task
  useTask((state) => {
    if (!scene) return;

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
  <ParticleSystem props={props.particles} />
</T.Scene>

<T.Mesh bind:ref={mesh} name="WeatherLayer" renderOrder={50}>
  <T.MeshBasicMaterial is={quadMaterial} />
  <T.PlaneGeometry args={[1, 1]} />
</T.Mesh>
