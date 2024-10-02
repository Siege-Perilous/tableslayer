<script lang="ts">
  import * as THREE from 'three';
  import { onMount } from 'svelte';
  import { T, useThrelte, useTask } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import { EffectComposer, EffectPass, RenderPass } from 'postprocessing';
  import { GridEffect } from './layers/Grid/GridEffect';
  import { ImageMaterial } from './layers/Image/ImageMaterial';
  import { useLoader } from '@threlte/core';
  import { TextureLoader } from 'three';
  import backgroundImageUrl from './images/sword_coast.jpg';
  import type { StageProps } from './types';

  let props: StageProps = $props();

  const DEFAULT_IMAGE_WIDTH = 1920;
  const DEFAULT_IMAGE_HEIGHT = 1080;

  const loader = useLoader(TextureLoader);
  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  const composer = new EffectComposer(renderer);

  const gridEffect = new GridEffect(props.grid);

  let mapImage = loader.load(backgroundImageUrl, {
    transform: (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }
  });

  let mapMaterial = new ImageMaterial();
  let mapQuad = new THREE.Mesh(new THREE.PlaneGeometry(), mapMaterial);
  mapQuad.position.set(0, 0, -1);
  scene.add(mapQuad);

  onMount(() => {
    let before = autoRender.current;
    autoRender.set(false);
    return () => {
      autoRender.set(before);
    };
  });

  // Camera updated
  $effect(() => {
    composer.removeAllPasses();
    composer.addPass(new RenderPass(scene, $camera));
    composer.addPass(new EffectPass($camera, gridEffect));
  });

  // Props changing
  $effect(() => {
    gridEffect.updateProps(props.grid);
  });

  // Background image changed
  $effect(() => {
    if ($mapImage) {
      // Update the quad and render target sizes to match the image size
      const bgWidth = $mapImage.source.data.width ?? DEFAULT_IMAGE_WIDTH;
      const bgHeight = $mapImage.source.data.height ?? DEFAULT_IMAGE_HEIGHT;
      mapQuad.scale.set(bgWidth, bgHeight, 0);
      mapMaterial.uniforms['tDiffuse'].value = $mapImage;
    }
  });

  // Screen size updated
  $effect(() => {
    composer.setSize($size.width, $size.height);
    renderer.setClearColor(new THREE.Color(props.background.color));
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
