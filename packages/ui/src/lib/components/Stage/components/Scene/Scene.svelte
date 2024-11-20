<script lang="ts">
  import * as THREE from 'three';
  import { onDestroy, onMount, untrack } from 'svelte';
  import { type Size, T, useThrelte, useTask } from '@threlte/core';
  import { EffectComposer, EffectPass, RenderPass, VignetteEffect } from 'postprocessing';
  import type { StageProps } from '../Stage/types';
  import FogOfWarLayer from '../FogOfWarLayer/FogOfWarLayer.svelte';
  import MapLayer from '../MapLayer/MapLayer.svelte';
  import GridLayer from '../GridLayer/GridLayer.svelte';
  import WeatherLayer from '../WeatherLayer/WeatherLayer.svelte';
  import { MapLayerType } from '../MapLayer/types';
  import type { FogOfWarExports } from '../FogOfWarLayer/types';
  import PingLayer from '../PingLayer/PingLayer.svelte';

  interface Props {
    props: StageProps;
    onMapUpdate: (offset: { x: number; y: number }, zoom: number) => void;
    onSceneUpdate: (offset: { x: number; y: number }, zoom: number) => void;
    onPingsUpdated: (updatedLocations: { x: number; y: number }[]) => void;
  }

  let { props, onMapUpdate, onSceneUpdate, onPingsUpdated }: Props = $props();

  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  let fogOfWarLayer: FogOfWarExports;

  // The size of the map image
  let mapSize: Size = $state({ width: 0, height: 0 });

  // Add clipping planes to prevent map content from leaking outside of the scene area
  let clippingPlanes = $state([
    new THREE.Plane(new THREE.Vector3(-1, 0, 0)),
    new THREE.Plane(new THREE.Vector3(1, 0, 0)),
    new THREE.Plane(new THREE.Vector3(0, 1, 0)),
    new THREE.Plane(new THREE.Vector3(0, -1, 0))
  ]);

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
      const newOffset = {
        x: props.scene.offset.x + e.movementX,
        y: props.scene.offset.y - e.movementY
      };

      onSceneUpdate(newOffset, props.scene.zoom);
    }
    // Only allow movement if no map layers are currently being edited
    else if (props.scene.activeLayer === MapLayerType.None) {
      // Scale offset by scene zoom level so map moves pixel-per-pixel with the mouse
      const newOffset = {
        x: props.map.offset.x + e.movementX / props.scene.zoom,
        y: props.map.offset.y - e.movementY / props.scene.zoom
      };

      onMapUpdate(newOffset, props.map.zoom);
    }
  }

  function onWheel(e: WheelEvent) {
    // On MacOS, SHIFT + Scroll results in horizontal scroll
    let scrollDelta;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      scrollDelta = e.deltaX * zoomSensitivity;
    } else {
      scrollDelta = e.deltaY * zoomSensitivity;
    }

    // If shift key is pressed, zoom the entire scene, otherwis zoom the map
    if (e.shiftKey) {
      let newZoom = props.scene.zoom - scrollDelta;
      newZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
      onSceneUpdate(props.scene.offset, newZoom);
    } else if (props.scene.activeLayer === MapLayerType.None) {
      let newZoom = props.map.zoom - scrollDelta;
      newZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
      onMapUpdate(props.map.offset, newZoom);
    }
  }

  export function fillSceneToCanvas() {
    const canvasAspectRatio = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
    const sceneAspectRatio = props.scene.resolution.x / props.scene.resolution.y;

    let newZoom: number;
    if (sceneAspectRatio > canvasAspectRatio) {
      newZoom = renderer.domElement.clientHeight / props.scene.resolution.y;
    } else {
      newZoom = renderer.domElement.clientWidth / props.scene.resolution.x;
    }

    onSceneUpdate(props.map.offset, newZoom);
  }

  export function fitSceneToCanvas() {
    const canvasAspectRatio = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
    const sceneAspectRatio = props.scene.resolution.x / props.scene.resolution.y;

    let newZoom: number;
    if (sceneAspectRatio < canvasAspectRatio) {
      newZoom = renderer.domElement.clientHeight / props.scene.resolution.y;
    } else {
      newZoom = renderer.domElement.clientWidth / props.scene.resolution.x;
    }

    onSceneUpdate(props.map.offset, newZoom);
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

  function onMapLoaded(size: Size) {
    mapSize = size;
    fitMapToScene();
  }

  $effect(() => {
    // Whenever the scene is translated/zoomed, update the clipping planes
    const { x, y } = props.scene.offset;
    const worldExtents = {
      x: props.scene.zoom * (props.scene.resolution.x / 2),
      y: props.scene.zoom * (props.scene.resolution.y / 2)
    };

    // Avoid re-triggering this effect when updating the clipping planes
    untrack(() => {
      clippingPlanes[0].constant = worldExtents.x + x;
      clippingPlanes[1].constant = worldExtents.x - x;
      clippingPlanes[2].constant = worldExtents.y - y;
      clippingPlanes[3].constant = worldExtents.y + y;
      clippingPlanes = [...clippingPlanes];
      renderer.clippingPlanes = clippingPlanes;
    });
  });

  $effect(() => {
    renderPass.mainCamera = $camera;
    composer.setSize($size.width, $size.height);
    renderer.setClearColor(new THREE.Color(props.backgroundColor), 0);
  });

  useTask(
    (dt) => {
      if (!scene || !renderer) return;
      composer.render(dt);
    },
    { stage: renderStage }
  );

  export const map = {
    fill: () => fillMapToScene(),
    fit: () => fitMapToScene()
  };

  // References to the layer doesn't exist until the component is mounted,
  // so we need create these wrapper functions
  export const fogOfWar = {
    clear: () => fogOfWarLayer.clearFog(),
    reset: () => fogOfWarLayer.resetFog(),
    toBase64: () => fogOfWarLayer.toBase64()
  };
</script>

<T.OrthographicCamera makeDefault near={0.1} far={1000} position={[0, 0, 100]}></T.OrthographicCamera>

<!-- Scene -->
<T.Object3D position={[props.scene.offset.x, props.scene.offset.y, 0]} scale={[props.scene.zoom, props.scene.zoom, 1]}>
  <!-- Map -->
  <T.Object3D
    position={[props.map.offset.x, props.map.offset.y, 0]}
    rotation.z={(props.map.rotation / 180.0) * Math.PI}
    scale={[mapSize.width * props.map.zoom, mapSize.height * props.map.zoom, 1]}
  >
    <MapLayer props={props.map} z={0} {onMapLoaded} />
    <FogOfWarLayer
      bind:this={fogOfWarLayer}
      props={props.fogOfWar}
      isActive={props.scene.activeLayer === MapLayerType.FogOfWar}
      z={10}
      {mapSize}
    />
    <PingLayer
      props={props.ping}
      isActive={props.scene.activeLayer === MapLayerType.Ping}
      z={20}
      {clippingPlanes}
      {mapSize}
      {onPingsUpdated}
    />
  </T.Object3D>

  <!-- Map overlays that scale with the scene -->
  <GridLayer props={props.grid} z={30} resolution={props.scene.resolution} sceneScale={props.scene.zoom} />
  <WeatherLayer props={props.weather} z={40} resolution={props.scene.resolution} />
</T.Object3D>
