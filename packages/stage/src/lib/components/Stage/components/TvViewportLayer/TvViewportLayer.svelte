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
    /** Editor viewport rotation in degrees; the hint text counter-rotates to stay readable */
    sceneRotation?: number;
    map: MapTransform;
    mapSize: Size | null;
  }

  const { display, sceneZoom, sceneRotation = 0, map, mapSize }: Props = $props();

  const { invalidate } = useThrelte();

  const OUTLINE_THICKNESS_SCREEN_PX = 2;
  const OUTLINE_COLOR = '#ffffff';
  const OUTLINE_OPACITY = 0.9;
  const DIM_COLOR = '#000000';
  const DIM_OPACITY = 0.4;

  const HINT_TEXT = 'SHIFT + mouse drag to adjust TV view';
  const HINT_FONT_SCREEN_PX = 13;
  const HINT_MARGIN_SCREEN_PX = 8;
  // Rasterize the label larger and scale down so it stays crisp when zooming
  const HINT_SUPERSAMPLE = 4;

  const hint = (() => {
    const canvas = document.createElement('canvas');
    const font = `600 ${HINT_FONT_SCREEN_PX * HINT_SUPERSAMPLE}px system-ui, -apple-system, sans-serif`;
    const measureContext = canvas.getContext('2d')!;
    measureContext.font = font;
    const padding = 2 * HINT_SUPERSAMPLE;
    canvas.width = Math.ceil(measureContext.measureText(HINT_TEXT).width) + padding * 2;
    canvas.height = Math.ceil(HINT_FONT_SCREEN_PX * HINT_SUPERSAMPLE * 1.5);

    // Resizing the canvas resets the context state
    const context = canvas.getContext('2d')!;
    context.font = font;
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 3 * HINT_SUPERSAMPLE;
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillText(HINT_TEXT, padding, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    return { texture, aspect: canvas.width / canvas.height };
  })();

  const hintMaterial = new THREE.MeshBasicMaterial({
    map: hint.texture,
    transparent: true,
    depthTest: false,
    toneMapped: false
  });

  // Constant on-screen size, left-aligned just above the rect's top-left corner
  // as seen on screen: anchor against the rect's screen-space bounding box under
  // the seating rotation, then rotate that offset back into world space
  const hintHeight = $derived((HINT_FONT_SCREEN_PX * 1.5) / sceneZoom);
  const hintWidth = $derived(hintHeight * hint.aspect);
  const hintPosition = $derived.by(() => {
    const theta = (sceneRotation * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const screenHalfWidth = Math.abs((display.resolution.x / 2) * cos) + Math.abs((display.resolution.y / 2) * sin);
    const screenHalfHeight = Math.abs((display.resolution.x / 2) * sin) + Math.abs((display.resolution.y / 2) * cos);
    const screenX = -screenHalfWidth + hintWidth / 2;
    const screenY = screenHalfHeight + HINT_MARGIN_SCREEN_PX / sceneZoom + hintHeight / 2;
    return [screenX * cos - screenY * sin, screenX * sin + screenY * cos, 0];
  });

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
    hintMaterial.dispose();
    hint.texture.dispose();
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

<!-- Reminder above the rect's top-left corner; counter-rotated so it reads
     upright under the editor's seating rotation (camera rotates by
     +sceneRotation, so upright world orientation follows it) -->
<T.Mesh
  name="tvViewportHint"
  position={hintPosition as [number, number, number]}
  rotation={[0, 0, (sceneRotation * Math.PI) / 180]}
  scale={[hintWidth, hintHeight, 1]}
  layers={[SceneLayer.Overlay]}
  renderOrder={SceneLayerOrder.TvViewport}
>
  <T is={hintMaterial} />
  <T.PlaneGeometry />
</T.Mesh>
