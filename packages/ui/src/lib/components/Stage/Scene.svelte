<script lang="ts">
  import * as THREE from 'three';
  import { onMount } from 'svelte';
  import { T, useThrelte, useTask } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import { EffectComposer, RenderPass } from 'postprocessing';
  import type { StageProps } from './types';
  import MapLayer from './layers/Map/MapLayer.svelte';
  import GridLayer from './layers/Grid/GridLayer.svelte';

  let props: StageProps = $props();

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

  // Camera updated
  $effect(() => {
    renderPass.mainCamera = $camera;
  });

  // Screen size updated
  $effect(() => {
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

<T.OrthographicCamera makeDefault zoom={0.2} near={0.1} far={10} position={[0, 0, 1]}>
  <OrbitControls
    enableRotate={false}
    mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
  />
</T.OrthographicCamera>

<MapLayer props={props.map} />
<GridLayer props={props.grid} {composer} />
