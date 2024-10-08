<script lang="ts">
  import * as THREE from 'three';
  import { T } from '@threlte/core';
  import { ImageMaterial } from '../../materials/ImageMaterial';
  import { useLoader } from '@threlte/core';
  import { TextureLoader } from 'three';
  import backgroundImageUrl from './sword_coast.jpg';
  import type { MapProps } from './types';

  let { props }: { props: MapProps } = $props();

  const DEFAULT_IMAGE_WIDTH = 1920;
  const DEFAULT_IMAGE_HEIGHT = 1080;

  const loader = useLoader(TextureLoader);

  let mapQuad = $state(new THREE.Mesh());

  let mapImage = loader.load(backgroundImageUrl, {
    transform: (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }
  });

  $effect(() => {
    // Is the map image loaded yet?
    if ($mapImage) {
      // Update the quad size to match the image size
      const bgWidth = $mapImage.source.data.width ?? DEFAULT_IMAGE_WIDTH;
      const bgHeight = $mapImage.source.data.height ?? DEFAULT_IMAGE_HEIGHT;
      mapQuad.scale.set(props.scale * bgWidth, props.scale * bgHeight, 0);

      let mapMaterial = new ImageMaterial();
      mapMaterial.uniforms['tDiffuse'].value = $mapImage;
      mapQuad.material = mapMaterial;
    }
  });
</script>

<T.Mesh
  bind:ref={mapQuad}
  position={[props.offset.x, -props.offset.y, -1]}
  rotation.z={(props.rotation / 180.0) * Math.PI}
>
  <T.PlaneGeometry />
</T.Mesh>
