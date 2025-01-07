<script lang="ts">
  import * as THREE from 'three';
  import { type Size, T, useLoader } from '@threlte/core';
  import { TextureLoader } from 'three';
  import { MapLayerType } from './types';
  import FogOfWarLayer from '../FogOfWarLayer/FogOfWarLayer.svelte';
  import type { FogOfWarExports } from '../FogOfWarLayer/types';
  import PingLayer from '../PingLayer/PingLayer.svelte';
  import type { Callbacks, StageProps } from '../Stage/types';
  import { getContext } from 'svelte';

  interface Props {
    props: StageProps;
    z: number;
  }

  const { props }: Props = $props();

  const onMapUpdate = getContext<Callbacks>('callbacks').onMapUpdate;

  let image: THREE.Texture | undefined = $state();
  const loader = useLoader(TextureLoader);
  let fogOfWarLayer: FogOfWarExports;

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
        mapSize = {
          width: image?.source.data.width ?? 0,
          height: image?.source.data.height ?? 0
        };
      })
      .catch((reason) => {
        console.error(JSON.stringify(reason));
      });
  });

  export function fill() {
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

  export function fit() {
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

  // References to the layer doesn't exist until the component is mounted,
  // so we need create these wrapper functions
  export const fogOfWar = {
    clear: () => fogOfWarLayer.clearFog(),
    reset: () => fogOfWarLayer.resetFog(),
    toBase64: () => fogOfWarLayer.toBase64()
  };
</script>

<!-- Map -->
<T.Object3D
  position={[props.map.offset.x, props.map.offset.y, 0]}
  rotation.z={(props.map.rotation / 180.0) * Math.PI}
  scale={[mapSize.width * props.map.zoom, mapSize.height * props.map.zoom, 1]}
>
  <!-- Map image -->
  <T.Mesh>
    <T.MeshBasicMaterial map={image} transparent={true} />
    <T.PlaneGeometry />
  </T.Mesh>

  <FogOfWarLayer
    bind:this={fogOfWarLayer}
    props={props.fogOfWar}
    isActive={props.activeLayer === MapLayerType.FogOfWar}
    {mapSize}
  />

  <PingLayer props={props.ping} isActive={props.activeLayer === MapLayerType.Ping} {mapSize} />
</T.Object3D>
