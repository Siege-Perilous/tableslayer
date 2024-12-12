<script lang="ts">
  import * as THREE from 'three';
  import { type Size, T, useLoader } from '@threlte/core';
  import { TextureLoader } from 'three';
  import { MapLayerType, type MapLayerProps } from './types';
  import FogOfWarLayer from '../FogOfWarLayer/FogOfWarLayer.svelte';
  import type { FogOfWarExports } from '../FogOfWarLayer/types';
  import PingLayer from '../PingLayer/PingLayer.svelte';
  import type { StageProps } from '../Stage/types';
  import InputManager from '../InputManager/InputManager.svelte';

  interface Props {
    props: StageProps;
    z: number;
    onMapUpdate: (offset: { x: number; y: number }, zoom: number) => void;
    onPingsUpdated: (updatedLocations: { x: number; y: number }[]) => void;
  }

  let { props, z, onMapUpdate, onPingsUpdated }: Props = $props();
  let mapMesh: THREE.Mesh = $state(new THREE.Mesh());
  let image: THREE.Texture | undefined = $state();
  const loader = useLoader(TextureLoader);
  let fogOfWarLayer: FogOfWarExports;

  let leftMouseDown = false;
  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.0005;

  // The size of the map image
  let mapSize: Size = $state({ width: 0, height: 0 });

  $effect(() => {
    // Update the image whenever the URL is changed
    loader
      .load(props.map.url, {
        transform: (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          return texture;
        }
      })
      .then((texture) => {
        image = texture;
        onMapLoaded({
          width: image?.source.data.width ?? 0,
          height: image?.source.data.height ?? 0
        });
      })
      .catch((reason) => {
        console.error(JSON.stringify(reason));
      });
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

    // Scale offset by scene zoom level so map moves pixel-per-pixel with the mouse
    const newOffset = {
      x: props.map.offset.x + e.movementX / props.scene.zoom,
      y: props.map.offset.y - e.movementY / props.scene.zoom
    };

    onMapUpdate(newOffset, props.map.zoom);
  }

  function onWheel(e: WheelEvent) {
    let scrollDelta;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      scrollDelta = e.deltaX * zoomSensitivity;
    } else {
      scrollDelta = e.deltaY * zoomSensitivity;
    }

    let newZoom = props.map.zoom - scrollDelta;
    newZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
    onMapUpdate(props.map.offset, newZoom);
  }

  function fillMapToScene() {
    const imageAspectRatio = mapSize.width / mapSize.height;
    const sceneAspectRatio = props.display.resolution.x / props.display.resolution.y;

    let newZoom: number;
    if (imageAspectRatio > sceneAspectRatio) {
      newZoom = props.display.resolution.y / mapSize.height;
    } else {
      newZoom = props.display.resolution.x / mapSize.width;
    }

    onMapUpdate({ x: 0, y: 0 }, newZoom);
  }

  function fitMapToScene() {
    const imageAspectRatio = mapSize.width / mapSize.height;
    const sceneAspectRatio = props.display.resolution.x / props.display.resolution.y;

    let newZoom: number;
    if (imageAspectRatio > sceneAspectRatio) {
      newZoom = props.display.resolution.x / mapSize.width;
    } else {
      newZoom = props.display.resolution.y / mapSize.height;
    }

    onMapUpdate({ x: 0, y: 0 }, newZoom);
  }

  function onMapLoaded(size: Size) {
    mapSize = size;
    fitMapToScene();
  }

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

<InputManager
  isActive={props.activeLayer === MapLayerType.Map}
  target={mapMesh}
  layerSize={mapSize}
  {onMouseDown}
  {onMouseUp}
  {onMouseMove}
  {onMouseLeave}
  {onWheel}
/>

<!-- Map -->
<T.Object3D
  position={[props.map.offset.x, props.map.offset.y, 0]}
  rotation.z={(props.map.rotation / 180.0) * Math.PI}
  scale={[mapSize.width * props.map.zoom, mapSize.height * props.map.zoom, 1]}
>
  <T.Mesh bind:ref={mapMesh} position={[0, 0, z]}>
    <T.MeshBasicMaterial map={image} transparent={true} />
    <T.PlaneGeometry />
  </T.Mesh>

  <FogOfWarLayer
    bind:this={fogOfWarLayer}
    props={props.fogOfWar}
    isActive={props.activeLayer === MapLayerType.FogOfWar}
    z={10}
    {mapSize}
  />

  <PingLayer props={props.ping} isActive={props.activeLayer === MapLayerType.Ping} z={20} {mapSize} {onPingsUpdated} />
</T.Object3D>
