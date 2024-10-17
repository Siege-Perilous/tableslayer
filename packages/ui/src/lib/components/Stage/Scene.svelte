<script lang="ts">
  import * as THREE from 'three';
  import { onMount } from 'svelte';
  import { T, useThrelte, useTask } from '@threlte/core';
  import { EffectComposer, RenderPass } from 'postprocessing';
  import type { StageProps } from './types';
  import MapLayer from './layers/Map/MapLayer.svelte';
  import GridLayer from './layers/Grid/GridLayer.svelte';

  let { props }: { props: StageProps } = $props();

  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

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

<MapLayer mapProps={props.map} fogOfWarProps={props.fogOfWar} containerSize={$size} />
<GridLayer props={props.grid} {composer} />
