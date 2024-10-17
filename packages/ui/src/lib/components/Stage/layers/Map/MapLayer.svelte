<script lang="ts">
  import * as THREE from 'three';
  import { T, type Size } from '@threlte/core';
  import { ImageMaterial } from '../../materials/ImageMaterial';
  import { useLoader } from '@threlte/core';
  import { TextureLoader } from 'three';
  import backgroundImageUrl from './sword_coast.jpg';
  import { ScaleMode, type MapProps } from './types';
  import { getImageScale } from './MapHelpers';
  import FogOfWar from '../FogOfWar/FogOfWar.svelte';
  import type { FogOfWarProps } from '../FogOfWar/types';

  let {
    mapProps,
    fogOfWarProps,
    containerSize
  }: { mapProps: MapProps; fogOfWarProps: FogOfWarProps; containerSize: Size } = $props();

  const DEFAULT_IMAGE_WIDTH = 1920;
  const DEFAULT_IMAGE_HEIGHT = 1080;

  const loader = useLoader(TextureLoader);

  let mapQuad = $state(new THREE.Mesh());
  let imageSize = $state({ width: 0, height: 0 });

  let scale = $state(new THREE.Vector3());

  let mapImage = loader.load(backgroundImageUrl, {
    transform: (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }
  });

  $effect(() => {
    // Is the map image loaded yet?
    if ($mapImage) {
      imageSize = {
        width: $mapImage.source.data.width ?? DEFAULT_IMAGE_WIDTH,
        height: $mapImage.source.data.height ?? DEFAULT_IMAGE_HEIGHT
      };

      // Update the map quad shader to use the uploaded image
      let mapMaterial = new ImageMaterial();
      mapMaterial.uniforms['tDiffuse'].value = $mapImage;
      mapQuad.material = mapMaterial;
    }
  });

  $effect(() => {
    scale = getImageScale(imageSize, containerSize, mapProps.scaleMode, mapProps.customScale);
  });
</script>

<T.Mesh
  bind:ref={mapQuad}
  position={mapProps.scaleMode === ScaleMode.Custom ? [mapProps.offset.x, -mapProps.offset.y, -5] : [0, 0, -5]}
  rotation.z={(mapProps.rotation / 180.0) * Math.PI}
  scale={[scale.x, scale.y, scale.z]}
>
  <!-- Overlay fog of war on top of the map quad -->
  <FogOfWar props={fogOfWarProps} {imageSize} />
  <!-- Map texture is applied to this geometry -->
  <T.PlaneGeometry />
</T.Mesh>
