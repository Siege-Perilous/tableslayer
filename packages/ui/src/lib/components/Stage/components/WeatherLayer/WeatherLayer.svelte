<script lang="ts">
  import * as THREE from 'three';
  import { onMount, untrack } from 'svelte';
  import { T, useTask, useThrelte, type Props as ThrelteProps } from '@threlte/core';
  import { WeatherType, type WeatherLayerPreset } from './types';
  import ParticleSystem from '../ParticleSystem/ParticleSystem.svelte';
  import type { StageProps } from '../Stage/types';
  import type { Size } from '../../types';

  import SnowPreset from './presets/SnowPreset';
  import RainPreset from './presets/RainPreset';
  import LeavesPreset from './presets/LeavesPreset';
  import AshPreset from './presets/AshPreset';

  import { EffectComposer, RenderPass, CopyPass } from 'postprocessing';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: StageProps;
    size: { x: number; y: number };
    // Need map size and props so we can clip the weather layer to the map
    mapSize: Size | null;
  }

  const { props, size, mapSize, ...meshProps }: Props = $props();

  const { renderer, renderStage } = useThrelte();
  let weatherType: WeatherType | null = $state(null);
  let weatherPreset: WeatherLayerPreset = $state(RainPreset);
  let mesh: THREE.Mesh = $state(new THREE.Mesh());
  let particleScene = $state(new THREE.Scene());
  let particleCamera = $state(new THREE.PerspectiveCamera(90, 1, 0.01, 10));
  particleCamera.position.set(0, 0, -1);
  particleCamera.rotation.x = Math.PI;

  // Remove stencil-related settings from render target
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter
  });

  const composer = new EffectComposer(renderer);
  composer.autoRenderToScreen = false;
  composer.outputBuffer = renderTarget;

  // Remove stencil settings from quad material
  const quadMaterial = new THREE.MeshBasicMaterial({
    map: renderTarget.texture,
    transparent: true,
    blending: THREE.NormalBlending
  });

  // Add clipping planes
  const clippingPlanes = $state([
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), // right
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), // left
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), // top
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 0) // bottom
  ]);

  // Add matrix for transforming clipping planes
  const transformationMatrix = $state(new THREE.Matrix4());

  $effect(() => {
    if (!mapSize) return;

    // Create transformation matrix based on map properties
    transformationMatrix.identity();

    const zoom = props.map.zoom * props.scene.zoom;

    // Apply transformations in order: scale (zoom) -> rotate -> translate
    transformationMatrix.makeScale(zoom, zoom, 1);
    transformationMatrix.multiply(
      new THREE.Matrix4().makeTranslation(props.map.offset.x / props.map.zoom, props.map.offset.y / props.map.zoom, 0)
    );
    transformationMatrix.multiply(new THREE.Matrix4().makeRotationZ((props.map.rotation / 180.0) * Math.PI));

    const halfWidth = mapSize.width / 2;
    const halfHeight = mapSize.height / 2;

    // Create base planes
    const basePlanes = [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), halfWidth), // right
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), halfWidth), // left
      new THREE.Plane(new THREE.Vector3(0, 1, 0), halfHeight), // top
      new THREE.Plane(new THREE.Vector3(0, -1, 0), halfHeight) // bottom
    ];

    // Transform each plane using the transformation matrix
    for (let i = 0; i < 4; i++) {
      basePlanes[i].applyMatrix4(transformationMatrix);
      clippingPlanes[i].copy(basePlanes[i]);
    }

    // Enable clipping planes on the particle system material
    if (quadMaterial) {
      quadMaterial.clippingPlanes = clippingPlanes;
      quadMaterial.clipIntersection = false;
      quadMaterial.needsUpdate = true;
    }
  });

  // Enable stencil test in renderer
  onMount(() => {
    if (particleCamera && particleScene) {
      composer.setMainCamera(particleCamera);
      composer.setMainScene(particleScene);
      composer.setSize(size.x, size.y, false);
      renderTarget.setSize(size.x, size.y);
    }
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

  // Add DOF effect to the composer
  $effect(() => {
    if (!particleScene || !particleCamera) return;

    composer.removeAllPasses();

    // Add render pass
    const renderPass = new RenderPass(particleScene, particleCamera);
    composer.addPass(renderPass);

    // Add depth of field pass
    // if (weatherPreset.depthOfField.enabled) {
    // TODO: Add depth of field effect
    // const dofEffect = new DepthOfFieldEffect(particleCamera, {
    //   focusDistance: weatherPreset.depthOfField.focus,
    //   focalLength: weatherPreset.depthOfField.focalLength,
    //   bokehScale: weatherPreset.depthOfField.bokehScale,
    //   resolutionX: mapSize.width,
    //   resolutionY: mapSize.height
    // });
    // dofEffect.blurPass.kernelSize = weatherPreset.depthOfField.kernelSize;
    // composer.addPass(new EffectPass(particleCamera, dofEffect));
    // } else {
    composer.addPass(new CopyPass(renderTarget));
    // }
  });

  // Update the map size effect to use scaled resolution
  $effect(() => {
    particleCamera.aspect = size.x / size.y;
    particleCamera.fov = weatherPreset.fov;
    particleCamera.updateProjectionMatrix();
    renderTarget.setSize(size.x, size.y);
    composer.setSize(size.x, size.y, false);
  });

  // Update render task (remove stencil-related code)
  useTask(
    (dt) => {
      if (!particleScene || !particleCamera || !size) return;

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

<!-- Remove the stencil mesh and keep only the particle scenes -->
<T.Scene is={particleScene} visible={false}>
  <T.PerspectiveCamera is={particleCamera} manual />
  <ParticleSystem props={weatherPreset.particles} opacity={weatherPreset.opacity} intensity={weatherPreset.intensity} />
</T.Scene>

<T.Mesh bind:ref={mesh} {...meshProps} visible={props.weather.type !== WeatherType.None}>
  <T.MeshBasicMaterial is={quadMaterial} />
  <T.PlaneGeometry args={[size.x, size.y]} />
</T.Mesh>
