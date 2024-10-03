<script lang="ts">
  import * as THREE from 'three';
  import { onMount } from 'svelte';
  import { T, useThrelte, useTask } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import { EffectComposer, EffectPass, RenderPass } from 'postprocessing';
  import { GridEffect } from './layers/Grid/GridEffect';
  import type { StageProps } from './types';
  import MapLayer from './layers/Map/MapLayer.svelte';

  let props: StageProps = $props();

  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  const composer = new EffectComposer(renderer);

  const gridEffect = new GridEffect(props.grid);

  onMount(() => {
    console.log('mounting Scene');
    let before = autoRender.current;
    autoRender.set(false);
    return () => {
      autoRender.set(before);
    };
  });

  // Camera updated
  $effect(() => {
    console.log('update composer');
    composer.removeAllPasses();
    composer.addPass(new RenderPass(scene, $camera));
    composer.addPass(new EffectPass($camera, gridEffect));
  });

  // Props changing
  $effect(() => {
    console.log('update grid props');
    gridEffect.updateProps(props.grid);
  });

  // Screen size updated
  $effect(() => {
    console.log('update screen size');
    composer.setSize($size.width, $size.height);
    renderer.setClearColor(new THREE.Color(props.backgroundColor));
    gridEffect.resolution = new THREE.Vector2($size.width, $size.height);
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

<MapLayer {...props.map} />
