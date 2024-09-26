<script lang="ts">
  import * as THREE from 'three';
  import { onMount } from 'svelte';
  import { T, useThrelte, useTask } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import { GridMaterial } from './layers/Grid/GridMaterial';
  import { ImageMaterial } from './layers/Image/ImageMaterial';
  import { useLoader } from '@threlte/core';
  import { TextureLoader } from 'three';
  import backgroundImageUrl from './images/sword_coast.jpg';
  import type { StageProps } from './types';

  const DEFAULT_IMAGE_WIDTH = 1920;
  const DEFAULT_IMAGE_HEIGHT = 1080;

  const loader = useLoader(TextureLoader);
  const { scene, renderer, camera, size, autoRender, renderStage } = useThrelte();

  let props: StageProps = $props();

  let backgroundImage = loader.load(backgroundImageUrl, {
    transform: (texture) => {
      return texture;
    }
  });

  let quad: THREE.Mesh | undefined = $state(undefined);

  let renderCamera = new THREE.OrthographicCamera();

  let renderTarget1 = new THREE.WebGLRenderTarget(400, 400, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType
  });

  let renderTarget2 = new THREE.WebGLRenderTarget(400, 400, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType
  });

  let backgroundMaterial = new ImageMaterial();

  let gridMaterial = new GridMaterial(props.grid, renderTarget1.texture);
  gridMaterial.transparent = true;

  onMount(() => {
    let before = autoRender.current;
    autoRender.set(false);
    return () => {
      autoRender.set(before);
    };
  });

  $effect(() => {
    if (quad && $backgroundImage) {
      // Update the quad and render target sizes to match the image size
      const width = $backgroundImage.source.data.width ?? DEFAULT_IMAGE_WIDTH;
      const height = $backgroundImage.source.data.height ?? DEFAULT_IMAGE_HEIGHT;

      renderCamera.left = -width / 2;
      renderCamera.right = width / 2;
      renderCamera.top = height / 2;
      renderCamera.bottom = -height / 2;
      renderCamera.updateProjectionMatrix();

      quad.scale.set(width, height, 0);
      renderTarget1.setSize(width, height);
      renderTarget2.setSize(width, height);

      // Once the image is loaded, apply it to the background material
      backgroundMaterial.uniforms['tDiffuse'].value = $backgroundImage;

      renderer.setSize(width, height);

      // Render background layer
      quad.material = backgroundMaterial;
      renderer.setRenderTarget(renderTarget1);
      renderer.render(scene, renderCamera);

      // Render grid layer
      gridMaterial.uniforms['targetSize'].value = new THREE.Vector2(width, height);
      quad.material = gridMaterial;
      renderer.setRenderTarget(renderTarget2);
      renderer.render(scene, renderCamera);

      // Reset the renderer back to its normal settings
      renderer.setSize($size.width, $size.height);
      renderer.setRenderTarget(null);
    }
  });

  $effect(() => {});

  useTask(
    () => {
      if (!scene || !renderer) return;
      renderer.render(scene, $camera);
    },
    { stage: renderStage }
  );
</script>

<T.OrthographicCamera makeDefault zoom={0.2}>
  <OrbitControls
    enableRotate={false}
    mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
  />
</T.OrthographicCamera>

<T.Mesh bind:ref={quad} position={[0, 0, -1]}>
  <T.PlaneGeometry />
</T.Mesh>
