<script lang="ts">
  import * as THREE from 'three';
  import { getContext, onMount, untrack } from 'svelte';
  import { T, useThrelte, useTask } from '@threlte/core';
  import { EffectComposer, EffectPass, RenderPass, BloomEffect, VignetteEffect, BlendFunction } from 'postprocessing';
  import { type Callbacks, type StageProps } from '../Stage/types';
  import MapLayer from '../MapLayer/MapLayer.svelte';
  import GridLayer from '../GridLayer/GridLayer.svelte';
  import { type MapLayerExports } from '../MapLayer/types';
  import { clippingPlaneStore, updateClippingPlanes } from '../../helpers/clippingPlaneStore.svelte';

  interface Props {
    props: StageProps;
  }

  let { props }: Props = $props();

  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  const onSceneUpdate = getContext<Callbacks>('callbacks').onSceneUpdate;

  let mapLayer: MapLayerExports;

  // Create separate scenes
  const otherStuff: THREE.Object3D[] = [];

  const composer = new EffectComposer(renderer);

  onMount(() => {
    let before = autoRender.current;
    autoRender.set(false);
    fit();
    return () => {
      autoRender.set(before);
    };
  });

  // Effect to handle scene separation after layers are set up
  $effect(() => {
    // Move grid and ping layers to overlay scene if they exist
    const gridLayer = scene.getObjectByName('gridLayer');
    const pingLayer = scene.getObjectByName('pingLayer');

    if (gridLayer) {
      otherStuff.push(gridLayer);
    }

    if (pingLayer) {
      otherStuff.push(pingLayer);
    }
  });

  // Effect to update post-processing settings when props change
  $effect(() => {
    composer.setSize($size.width, $size.height);
    composer.removeAllPasses();

    const bloomEffect = new BloomEffect({
      intensity: props.postProcessing.bloom.intensity,
      mipmapBlur: props.postProcessing.bloom.mipmapBlur,
      radius: props.postProcessing.bloom.radius,
      levels: props.postProcessing.bloom.levels,
      luminanceThreshold: props.postProcessing.bloom.threshold,
      luminanceSmoothing: props.postProcessing.bloom.smoothing
    });

    const vignetteEffect = new VignetteEffect({
      offset: props.postProcessing?.vignette?.offset ?? 0.5,
      darkness: props.postProcessing?.vignette?.darkness ?? 0.5,
      blendFunction: BlendFunction.NORMAL
    });

    const renderPass = new RenderPass(scene, $camera);
    const bloomPass = new EffectPass($camera, bloomEffect);
    const vignettePass = new EffectPass($camera, vignetteEffect);

    composer.addPass(renderPass);
    if (props.postProcessing.bloom.enabled) {
      composer.addPass(bloomPass);
    }
    if (props.postProcessing.vignette.enabled) {
      composer.addPass(vignettePass);
    }
  });

  // Whenever the scene or display properties change, update the clipping planes
  $effect(() => {
    updateClippingPlanes(props.scene, props.display);
    untrack(() => (renderer.clippingPlanes = clippingPlaneStore.value));
  });

  // Custom render task to handle both scenes
  useTask(
    (dt) => {
      if (!scene || !renderer) return;

      // otherStuff.forEach((child) => (child.visible = false));

      // Render post-processed main scene
      composer.render(dt);

      // Render overlay scene normally
      // renderer.autoClear = false;
      //renderer.render(overlayScene, $camera);
      //renderer.autoClear = true;
    },
    { stage: renderStage }
  );

  export function fill() {
    const canvasAspectRatio = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
    let sceneAspectRatio = props.display.resolution.x / props.display.resolution.y;
    let sceneWidth = props.display.resolution.x;
    let sceneHeight = props.display.resolution.y;

    // Swap dimensions if rotated 90 or 270 degrees
    if (props.scene.rotation === 90 || props.scene.rotation === 270) {
      sceneAspectRatio = props.display.resolution.y / props.display.resolution.x;
      sceneWidth = props.display.resolution.y;
      sceneHeight = props.display.resolution.x;
    }

    let newZoom: number;
    if (sceneAspectRatio > canvasAspectRatio) {
      newZoom = renderer.domElement.clientHeight / sceneHeight;
    } else {
      newZoom = renderer.domElement.clientWidth / sceneWidth;
    }

    onSceneUpdate({ x: 0, y: 0 }, newZoom);
  }

  export function fit() {
    const canvasAspectRatio = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
    let sceneAspectRatio = props.display.resolution.x / props.display.resolution.y;
    let sceneWidth = props.display.resolution.x;
    let sceneHeight = props.display.resolution.y;

    // Swap dimensions if rotated 90 or 270 degrees
    if (props.scene.rotation === 90 || props.scene.rotation === 270) {
      sceneAspectRatio = props.display.resolution.y / props.display.resolution.x;
      sceneWidth = props.display.resolution.y;
      sceneHeight = props.display.resolution.x;
    }

    let newZoom: number;
    if (sceneAspectRatio < canvasAspectRatio) {
      newZoom = renderer.domElement.clientHeight / sceneHeight;
    } else {
      newZoom = renderer.domElement.clientWidth / sceneWidth;
    }

    onSceneUpdate({ x: 0, y: 0 }, newZoom);
  }

  export const map = {
    fill: () => mapLayer.fill(),
    fit: () => mapLayer.fit()
  };

  // References to the layer doesn't exist until the component is mounted,
  // so we need create these wrapper functions
  export const fogOfWar = {
    clear: () => mapLayer.fogOfWar.clear(),
    reset: () => mapLayer.fogOfWar.reset(),
    toPng: () => mapLayer.fogOfWar.toPng()
  };
</script>

<T.OrthographicCamera
  makeDefault
  near={0.1}
  far={1000}
  rotation={[0, 0, (props.scene.rotation * Math.PI) / 180]}
  position={[0, 0, 100]}
></T.OrthographicCamera>

<!-- Scene -->
<T.Object3D position={[props.scene.offset.x, props.scene.offset.y, 0]} scale={[props.scene.zoom, props.scene.zoom, 1]}>
  <MapLayer bind:this={mapLayer} {props} />

  <!-- Map overlays that scale with the scene -->
  <GridLayer grid={props.grid} display={props.display} sceneZoom={props.scene.zoom} />
</T.Object3D>
