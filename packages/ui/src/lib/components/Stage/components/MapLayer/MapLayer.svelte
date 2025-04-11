<script lang="ts">
  import * as THREE from 'three';
  import { T, useLoader } from '@threlte/core';
  import { TextureLoader } from 'three';
  import { MapLayerType } from './types';
  import type { Size } from '../../types';
  import FogOfWarLayer from '../FogOfWarLayer/FogOfWarLayer.svelte';
  import type { FogOfWarExports } from '../FogOfWarLayer/types';
  import type { Callbacks, StageProps } from '../Stage/types';
  import { getContext } from 'svelte';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';
  import FogLayer from '../FogLayer/FogLayer.svelte';

  interface Props {
    props: StageProps;
    onMapLoading: () => void;
    onMapLoaded: (mapUrl: string, mapSize: Size) => void;
  }

  const { props, onMapLoading, onMapLoaded }: Props = $props();

  const callbacks = getContext<Callbacks>('callbacks');
  const onMapUpdate = callbacks.onMapUpdate;

  const loader = useLoader(TextureLoader);
  let imageUrl: string | null = $state(null);
  let mapImageMaterial = new THREE.MeshBasicMaterial();
  let fogOfWarLayer: FogOfWarExports;

  // The size of the map image
  let mapSize: Size | null = $state(null);

  $effect(() => {
    if (!props.map.url) {
      imageUrl = props.map.url;
      return;
    }

    // Check if the actual map image URL is changing (ignoring timestamp)
    const newMapUrlWithoutParams = getUrlWithoutParams(props.map.url);
    const currentMapUrlWithoutParams = getUrlWithoutParams(imageUrl);

    // Do not update if the image url has not changed
    if (currentMapUrlWithoutParams === newMapUrlWithoutParams) {
      return;
    } else {
      imageUrl = props.map.url;
    }

    onMapLoading();

    // Update the image whenever the URL is changed
    loader
      .load(props.map.url, {
        transform: (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          return texture;
        }
      })
      .then((texture) => {
        mapImageMaterial.map?.dispose();
        mapImageMaterial.map = texture;
        mapImageMaterial.needsUpdate = true;
        mapSize = {
          width: texture.image.width,
          height: texture.image.height
        };
        onMapLoaded(props.map.url, mapSize);
      })
      .catch((reason) => {
        console.error(JSON.stringify(reason));
      });
  });

  function getUrlWithoutParams(url: string | null): string {
    if (!url) return '';
    return url.split('?')[0];
  }

  export function getCompositeMapTexture(): THREE.Texture | null {
    return mapImageMaterial.map;
  }

  export function fill() {
    if (!mapSize) return;

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
    if (!mapSize) return;
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
    toPng: () => fogOfWarLayer.toPng()
  };
</script>

<!-- Map -->
<T.Object3D
  name="mapLayer"
  position={[props.map.offset.x, props.map.offset.y, 0]}
  rotation.z={(props.map.rotation / 180.0) * Math.PI}
  scale={[(mapSize?.width ?? 0) * props.map.zoom, (mapSize?.height ?? 0) * props.map.zoom, 1]}
>
  <!-- Map image -->
  <T.Mesh name="mapImage" layers={[SceneLayer.Main]} renderOrder={SceneLayerOrder.Map} visible={true}>
    <T.MeshBasicMaterial is={mapImageMaterial} />
    <T.PlaneGeometry />
  </T.Mesh>

  <FogLayer
    props={props.fog}
    {mapSize}
    layers={[SceneLayer.Main]}
    renderOrder={SceneLayerOrder.Fog}
    visible={props.fog.enabled}
  />

  <FogOfWarLayer
    bind:this={fogOfWarLayer}
    props={props.fogOfWar}
    isActive={props.activeLayer === MapLayerType.FogOfWar}
    {mapSize}
    layers={[SceneLayer.Main]}
    renderOrder={SceneLayerOrder.FogOfWar}
  />
</T.Object3D>
