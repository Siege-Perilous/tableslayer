<script lang="ts">
  import * as THREE from 'three';
  import { T } from '@threlte/core';
  import { MapLayerType } from './types';
  import type { Size } from '../../types';
  import FogOfWarLayer from '../FogOfWarLayer/FogOfWarLayer.svelte';
  import type { FogOfWarExports } from '../FogOfWarLayer/types';
  import type { Callbacks, StageProps } from '../Stage/types';
  import { getContext } from 'svelte';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';
  import FogLayer from '../FogLayer/FogLayer.svelte';
  import { createDataSource, type IMapDataSource } from './dataSources';

  interface Props {
    props: StageProps;
    onMapLoading: () => void;
    onMapLoaded: (mapUrl: string, mapSize: Size) => void;
  }

  const { props, onMapLoading, onMapLoaded }: Props = $props();

  const callbacks = getContext<Callbacks>('callbacks');
  const onMapUpdate = callbacks.onMapUpdate;

  let currentMapUrl: string | null = $state(null);
  let dataSource: IMapDataSource | null = null;
  let mapImageMaterial = new THREE.MeshBasicMaterial();
  let fogOfWarLayer: FogOfWarExports;

  // The size of the map image
  let mapSize: Size | null = $state(null);

  // Track if the material needs a full update
  let materialUpdateKey = $state(0);

  $effect(() => {
    console.log('[MapLayer] Effect triggered with URL:', props.map.url);

    if (!props.map.url) {
      currentMapUrl = props.map.url;
      // Dispose of data source when URL is null
      if (dataSource) {
        dataSource.dispose();
        dataSource = null;
      }
      return;
    }

    // Check if the URL is changing (including query params for cache busting)
    // For video files, we need to check the full URL including query params
    const newMapUrlWithoutParams = getUrlWithoutParams(props.map.url);
    const currentMapUrlWithoutParams = getUrlWithoutParams(currentMapUrl);

    // Check if this is a video file
    const isVideo = props.map.url.match(/\.(mp4|webm|mov|avi)/i);

    console.log('[MapLayer] URL comparison:', {
      new: newMapUrlWithoutParams,
      current: currentMapUrlWithoutParams,
      newFull: props.map.url,
      currentFull: currentMapUrl,
      isVideo,
      willUpdate: isVideo ? currentMapUrl !== props.map.url : currentMapUrlWithoutParams !== newMapUrlWithoutParams
    });

    // For videos, compare full URLs (including query params) to ensure cache busting
    // For images, compare without params to avoid unnecessary reloads
    if (isVideo) {
      if (currentMapUrl === props.map.url) {
        return;
      }
    } else {
      if (currentMapUrlWithoutParams === newMapUrlWithoutParams) {
        return;
      }
    }

    // Update the current URL immediately
    currentMapUrl = props.map.url;
    console.log('[MapLayer] Loading new map:', props.map.url);

    onMapLoading();

    // Dispose of previous data source
    if (dataSource) {
      dataSource.dispose();
      dataSource = null;
    }

    // Dispose of previous material map
    if (mapImageMaterial.map) {
      mapImageMaterial.map.dispose();
      mapImageMaterial.map = null;
      mapImageMaterial.needsUpdate = true;
    }

    // Create new data source based on file type
    dataSource = createDataSource(props.map.url);

    // Load the new data source
    dataSource
      .load(props.map.url)
      .then(() => {
        const texture = dataSource?.getTexture();
        const size = dataSource?.getSize();

        if (texture && size) {
          mapImageMaterial.map = texture;
          mapImageMaterial.needsUpdate = true;
          mapSize = size;
          // Force material key update to trigger re-render
          materialUpdateKey++;
          onMapLoaded(props.map.url, mapSize);
        }
      })
      .catch((reason) => {
        console.error('Failed to load map:', reason);
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
    toPng: () => fogOfWarLayer.toPng(),
    toRLE: () => fogOfWarLayer.toRLE(),
    fromRLE: (rleData: Uint8Array, width: number, height: number) => fogOfWarLayer.fromRLE(rleData, width, height),
    isDrawing: () => fogOfWarLayer?.isDrawing() ?? false
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
  {#key materialUpdateKey}
    <T.Mesh name="mapImage" layers={[SceneLayer.Main]} renderOrder={SceneLayerOrder.Map} visible={true}>
      <T.MeshBasicMaterial is={mapImageMaterial} />
      <T.PlaneGeometry />
    </T.Mesh>
  {/key}

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
