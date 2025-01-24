<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte } from '@threlte/core';
  import { type WeatherLayerProps } from './types';
  import ParticleSystem from '../ParticleSystem/ParticleSystem.svelte';

  interface Props {
    props: WeatherLayerProps;
    resolution: { x: number; y: number };
  }

  const { props, resolution }: Props = $props();

  const { renderer } = useThrelte();

  let mesh: THREE.Mesh = $state(new THREE.Mesh());
  let scene: THREE.Scene | undefined = $state(undefined);

  // Create render target
  const renderTarget = $derived(
    new THREE.WebGLRenderTarget(resolution.x, resolution.y, {
      format: THREE.RGBAFormat,
      stencilBuffer: false
    })
  );

  $inspect(renderTarget);
  $inspect(scene);

  // Create camera for render target
  const rtCamera = $derived(
    new THREE.PerspectiveCamera(props.camera.fov, resolution.x / resolution.y, props.camera.near, props.camera.far)
  );

  // Position the render target camera
  $effect(() => {
    rtCamera.position.set(props.camera.position.x, props.camera.position.y, props.camera.position.z);
    rtCamera.lookAt(0, 0, 0);
    rtCamera.fov = props.camera.fov;
    rtCamera.near = props.camera.near;
    rtCamera.far = props.camera.far;
  });

  // Create quad material using render target texture
  const quadMaterial = $derived(
    new THREE.MeshBasicMaterial({
      map: renderTarget.texture,
      transparent: true,
      depthWrite: false
    })
  );

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

<T.Mesh bind:ref={mesh} name="WeatherLayer">
  <T.MeshBasicMaterial is={quadMaterial} transparent={true} blending={THREE.AdditiveBlending} />
  <T.PlaneGeometry args={[1920, 1080]} />
</T.Mesh>
