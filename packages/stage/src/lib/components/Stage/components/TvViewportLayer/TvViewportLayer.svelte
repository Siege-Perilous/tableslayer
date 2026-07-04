<script lang="ts">
  import * as THREE from 'three';
  import { T, useThrelte } from '@threlte/core';
  import { onDestroy } from 'svelte';
  import type { Size } from '../../types';
  import type { MapTransform } from '../../helpers/mapSpace';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';
  import type { DisplayProps } from '../Stage/types';
  import fragmentShader from '../../shaders/TvViewport.frag?raw';
  import vertexShader from '../../shaders/default.vert?raw';

  interface Props {
    display: DisplayProps;
    sceneZoom: number;
    map: MapTransform;
    mapSize: Size | null;
  }

  const { display, sceneZoom, map, mapSize }: Props = $props();

  const { invalidate } = useThrelte();

  const OUTLINE_THICKNESS_SCREEN_PX = 2;
  const OUTLINE_COLOR = '#ffffff';
  const OUTLINE_OPACITY = 0.9;
  const DIM_COLOR = '#000000';
  const DIM_OPACITY = 0.4;

  // The quad must cover everything the dim mask should reach: the whole map
  // plus the TV rectangle, with margin for panning around them
  const quadSize = $derived.by(() => {
    const mapDiagonal = mapSize ? Math.hypot(mapSize.width * map.zoom, mapSize.height * map.zoom) : 0;
    const displayDiagonal = Math.hypot(display.resolution.x, display.resolution.y);
    return 3 * (Math.hypot(map.offset.x, map.offset.y) + Math.max(mapDiagonal, displayDiagonal));
  });

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uQuadSize_px: new THREE.Uniform(new THREE.Vector2(1, 1)),
      uRectHalf_px: new THREE.Uniform(new THREE.Vector2(0, 0)),
      uOutlineThickness_px: new THREE.Uniform(OUTLINE_THICKNESS_SCREEN_PX),
      uOutlineColor: new THREE.Uniform(new THREE.Color(OUTLINE_COLOR)),
      uOutlineOpacity: new THREE.Uniform(OUTLINE_OPACITY),
      uDimColor: new THREE.Uniform(new THREE.Color(DIM_COLOR)),
      uDimOpacity: new THREE.Uniform(DIM_OPACITY)
    },
    fragmentShader,
    vertexShader,
    transparent: true,
    depthTest: false
  });

  onDestroy(() => {
    material.dispose();
  });

  $effect(() => {
    material.uniforms.uQuadSize_px.value.set(quadSize, quadSize);
    material.uniforms.uRectHalf_px.value.set(display.resolution.x / 2, display.resolution.y / 2);
    // Keep the outline a constant on-screen thickness regardless of editor zoom
    material.uniforms.uOutlineThickness_px.value = OUTLINE_THICKNESS_SCREEN_PX / sceneZoom;
    invalidate();
  });
</script>

<T.Mesh
  name="tvViewportLayer"
  scale={[quadSize, quadSize, 1]}
  layers={[SceneLayer.Overlay]}
  renderOrder={SceneLayerOrder.TvViewport}
>
  <T is={material} />
  <T.PlaneGeometry />
</T.Mesh>
