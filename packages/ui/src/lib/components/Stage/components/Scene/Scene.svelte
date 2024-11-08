<script lang="ts">
  import * as THREE from 'three';
  import { onDestroy, onMount } from 'svelte';
  import { type Size, T, useThrelte, useTask } from '@threlte/core';
  import { EffectComposer, EffectPass, RenderPass, VignetteEffect } from 'postprocessing';
  import type { StageProps } from '../Stage/types';
  import FogOfWarLayer from '../FogOfWarLayer/FogOfWarLayer.svelte';
  import MapLayer from '../MapLayer/MapLayer.svelte';
  import GridLayer from '../GridLayer/GridLayer.svelte';
  import WeatherLayer from '../WeatherLayer/WeatherLayer.svelte';
  import { MapLayerType } from '../MapLayer/types';
  import type { FogOfWarExports } from '../FogOfWarLayer/types';

  interface Props {
    props: StageProps;
    onMapUpdate: (offset: { x: number; y: number }, zoom: number) => void;
  }

  let { props, onMapUpdate }: Props = $props();

  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  let fogOfWarLayer: FogOfWarExports;

  // The translation and zoom of the entire scene relative to the stage
  let sceneScale: number = $state(1);
  // The position of the scene relative to the stage
  let scenePosition: [x: number, y: number, z: number] = $state([0, 0, 0]);
  // The size of the map image
  let mapSize: Size = $state({ width: 0, height: 0 });

  let leftMouseDown = false;

  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.0005;

  // TODO: Add post-processing effects
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene);
  composer.addPass(renderPass);
  composer.addPass(new EffectPass($camera, new VignetteEffect({ offset: 0.2 })));

  onMount(() => {
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseLeave);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onWheel);

    let before = autoRender.current;
    autoRender.set(false);

    fitSceneToCanvas();

    return () => {
      autoRender.set(before);
    };
  });

  onDestroy(() => {
    renderer.domElement.removeEventListener('mousedown', onMouseDown);
    renderer.domElement.removeEventListener('mouseup', onMouseUp);
    renderer.domElement.removeEventListener('mouseleave', onMouseLeave);
    renderer.domElement.removeEventListener('mousemove', onMouseMove);
    renderer.domElement.removeEventListener('wheel', onWheel);
  });

  function onMouseDown(e: MouseEvent) {
    // Left mouse button
    if (e.button === 0) {
      leftMouseDown = true;
    }
  }

  function onMouseUp(e: MouseEvent) {
    // Left mouse button
    if (e.button === 0) {
      leftMouseDown = false;
    }
  }

  function onMouseLeave() {
    leftMouseDown = false;
  }

  function onMouseMove(e: MouseEvent) {
    if (!leftMouseDown) return;

    // When control key is pressed, pan the entire scene
    if (e.shiftKey) {
      scenePosition = [scenePosition[0] + e.movementX, scenePosition[1] - e.movementY, 0];
    }
    // Only allow movement if no map layers are currently being edited
    else if (props.scene.activeLayer === MapLayerType.None) {
      onMapUpdate(
        {
          x: props.map.offset.x + e.movementX,
          y: props.map.offset.y - e.movementY
        },
        props.map.zoom
      );
    }
  }

  function onWheel(e: WheelEvent) {
    // If shift key is pressed, zoom the entire scene, otherwis zoom the map
    if (e.shiftKey) {
      sceneScale = Math.max(minZoom, Math.min(sceneScale - e.deltaX * zoomSensitivity, maxZoom));
    } else if (props.scene.activeLayer === MapLayerType.None) {
      let newZoom = props.map.zoom - e.deltaY * zoomSensitivity;
      newZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
      onMapUpdate(props.map.offset, newZoom);
    }
  }

  export function centerScene() {
    scenePosition = [0, 0, 0];
  }

  export function fillSceneToCanvas() {
    const canvasAspectRatio = renderer.domElement.width / renderer.domElement.height;
    const sceneAspectRatio = props.scene.resolution.x / props.scene.resolution.y;

    if (sceneAspectRatio > canvasAspectRatio) {
      sceneScale = renderer.domElement.height / props.scene.resolution.y;
    } else {
      sceneScale = renderer.domElement.width / props.scene.resolution.x;
    }

    centerScene();
  }

  export function fitSceneToCanvas() {
    const canvasAspectRatio = $size.width / $size.height;
    const sceneAspectRatio = props.scene.resolution.x / props.scene.resolution.y;

    if (sceneAspectRatio > canvasAspectRatio) {
      sceneScale = $size.width / props.scene.resolution.x;
    } else {
      sceneScale = $size.height / props.scene.resolution.y;
    }

    centerScene();
  }

  function centerMap() {
    onMapUpdate({ x: 0, y: 0 }, props.map.zoom);
  }

  function fillMapToScene() {
    const imageAspectRatio = mapSize.width / mapSize.height;
    const sceneAspectRatio = props.scene.resolution.x / props.scene.resolution.y;

    let newZoom: number;
    if (imageAspectRatio > sceneAspectRatio) {
      newZoom = props.scene.resolution.y / mapSize.height;
    } else {
      newZoom = props.scene.resolution.x / mapSize.width;
    }

    onMapUpdate({ x: 0, y: 0 }, newZoom);
  }

  function fitMapToScene() {
    const imageAspectRatio = mapSize.width / mapSize.height;
    const sceneAspectRatio = props.scene.resolution.x / props.scene.resolution.y;

    let newZoom: number;
    if (imageAspectRatio > sceneAspectRatio) {
      newZoom = props.scene.resolution.x / mapSize.width;
    } else {
      newZoom = props.scene.resolution.y / mapSize.height;
    }

    onMapUpdate({ x: 0, y: 0 }, newZoom);
  }

  $effect(() => {
    renderPass.mainCamera = $camera;
    composer.setSize($size.width, $size.height);
    renderer.setClearColor(new THREE.Color(props.backgroundColor));
  });

  useTask(
    (dt) => {
      if (!scene || !renderer) return;
      composer.render(dt);
    },
    { stage: renderStage }
  );

  export const map = {
    center: () => centerMap(),
    fill: () => fillMapToScene(),
    fit: () => fitMapToScene()
  };

  export const fogOfWar = {
    clear: () => fogOfWarLayer.clearFog(),
    reset: () => fogOfWarLayer.resetFog(),
    toBase64: () => fogOfWarLayer.toBase64()
  };
</script>

<T.OrthographicCamera makeDefault near={0.1} far={1000} position={[0, 0, 100]}></T.OrthographicCamera>

<!-- Scene -->
<T.Object3D position={scenePosition} scale={[sceneScale, sceneScale, 1]}>
  <!-- Map -->
  <T.Object3D
    position={[props.map.offset.x, props.map.offset.y, 0]}
    rotation.z={(props.map.rotation / 180.0) * Math.PI}
    scale={[mapSize.width * props.map.zoom, mapSize.height * props.map.zoom, 1]}
  >
    <!-- <MapLayer props={props.map} z={0} onmaploaded={(size: Size) => (mapSize = size)} /> -->
    <!-- Map layers that scale with the map -->
    <FogOfWarLayer
      bind:this={fogOfWarLayer}
      props={props.fogOfWar}
      isActive={props.scene.activeLayer === MapLayerType.FogOfWar}
      z={10}
      {mapSize}
    />
  </T.Object3D>

  <!-- Map overlays that scale with the scene 
  <GridLayer props={props.grid} z={30} resolution={props.scene.resolution} {sceneScale} />
  <WeatherLayer props={props.weather} z={40} resolution={props.scene.resolution} /> -->
</T.Object3D>
