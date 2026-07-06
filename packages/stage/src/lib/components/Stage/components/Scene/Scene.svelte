<script lang="ts">
  import * as THREE from 'three';
  import { getContext, onMount, onDestroy, untrack } from 'svelte';
  import { T, useThrelte, useTask } from '@threlte/core';
  import {
    EffectComposer,
    EffectPass,
    RenderPass,
    BloomEffect,
    VignetteEffect,
    ChromaticAberrationEffect,
    BlendFunction,
    ToneMappingEffect,
    ToneMappingMode,
    LUT3DEffect
  } from 'postprocessing';
  import { getLUT } from './luts';
  import { PERFORMANCE_TIER_SETTINGS, StageMode, type Callbacks, type StageProps } from '../Stage/types';
  import { GridMode } from '../GridLayer/types';
  import { MapLayerType, type MapLayerExports } from '../MapLayer/types';
  import { getMapSpaceDisplay, mapToDisplaySpace } from '../../helpers/mapSpace';
  import {
    clippingPlaneStore,
    updateClippingPlanes,
    updateMapClippingPlanes
  } from '../../helpers/clippingPlaneStore.svelte';
  import type { Size } from '../../types';
  import { beginFrame, endFrame, startTiming, endTiming, logMetrics } from '../../helpers/performanceMetrics.svelte';
  import { debugState } from '../../helpers/debugState.svelte';
  import { getGridCellSize as getGridCellSizeHelper } from '../../helpers/grid';
  import { SceneLayer, SceneLayerOrder, SceneLoadingState } from './types';
  import type { AnnotationExports } from '../AnnotationLayer/types';
  import type { PostProcessingProps } from './types';
  import AnnotationLayer from '../AnnotationLayer/AnnotationLayer.svelte';
  import CursorLayer from '../CursorLayer/CursorLayer.svelte';
  import type { CursorData } from '../CursorLayer/types';
  import EdgeOverlayLayer from '../EdgeOverlayLayer/EdgeOverlayLayer.svelte';
  import GridLayer from '../GridLayer/GridLayer.svelte';
  import LightLayer from '../LightLayer/LightLayer.svelte';
  import type { LightLayerExports } from '../LightLayer/types';
  import MapLayer from '../MapLayer/MapLayer.svelte';
  import MarkerLayer from '../MarkerLayer/MarkerLayer.svelte';
  import MeasurementLayer from '../MeasurementLayer/MeasurementLayer.svelte';
  import type { MarkerLayerExports } from '../MarkerLayer/types';
  import TvViewportLayer from '../TvViewportLayer/TvViewportLayer.svelte';
  import WeatherLayer from '../WeatherLayer/WeatherLayer.svelte';

  interface Props {
    props: StageProps;
    cursors?: CursorData[];
    trackLocalCursor?: boolean;
    receivedMeasurement?: {
      startPoint: { x: number; y: number };
      endPoint: { x: number; y: number };
      type: number;
      beamWidth?: number;
      coneAngle?: number;
      // Visual properties
      color?: string;
      thickness?: number;
      outlineColor?: string;
      outlineThickness?: number;
      opacity?: number;
      markerSize?: number;
      // Timing properties
      autoHideDelay?: number;
      fadeoutTime?: number;
      // Distance properties
      showDistance?: boolean;
      snapToGrid?: boolean;
      enableDMG252?: boolean;
    } | null;
  }

  let { props, receivedMeasurement = null, cursors = [], trackLocalCursor = false }: Props = $props();

  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  const callbacks = getContext<Callbacks>('callbacks');
  const onSceneUpdate = callbacks.onSceneUpdate;

  // Type definition for MeasurementLayer exports
  type MeasurementLayerExports = {
    getCurrentMeasurement: () => {
      startPoint: THREE.Vector2 | null;
      endPoint: THREE.Vector2 | null;
      type: number;
    } | null;
    isCurrentlyDrawing: () => boolean;
  };

  let annotationsLayer: AnnotationExports;
  let lightLayer: LightLayerExports;
  let mapLayer: MapLayerExports;
  let markerLayer: MarkerLayerExports;
  let measurementLayer: MeasurementLayerExports | null = $state(null);
  let mapSize: Size | null = $state(null);
  let needsResize = true;
  let loadingState = SceneLoadingState.LoadingMap;

  // In MapDefined mode the grid/marker/light/annotation/measurement layers are
  // anchored to the map: they mount inside the mapAnchor group and all their
  // display-space math runs against a synthetic map-space DisplayProps, so
  // positions/sizes come out in center-relative map pixels. Until the map
  // image resolves, everything behaves exactly like FillSpace.
  const isMapDefined = $derived(props.grid.gridMode === GridMode.MapDefined && mapSize !== null);
  // Display pixels per local (map) pixel for anchored layers
  const localScale = $derived(isMapDefined ? props.map.zoom : 1);
  const anchoredDisplay = $derived(
    isMapDefined && mapSize ? getMapSpaceDisplay(props.grid, mapSize, props.display) : props.display
  );

  // Local cursor tracking
  let raycaster = new THREE.Raycaster();
  raycaster.layers.enable(SceneLayer.Main);

  // Pre-allocated objects for mouse tracking to avoid GC pressure
  const mouseNDC = new THREE.Vector2();
  const intersectionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const intersectionPoint = new THREE.Vector3();

  let composer = new EffectComposer(renderer);

  // Effects with zero-strength settings contribute nothing visible, so treat
  // them as disabled; this lets the render loop bypass the composer entirely
  const getActiveEffects = (pp: PostProcessingProps) => ({
    bloom: pp.bloom.enabled && pp.bloom.intensity > 0,
    chromaticAberration: pp.chromaticAberration.enabled && pp.chromaticAberration.offset !== 0,
    vignette: pp.vignette.enabled && pp.vignette.darkness > 0,
    lut: pp.lut.enabled && pp.lut.url !== null
  });

  onMount(() => {
    let before = autoRender.current;
    autoRender.set(false);
    renderer.autoClear = false;
    renderer.setClearColor(0, 0);
    renderer.localClippingEnabled = true;

    // Add mouse tracking if enabled
    if (trackLocalCursor && callbacks.onCursorMove) {
      const handleMouseMove = (event: MouseEvent) => {
        // Convert mouse position to normalized device coordinates
        const rect = renderer.domElement.getBoundingClientRect();
        mouseNDC.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        // Update raycaster with camera and mouse position
        raycaster.setFromCamera(mouseNDC, $camera);

        // Find intersection with the z=0 plane using ray.intersectPlane (no allocations)
        const hit = raycaster.ray.intersectPlane(intersectionPlane, intersectionPoint);

        if (hit) {
          // Account for scene transform (offset and zoom)
          const adjustedPos = {
            x: (intersectionPoint.x - props.scene.offset.x) / props.scene.zoom,
            y: (intersectionPoint.y - props.scene.offset.y) / props.scene.zoom,
            z: 0
          };

          callbacks.onCursorMove?.(adjustedPos);
        }
      };

      renderer.domElement.addEventListener('mousemove', handleMouseMove);

      return () => {
        autoRender.set(before);
        renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      };
    }

    return () => {
      autoRender.set(before);
    };
  });

  onDestroy(() => {
    composer.dispose();
  });

  // Cap pixel ratio for performance on weak GPUs (e.g., Mac Mini).
  // Reactive so performance tier changes apply without a reload.
  $effect(() => {
    const maxDpr = props.display.maxPixelRatio ?? 2;
    const dpr = Math.min(window.devicePixelRatio, maxDpr);
    if (renderer.getPixelRatio() !== dpr) {
      renderer.setPixelRatio(dpr);
      needsResize = true;
    }
  });

  // Setup camera and renderer in effect
  $effect(() => {
    if (!camera) return;

    // Configure camera to see both layers
    $camera.layers.disableAll();
    $camera.layers.enable(SceneLayer.Main);
    $camera.layers.enable(SceneLayer.Overlay);
  });

  // Whenever the scene or display properties change, update the clipping planes.
  // In MapDefined mode the DM sees the whole map (no display-rect clipping);
  // the TV viewport rectangle overlay indicates the playfield-visible region.
  $effect(() => {
    updateClippingPlanes(props.scene, props.display, props.mode === StageMode.DM && isMapDefined);
    untrack(() => (renderer.clippingPlanes = clippingPlaneStore.value));
  });

  // Clipping planes that constrain weather and light effects to the map bounds
  $effect(() => {
    updateMapClippingPlanes(props.scene, props.map, mapSize, props.display);
  });

  // Update needsResize when map URL changes. Guard on the URL VALUE: the map
  // object is replaced wholesale when a remote doc update changes any map
  // field (e.g. another editor panning), and keying off its identity would
  // re-run setSize + autoFit refit once per received pan step — camera
  // bouncing on auto-fit editors and render-target churn on every receiver.
  let resizedForMapUrl: string | null = null;
  $effect(() => {
    const mapUrl = props.map.url;
    if (mapUrl && mapUrl !== resizedForMapUrl) {
      needsResize = true;
    }
    resizedForMapUrl = mapUrl;
  });

  // Effect to update post-processing settings when props change. Guarded by
  // VALUE: the props root is replaced on every remote doc rebuild (another
  // editor panning re-runs every props-reading effect), and rebuilding the
  // composer per identity change blocks the main thread for hundreds of ms —
  // receivers dropped to ~4fps while a remote peer panned.
  let lastPostProcessingKey = '';
  $effect(() => {
    const postProcessing = $state.snapshot(props.postProcessing);
    const postProcessingKey = JSON.stringify(postProcessing);
    if (postProcessingKey === lastPostProcessingKey) return;
    lastPostProcessingKey = postProcessingKey;

    // Need to convert the LUT to a LookupTexture
    Promise.resolve(getLUT(postProcessing.lut.url))
      .then((lut) => {
        composer.dispose();
        composer = new EffectComposer(renderer);

        const effects = [];

        const renderPass = new RenderPass(scene, $camera);
        composer.addPass(renderPass);

        const activeEffects = getActiveEffects(postProcessing);

        if (postProcessing.enabled) {
          if (activeEffects.bloom) {
            const bloomEffect = new BloomEffect({
              intensity: postProcessing.bloom.intensity,
              mipmapBlur: postProcessing.bloom.mipmapBlur,
              radius: postProcessing.bloom.radius,
              levels: postProcessing.bloom.levels,
              luminanceThreshold: postProcessing.bloom.threshold,
              luminanceSmoothing: postProcessing.bloom.smoothing
            });
            effects.push(bloomEffect);
          }

          if (activeEffects.chromaticAberration) {
            const chromaticAberrationEffect = new ChromaticAberrationEffect({
              offset: new THREE.Vector2(postProcessing.chromaticAberration.offset),
              radialModulation: true,
              modulationOffset: 0.025
            });
            effects.push(chromaticAberrationEffect);
          }

          if (activeEffects.vignette) {
            const vignetteEffect = new VignetteEffect({
              offset: postProcessing.vignette.offset,
              darkness: postProcessing.vignette.darkness,
              blendFunction: BlendFunction.NORMAL
            });
            effects.push(vignetteEffect);
          }

          if (activeEffects.lut) {
            const lutEffect = new LUT3DEffect(new THREE.Data3DTexture(), {
              blendFunction: BlendFunction.SET
            });
            lutEffect.setSize($size.width, $size.height);

            if (!lut) return;
            lutEffect.lut.dispose();
            lutEffect.lut = lut;

            effects.push(lutEffect);
          }

          // Add final tonemapping pass
          const toneMappingEffect = new ToneMappingEffect({
            mode:
              postProcessing.enabled && postProcessing.toneMapping.enabled
                ? postProcessing.toneMapping.mode
                : ToneMappingMode.LINEAR
          });
          effects.push(toneMappingEffect);

          const effectPass = new EffectPass($camera, ...effects);
          composer.addPass(effectPass);
        }
      })
      .catch((error) => console.error(error));
  });

  $effect(() => {
    const renderSize = new THREE.Vector2();
    renderer.getSize(renderSize);

    // Only update render/composer size if it doesn't match the canvas size
    // This check must be done here; it does not work when placed in $effect
    if (
      renderSize.width !== $size.width ||
      renderSize.height !== $size.height ||
      composer.outputBuffer.width !== $size.width ||
      composer.outputBuffer.height !== $size.height
    ) {
      needsResize = true;
    }
  });

  // Check if any post-processing effects are active
  const hasActiveEffects = $derived(() => {
    if (PERFORMANCE_TIER_SETTINGS[props.performanceTier ?? 'high'].forcePostProcessingOff) return false;
    const pp = props.postProcessing;
    if (!pp.enabled) return false;
    const activeEffects = getActiveEffects(pp);
    return activeEffects.bloom || activeEffects.chromaticAberration || activeEffects.vignette || activeEffects.lut;
  });

  // Custom render task
  useTask(
    (dt) => {
      if (!scene || !renderer || !camera) return;

      const enableMetrics = debugState.enableMetrics;
      const frameStart = enableMetrics ? beginFrame() : 0;

      if (needsResize) {
        needsResize = false;
        renderer.setSize($size.width, $size.height);
        composer.setSize($size.width, $size.height);
        if (props.scene.autoFit) {
          fit();
        }
      }

      renderer.clear();

      // Render main scene with post-processing (or bypass if no effects active)
      camera.current.layers.set(SceneLayer.Main);

      let composerTime = 0;
      if (hasActiveEffects()) {
        const composerStart = enableMetrics ? startTiming() : 0;
        composer.render(dt);
        composerTime = enableMetrics ? endTiming(composerStart) : 0;
      } else {
        const composerStart = enableMetrics ? startTiming() : 0;
        renderer.render(scene, camera.current);
        composerTime = enableMetrics ? endTiming(composerStart) : 0;
      }

      // Render overlays (grid/ping) without post-processing
      camera.current.layers.set(SceneLayer.Overlay);

      const overlayStart = enableMetrics ? startTiming() : 0;
      renderer.render(scene, camera.current);
      const overlayTime = enableMetrics ? endTiming(overlayStart) : 0;

      // Reset camera back to main layer
      camera.current.layers.set(SceneLayer.Main);

      // Update metrics if enabled
      if (enableMetrics) {
        endFrame(frameStart, renderer, { composerTime, overlayTime });

        if (debugState.logMetricsToConsole) {
          logMetrics(props.debug.loggingRate);
        }
      }

      // If scene was resized, need to wait for prop update to finish
      if (loadingState === SceneLoadingState.Resizing) {
        setLoadingState(SceneLoadingState.Rendering);
      } else if (loadingState === SceneLoadingState.Rendering) {
        setLoadingState(SceneLoadingState.Initialized);
      }
    },
    { stage: renderStage }
  );

  function setLoadingState(state: SceneLoadingState) {
    loadingState = state;
    if (state === SceneLoadingState.Initialized) {
      callbacks.onStageInitialized();
    }
  }

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

  // In MapDefined mode the DM's "fit" frames the whole map plus the TV
  // viewport rectangle instead of just the display bounds
  function fitToMap() {
    if (!mapSize) return;

    // Bounds of the map rect (cardinal rotations swap its extents) union the
    // TV rect (display bounds at the scene origin), in scene units
    const swapped = Math.abs(Math.round(props.map.rotation / 90)) % 2 === 1;
    const mapWidth = (swapped ? mapSize.height : mapSize.width) * props.map.zoom;
    const mapHeight = (swapped ? mapSize.width : mapSize.height) * props.map.zoom;

    const minX = Math.min(props.map.offset.x - mapWidth / 2, -props.display.resolution.x / 2);
    const maxX = Math.max(props.map.offset.x + mapWidth / 2, props.display.resolution.x / 2);
    const minY = Math.min(props.map.offset.y - mapHeight / 2, -props.display.resolution.y / 2);
    const maxY = Math.max(props.map.offset.y + mapHeight / 2, props.display.resolution.y / 2);

    let boundsWidth = maxX - minX;
    let boundsHeight = maxY - minY;
    if (props.scene.rotation === 90 || props.scene.rotation === 270) {
      [boundsWidth, boundsHeight] = [boundsHeight, boundsWidth];
    }

    const margin = 0.95;
    const newZoom = Math.min(($size.width / boundsWidth) * margin, ($size.height / boundsHeight) * margin);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    onSceneUpdate({ x: -centerX * newZoom, y: -centerY * newZoom }, newZoom);
  }

  export function fit() {
    if (props.mode === StageMode.DM && isMapDefined) {
      fitToMap();
      return;
    }

    const canvasAspectRatio = $size.width / $size.height;
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
      newZoom = $size.height / sceneHeight;
    } else {
      newZoom = $size.width / sceneWidth;
    }

    onSceneUpdate({ x: 0, y: 0 }, newZoom);
  }

  export async function generateThumbnail(quality: number = 0.5): Promise<Blob> {
    const texture = mapLayer.getCompositeMapTexture();

    if (!texture) return new Blob();

    // Store original scene state
    const originalScene = scene;
    const originalCamera = camera.current;
    const originalSize = $size;

    const displayWidth = props.display.resolution.x;
    const displayHeight = props.display.resolution.y;

    // Handle both image and video textures
    let imageWidth: number;
    let imageHeight: number;

    const textureImage = texture.image as HTMLVideoElement | HTMLImageElement;
    if (textureImage instanceof HTMLVideoElement) {
      // For video textures, use videoWidth and videoHeight
      imageWidth = textureImage.videoWidth || displayWidth;
      imageHeight = textureImage.videoHeight || displayHeight;
    } else {
      // For image textures, use width and height
      imageWidth = textureImage.width;
      imageHeight = textureImage.height;
    }

    // Create a temporary scene and camera for rendering
    const tempScene = new THREE.Scene();
    const tempCamera = new THREE.OrthographicCamera(
      -displayWidth / 2,
      displayWidth / 2,
      displayHeight / 2,
      -displayHeight / 2,
      0.1,
      1000
    );
    tempCamera.position.z = 100;

    // Create a quad to render the texture
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ map: texture.clone() });
    const quad = new THREE.Mesh(geometry, material);
    quad.position.set(props.map.offset.x, props.map.offset.y, 0);
    quad.rotation.z = (props.map.rotation / 180.0) * Math.PI;
    quad.scale.set(imageWidth * props.map.zoom, imageHeight * props.map.zoom, 1);
    tempScene.add(quad);

    // Temporarily replace scene and camera
    composer.setMainScene(tempScene);
    composer.setMainCamera(tempCamera);
    renderer.setSize(displayWidth, displayHeight);
    composer.setSize(displayWidth, displayHeight);

    // Temporarily disable clipping planes
    renderer.clippingPlanes = [];

    // Render to the offscreen canvas
    composer.render();

    const offscreenCanvas = new OffscreenCanvas(displayWidth, displayHeight);
    const context = offscreenCanvas.getContext('2d');
    context?.drawImage(renderer.domElement, 0, 0, displayWidth, displayHeight);

    // Restore original state
    composer.setMainScene(originalScene);
    composer.setMainCamera(originalCamera);
    renderer.setSize(originalSize.width, originalSize.height);
    composer.setSize(originalSize.width, originalSize.height);
    renderer.clippingPlanes = clippingPlaneStore.value;

    // Clean up
    geometry.dispose();
    material.dispose();

    return offscreenCanvas.convertToBlob({ type: 'image/jpeg', quality });
  }

  export const annotations = {
    clear: (layerId: string) => annotationsLayer.clear(layerId),
    toRLE: () => annotationsLayer?.toRLE(),
    fromRLE: (rleData: Uint8Array, width: number, height: number) => annotationsLayer?.fromRLE(rleData, width, height),
    loadMask: (layerId: string, rleData: Uint8Array) => annotationsLayer?.loadMask(layerId, rleData),
    isDrawing: () => annotationsLayer?.isDrawing() ?? false
  };

  export const map = {
    fill: () => mapLayer.fill(),
    fit: () => mapLayer.fit(),
    getSize: () => mapLayer?.mapSize ?? null
  };

  // References to the layer doesn't exist until the component is mounted,
  // so we need create these wrapper functions
  export const fogOfWar = {
    clear: () => mapLayer.fogOfWar.clear(),
    reset: () => mapLayer.fogOfWar.reset(),
    toPng: () => mapLayer.fogOfWar.toPng(),
    toRLE: () => mapLayer.fogOfWar.toRLE(),
    fromRLE: (rleData: Uint8Array, width: number, height: number) => mapLayer.fogOfWar.fromRLE(rleData, width, height),
    isDrawing: () => mapLayer?.fogOfWar?.isDrawing() ?? false
  };

  // Export marker state getters
  export const markers = {
    get isHoveringMarker() {
      return markerLayer?.markerState?.isHovering ?? false;
    },
    get isDraggingMarker() {
      return markerLayer?.markerState?.isDragging ?? false;
    },
    get hoveredMarker() {
      return markerLayer?.markerState?.hoveredMarker ?? null;
    },
    get selectedMarker() {
      return markerLayer?.markerState?.selectedMarker ?? null;
    },
    get tooltipSuppressed() {
      return markerLayer?.markerState?.tooltipSuppressed ?? false;
    },
    maintainHover: (maintain: boolean) => {
      markerLayer?.maintainHover?.(maintain);
    },
    onSceneChange: () => {
      markerLayer?.onSceneChange?.();
    }
  };

  // Export light state getters
  export const lights = {
    get isHoveringLight() {
      return lightLayer?.lightState?.isHovering ?? false;
    },
    get isDraggingLight() {
      return lightLayer?.lightState?.isDragging ?? false;
    },
    get hoveredLight() {
      return lightLayer?.lightState?.hoveredLight ?? null;
    },
    get selectedLight() {
      return lightLayer?.lightState?.selectedLight ?? null;
    },
    onSceneChange: () => {
      lightLayer?.onSceneChange?.();
    }
  };

  // Export measurement layer methods
  export const measurement = {
    getCurrentMeasurement: () => measurementLayer?.getCurrentMeasurement?.() ?? null,
    isDrawing: () => measurementLayer?.isCurrentlyDrawing?.() ?? false
  };

  export function getMarkerSizeInScreenSpace(markerSize = 1) {
    // In MapDefined mode the cell size is in map pixels; localScale converts
    // it back to display pixels (identity in FillSpace)
    const worldGridSize = getGridCellSizeHelper(props.grid, anchoredDisplay) * localScale;
    const worldMarkerDiameter = worldGridSize * markerSize * 0.9;
    const zoomedMarkerDiameter = worldMarkerDiameter * props.scene.zoom;
    const screenMarkerDiameter = (zoomedMarkerDiameter / props.display.resolution.x) * $size.width;

    return screenMarkerDiameter;
  }

  export function getMarkerScreenPosition(marker: { position?: { x: number; y: number } }) {
    if (!marker?.position) return null;

    // In MapDefined mode marker positions are center-relative map pixels;
    // apply the map transform to get display-space coordinates first
    const displayPosition = isMapDefined ? mapToDisplaySpace(marker.position, props.map) : marker.position;

    // Create a vector at the marker's local position
    const vector = new THREE.Vector3(displayPosition.x, displayPosition.y, 0);

    // Apply scene transformations to get world position
    // The markers are rendered inside a T.Object3D with position and scale transforms
    vector.x = vector.x * props.scene.zoom + props.scene.offset.x;
    vector.y = vector.y * props.scene.zoom + props.scene.offset.y;

    // Project world position to screen space
    vector.project(camera.current);

    // Convert from normalized device coordinates (-1 to 1) to screen coordinates
    const x = (vector.x * 0.5 + 0.5) * $size.width;
    const y = (-vector.y * 0.5 + 0.5) * $size.height;

    return { x, y };
  }
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
  <!-- Layers that anchor to the map in MapDefined mode (mounted inside
       mapAnchor) and to the display in FillSpace mode (mounted at scene
       level). In map space all coordinates are center-relative map pixels. -->
  {#snippet anchoredLayers()}
    <GridLayer
      grid={props.grid}
      display={anchoredDisplay}
      sceneZoom={props.scene.zoom}
      {localScale}
      layers={[SceneLayer.Overlay]}
      renderOrder={SceneLayerOrder.Grid}
    />

    <AnnotationLayer
      bind:this={annotationsLayer}
      props={props.annotations}
      mode={props.mode}
      isActive={props.activeLayer === MapLayerType.Annotation}
      sceneZoom={props.scene.zoom}
      display={anchoredDisplay}
      grid={props.grid}
      {localScale}
      conversion={isMapDefined ? { realDisplay: props.display, map: props.map } : undefined}
    />

    <LightLayer
      bind:this={lightLayer}
      {props}
      isActive={props.activeLayer === MapLayerType.Light}
      grid={props.grid}
      display={anchoredDisplay}
      {localScale}
    />

    <MarkerLayer
      bind:this={markerLayer}
      {props}
      isActive={props.activeLayer === MapLayerType.Marker || props.activeLayer === MapLayerType.None}
      grid={props.grid}
      display={anchoredDisplay}
      {localScale}
      mapRotation={isMapDefined ? props.map.rotation : 0}
    />

    {#if props.measurement}
      <MeasurementLayer
        bind:this={measurementLayer}
        props={props.measurement}
        isActive={props.activeLayer === MapLayerType.Measurement}
        display={anchoredDisplay}
        realDisplay={props.display}
        grid={props.grid}
        sceneRotation={props.scene.rotation}
        {localScale}
        mapRotation={isMapDefined ? props.map.rotation : 0}
        onMeasurementStart={callbacks.onMeasurementStart}
        onMeasurementUpdate={callbacks.onMeasurementUpdate}
        onMeasurementEnd={callbacks.onMeasurementEnd}
        {receivedMeasurement}
      />
    {:else}
      <!-- MeasurementLayer skipped: props.measurement is undefined -->
    {/if}
  {/snippet}

  <!-- The map anchor carries the uniform map transform; MapLayer's inner node
       only scales the unit plane to the map image size, so map, fog, and (in
       MapDefined mode) the anchored layers share one transform and can never
       drift apart -->
  <T.Object3D
    name="mapAnchor"
    position={[props.map.offset.x, props.map.offset.y, 0]}
    rotation.z={(props.map.rotation / 180.0) * Math.PI}
    scale={[props.map.zoom, props.map.zoom, 1]}
  >
    <MapLayer
      bind:this={mapLayer}
      {props}
      onMapLoading={() => {
        callbacks.onStageLoading();
        setLoadingState(SceneLoadingState.LoadingMap);
      }}
      onMapLoaded={(_mapUrl, size) => {
        mapSize = size;
        needsResize = true;
        if (loadingState === SceneLoadingState.LoadingMap) {
          setLoadingState(SceneLoadingState.Resizing);
        }
      }}
    />

    {#if isMapDefined}
      {@render anchoredLayers()}
    {/if}
  </T.Object3D>

  <WeatherLayer
    {props}
    size={props.display.resolution}
    layers={[SceneLayer.Main]}
    renderOrder={SceneLayerOrder.Weather}
  />

  <EdgeOverlayLayer
    props={props.edgeOverlay}
    display={props.display}
    visible={props.edgeOverlay.enabled}
    layers={[SceneLayer.Overlay]}
    renderOrder={SceneLayerOrder.EdgeOverlay}
  />

  {#if !isMapDefined}
    {@render anchoredLayers()}
  {/if}

  <!-- DM-only TV viewport rectangle: shows the playfield-visible region and
       dims everything outside it (the display-rect clipping is disabled in
       this mode so the DM can see the whole map) -->
  {#if props.mode === StageMode.DM && isMapDefined}
    <TvViewportLayer
      display={props.display}
      sceneZoom={props.scene.zoom}
      sceneRotation={props.scene.rotation}
      map={props.map}
      {mapSize}
    />
  {/if}

  <!-- Cursor Layer for rendering remote cursors -->
  <CursorLayer
    props={{
      cursors: cursors,
      showLabels: true,
      fadeOutDelay: 5000,
      fadeOutDuration: 500,
      gridSpacing: props.grid.spacing,
      displaySize: props.display.size,
      displayResolution: props.display.resolution,
      sceneZoom: props.scene.zoom
    }}
  />
</T.Object3D>
