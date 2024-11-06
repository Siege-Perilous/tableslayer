<script lang="ts">
  import * as THREE from 'three';
  import { onDestroy, onMount } from 'svelte';
  import { type Size, T, useThrelte, useTask } from '@threlte/core';
  import { EffectComposer, RenderPass } from 'postprocessing';
  import type { StageProps } from '../Stage/types';
  import type { StageFunctions } from '../Stage/types';
  import { ScaleMode } from './types';
  import FogOfWarLayer from '../FogOfWarLayer/FogOfWarLayer.svelte';
  import MapLayer from '../MapLayer/MapLayer.svelte';
  import GridLayer from '../GridLayer/GridLayer.svelte';
  import WeatherLayer from '../WeatherLayer/WeatherLayer.svelte';
  import { getImageScale } from '../../helpers/utils';
  import { MapLayerType } from '../MapLayer/types';

  interface Props {
    props: StageProps;
    functions: StageFunctions;
    onpan: (dx: number, dy: number) => void;
    onzoom: (dx: number) => void;
    onrotate: (dx: number) => void;
  }

  let { props, functions, onpan, onzoom, onrotate }: Props = $props();

  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  let mapSize: Size = $state({ width: 0, height: 0 });
  let mouseDown = false;

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene);
  composer.addPass(renderPass);

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
    mouseDown = true;
  }

  function onMouseUp(e: MouseEvent) {
    mouseDown = false;
  }

  function onMouseLeave(e: MouseEvent) {
    mouseDown = false;
  }

  function onMouseMove(e: MouseEvent) {
    // Only allow movement if no map layers are currently being edited
    if (mouseDown && props.scene.activeLayer === MapLayerType.None) {
      onpan(e.movementX, e.movementY);
    }
  }

  function onWheel(e: WheelEvent) {
    onzoom(-e.deltaY * props.scene.zoomSensitivity);
  }

  $effect(() => {
    renderPass.mainCamera = $camera;
    composer.setSize($size.width, $size.height);
    renderer.setClearColor(new THREE.Color(props.backgroundColor));
  });

  useTask(
    (dt) => {
      if (!scene || !renderer) return;
      composer.render(dt);
    },
    { stage: renderStage }
  );
</script>

<T.OrthographicCamera makeDefault near={0.1} far={10}></T.OrthographicCamera>

<T.Object3D
  position={props.scene.scaleMode === ScaleMode.Custom ? [props.scene.offset.x, -props.scene.offset.y, -5] : [0, 0, -5]}
  rotation.z={(props.scene.rotation / 180.0) * Math.PI}
  scale={getImageScale(mapSize, $size, props.scene.scaleMode, props.scene.zoom)}
>
  <WeatherLayer props={props.weather} {composer} />
  <GridLayer props={props.grid} {composer} />
  <FogOfWarLayer activeLayer={props.scene.activeLayer} props={props.fogOfWar} {mapSize} {functions} />
  <MapLayer props={props.map} onmaploaded={(size: Size) => (mapSize = size)} />
</T.Object3D>
