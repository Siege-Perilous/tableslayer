<script lang="ts">
  import * as THREE from 'three';
  import { onMount } from 'svelte';
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

  interface Props {
    props: StageProps;
    functions: StageFunctions;
  }

  let { props, functions }: Props = $props();

  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  let imageSize: Size = $state({ width: 0, height: 0 });
  let scale = $state(new THREE.Vector3(1, 1, 1));

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene);
  composer.addPass(renderPass);

  onMount(() => {
    let before = autoRender.current;
    autoRender.set(false);
    return () => {
      autoRender.set(before);
    };
  });

  function onImageLoaded(size: Size) {
    imageSize = size;
  }

  $effect(() => {
    renderPass.mainCamera = $camera;
    composer.setSize($size.width, $size.height);
    renderer.setClearColor(new THREE.Color(props.backgroundColor));
  });

  $effect(() => {
    scale = getImageScale(imageSize, $size, props.scene.scaleMode, props.scene.customScale);
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
  scale={[scale.x, scale.y, scale.z]}
>
  <WeatherLayer props={props.weather} {composer} />
  <GridLayer props={props.grid} {composer} />
  <FogOfWarLayer props={props.fogOfWar} {functions} {imageSize} />
  <MapLayer props={props.map} onimageloaded={onImageLoaded} />
</T.Object3D>
