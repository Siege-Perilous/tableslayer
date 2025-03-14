<script lang="ts">
  import * as THREE from 'three';
  import { getContext, onMount, untrack } from 'svelte';
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
  import { type Callbacks, type StageProps } from '../Stage/types';
  import MapLayer from '../MapLayer/MapLayer.svelte';
  import GridLayer from '../GridLayer/GridLayer.svelte';
  import { MapLayerType, type MapLayerExports } from '../MapLayer/types';
  import { clippingPlaneStore, updateClippingPlanes } from '../../helpers/clippingPlaneStore.svelte';
  import { SceneLayer, SceneLayerOrder } from './types';
  import EdgeOverlayLayer from '../EdgeOverlayLayer/EdgeOverlayLayer.svelte';
  import MarkerLayer from '../MarkerLayer/MarkerLayer.svelte';

  interface Props {
    props: StageProps;
  }

  let { props }: Props = $props();

  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  const onSceneUpdate = getContext<Callbacks>('callbacks').onSceneUpdate;
  let mapLayer: MapLayerExports;

  const composer = new EffectComposer(renderer);

  onMount(() => {
    let before = autoRender.current;
    autoRender.set(false);
    fit();
    return () => {
      autoRender.set(before);
    };
  });

  // Setup camera and renderer in effect
  $effect(() => {
    if (!camera || !renderer) return;

    // Configure camera to see both layers
    $camera.layers.disableAll();
    $camera.layers.enable(SceneLayer.Main);
    $camera.layers.enable(SceneLayer.Overlay);

    // Configure renderer
    renderer.setClearColor(0, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize($size.width, $size.height);
    composer.setSize($size.width, $size.height);
  });

  // Effect to update post-processing settings when props change
  $effect(() => {
    const postProcessing = $state.snapshot(props.postProcessing);

    // Need to convert the LUT to a LookupTexture
    Promise.resolve(getLUT(postProcessing.lut.url))
      .then((lut) => {
        composer.removeAllPasses();

        const effects = [];

        const renderPass = new RenderPass(scene, $camera);
        composer.addPass(renderPass);

        if (postProcessing.enabled) {
          if (postProcessing.bloom.enabled) {
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

          if (postProcessing.chromaticAberration.enabled) {
            const chromaticAberrationEffect = new ChromaticAberrationEffect({
              offset: new THREE.Vector2(postProcessing.chromaticAberration.offset),
              radialModulation: true,
              modulationOffset: 0.025
            });
            effects.push(chromaticAberrationEffect);
          }

          if (postProcessing.vignette.enabled) {
            const vignetteEffect = new VignetteEffect({
              offset: postProcessing.vignette.offset,
              darkness: postProcessing.vignette.darkness,
              blendFunction: BlendFunction.NORMAL
            });
            effects.push(vignetteEffect);
          }

          if (postProcessing.lut.enabled && postProcessing.lut.url !== null) {
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

  // Whenever the scene or display properties change, update the clipping planes
  $effect(() => {
    updateClippingPlanes(props.scene, props.display);
    untrack(() => (renderer.clippingPlanes = clippingPlaneStore.value));
  });

  // Custom render task
  useTask(
    (dt) => {
      if (!scene || !renderer || !camera) return;

      // Reset renderer size to match the canvas size (has no effect if already set)
      renderer.setSize($size.width, $size.height);

      // Render main scene with post-processing
      camera.current.layers.set(SceneLayer.Main);
      composer.render(dt);

      // Render overlays (grid/ping)without post-processing
      camera.current.layers.set(SceneLayer.Overlay);

      renderer.autoClear = false;
      renderer.render(scene, camera.current);
      renderer.autoClear = true;

      // Reset camera back to main layer
      camera.current.layers.set(SceneLayer.Main);
    },
    { stage: renderStage }
  );

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

  export function fit() {
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
    if (sceneAspectRatio < canvasAspectRatio) {
      newZoom = renderer.domElement.clientHeight / sceneHeight;
    } else {
      newZoom = renderer.domElement.clientWidth / sceneWidth;
    }

    onSceneUpdate({ x: 0, y: 0 }, newZoom);
  }

  export const map = {
    fill: () => mapLayer.fill(),
    fit: () => mapLayer.fit()
  };

  // References to the layer doesn't exist until the component is mounted,
  // so we need create these wrapper functions
  export const fogOfWar = {
    clear: () => mapLayer.fogOfWar.clear(),
    reset: () => mapLayer.fogOfWar.reset(),
    toPng: () => mapLayer.fogOfWar.toPng()
  };
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
  <MapLayer bind:this={mapLayer} {props} />

  <!-- Map overlays that scale with the scene -->
  <GridLayer
    grid={props.grid}
    display={props.display}
    sceneZoom={props.scene.zoom}
    layers={[SceneLayer.Overlay]}
    renderOrder={SceneLayerOrder.Grid}
  />

  <EdgeOverlayLayer
    props={props.edgeOverlay}
    display={props.display}
    visible={props.edgeOverlay.enabled}
    renderOrder={SceneLayerOrder.EdgeOverlay}
  />

  <MarkerLayer
    {props}
    isActive={props.activeLayer === MapLayerType.Marker || props.activeLayer === MapLayerType.None}
    grid={props.grid}
    display={props.display}
  />
</T.Object3D>
