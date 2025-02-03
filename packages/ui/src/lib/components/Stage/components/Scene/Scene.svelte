<script lang="ts">
  import { getContext, onMount, untrack } from 'svelte';
  import { T, useThrelte, useTask } from '@threlte/core';
  import { EffectComposer, EffectPass, RenderPass, VignetteEffect } from 'postprocessing';
  import { type Callbacks, type StageProps } from '../Stage/types';
  import MapLayer from '../MapLayer/MapLayer.svelte';
  import GridLayer from '../GridLayer/GridLayer.svelte';
  import { type MapLayerExports } from '../MapLayer/types';
  import { clippingPlaneStore, updateClippingPlanes } from '../../helpers/clippingPlaneStore.svelte';

  interface Props {
    props: StageProps;
  }

  let { props }: Props = $props();

  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  const onSceneUpdate = getContext<Callbacks>('callbacks').onSceneUpdate;

  let mapLayer: MapLayerExports;

  // TODO: Add post-processing effects
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene);
  composer.addPass(renderPass);
  composer.addPass(new EffectPass($camera, new VignetteEffect({ offset: 0.2 })));

  onMount(() => {
    let before = autoRender.current;
    autoRender.set(false);
    fit();
    return () => {
      autoRender.set(before);
    };
  });

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

  $effect(() => {
    renderPass.mainCamera = $camera;
    composer.setSize($size.width, $size.height);
  });

  // Whenever the scene or display properties change, update the clipping planes
  $effect(() => {
    updateClippingPlanes(props.scene, props.display);
    untrack(() => (renderer.clippingPlanes = clippingPlaneStore.value));
  });

  useTask(
    (dt) => {
      if (!scene || !renderer) return;
      composer.render(dt);
    },
    { stage: renderStage }
  );

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
  <GridLayer grid={props.grid} display={props.display} sceneZoom={props.scene.zoom} />
</T.Object3D>
