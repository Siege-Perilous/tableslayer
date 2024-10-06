<script lang="ts">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
  import { onMount } from 'svelte';
  import { T, useThrelte, useTask } from '@threlte/core';
  import { OrbitControls as ThrelteOrbitControls } from '@threlte/extras';
  import { EffectComposer, RenderPass } from 'postprocessing';
  import type { SceneProps } from './types';
  import MapLayer from './layers/Map/MapLayer.svelte';
  import GridLayer from './layers/Grid/GridLayer.svelte';

  let { stageProps, onCameraUpdate }: SceneProps = $props();

  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  // Initialize camera position/zoom to the value passed down via the props
  let cameraZoom = $state(stageProps.camera.zoom);
  let cameraPosition = $state(stageProps.camera.position);

  let controls: OrbitControls | undefined = $state();
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene);
  composer.addPass(renderPass);

  onMount(() => {
    let before = autoRender.current;
    autoRender.set(false);

    if (controls) {
      controls.addEventListener('change', (e) => {
        const orthoCamera = camera.current as THREE.OrthographicCamera;
        onCameraUpdate({ zoom: orthoCamera.zoom, position: orthoCamera.position });
      });
    }

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
    renderer.setClearColor(new THREE.Color(stageProps.backgroundColor));
  });

  useTask(
    (dt) => {
      if (!scene || !renderer) return;
      composer.render(dt);
    },
    { stage: renderStage }
  );
</script>

<T.OrthographicCamera
  makeDefault
  zoom={cameraZoom}
  near={0.1}
  far={10}
  position={[cameraPosition.x, cameraPosition.y, cameraPosition.z]}
>
  <ThrelteOrbitControls
    bind:ref={controls}
    enableRotate={false}
    mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
  />
</T.OrthographicCamera>

<MapLayer props={stageProps.map} />
<GridLayer props={stageProps.grid} {composer} />
