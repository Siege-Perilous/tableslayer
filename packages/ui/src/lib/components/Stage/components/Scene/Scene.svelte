<script lang="ts">
  import * as THREE from 'three';
  import { onDestroy, onMount, untrack } from 'svelte';
  import { T, useThrelte, useTask } from '@threlte/core';
  import { EffectComposer, EffectPass, RenderPass, VignetteEffect } from 'postprocessing';
  import type { StageProps } from '../Stage/types';
  import MapLayer from '../MapLayer/MapLayer.svelte';
  import GridLayer from '../GridLayer/GridLayer.svelte';
  import WeatherLayer from '../WeatherLayer/WeatherLayer.svelte';
  import { MapLayerType, type MapLayerExports } from '../MapLayer/types';
  import { clippingPlaneStore, updateClippingPlanes } from '../../helpers/clippingPlaneStore.svelte';
  import InputManager from '../InputManager/InputManager.svelte';

  interface Props {
    props: StageProps;
    onBrushSizeUpdated: (brushSize: number) => void;
    onMapUpdate: (offset: { x: number; y: number }, zoom: number) => void;
    onSceneUpdate: (offset: { x: number; y: number }, zoom: number) => void;
    onPingsUpdated: (updatedLocations: { x: number; y: number }[]) => void;
  }

  let { props, onBrushSizeUpdated, onMapUpdate, onSceneUpdate, onPingsUpdated }: Props = $props();

  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  let mapLayer: MapLayerExports;

  // TODO: Add post-processing effects
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene);
  composer.addPass(renderPass);
  composer.addPass(new EffectPass($camera, new VignetteEffect({ offset: 0.2 })));

  onMount(() => {
    let before = autoRender.current;
    autoRender.set(false);

    return () => {
      autoRender.set(before);
    };
  });

  export function fillSceneToCanvas() {
    const canvasAspectRatio = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
    const sceneAspectRatio = props.display.resolution.x / props.display.resolution.y;

    let newZoom: number;
    if (sceneAspectRatio > canvasAspectRatio) {
      newZoom = renderer.domElement.clientHeight / props.display.resolution.y;
    } else {
      newZoom = renderer.domElement.clientWidth / props.display.resolution.x;
    }

    onSceneUpdate(props.scene.offset, newZoom);
  }

  export function fitSceneToCanvas() {
    const canvasAspectRatio = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
    const sceneAspectRatio = props.display.resolution.x / props.display.resolution.y;

    let newZoom: number;
    if (sceneAspectRatio < canvasAspectRatio) {
      newZoom = renderer.domElement.clientHeight / props.display.resolution.y;
    } else {
      newZoom = renderer.domElement.clientWidth / props.display.resolution.x;
    }

    onSceneUpdate(props.scene.offset, newZoom);
  }

  $effect(() => {
    renderPass.mainCamera = $camera;
    composer.setSize($size.width, $size.height);
    renderer.setClearColor(new THREE.Color(props.backgroundColor), 0);
  });

  // Whenever the scene or display properties change, update the clipping planes
  $effect(() => {
    updateClippingPlanes(props.scene, props.display);
    untrack(() => (renderer.clippingPlanes = clippingPlaneStore.value));
  });

  useTask(
    (dt) => {
      if (!scene || !renderer) return;
      composer.render(dt);
    },
    { stage: renderStage }
  );

  export const map = {
    fill: () => mapLayer.map.fill(),
    fit: () => mapLayer.map.fit()
  };

  // References to the layer doesn't exist until the component is mounted,
  // so we need create these wrapper functions
  export const fogOfWar = {
    clear: () => mapLayer.fogOfWar.clear(),
    reset: () => mapLayer.fogOfWar.reset(),
    toBase64: () => mapLayer.fogOfWar.toBase64()
  };
</script>

<T.OrthographicCamera makeDefault near={0.1} far={1000} position={[0, 0, 100]}></T.OrthographicCamera>

<!-- Scene -->
<T.Object3D position={[props.scene.offset.x, props.scene.offset.y, 0]} scale={[props.scene.zoom, props.scene.zoom, 1]}>
  <MapLayer bind:this={mapLayer} {props} z={0} {onBrushSizeUpdated} {onMapUpdate} {onPingsUpdated} />

  <!-- Map overlays that scale with the scene -->
  <GridLayer props={props.grid} z={30} display={props.display} sceneScale={props.scene.zoom} />
  <WeatherLayer props={props.weather} z={40} resolution={props.display.resolution} />
</T.Object3D>
