<script lang="ts">
  import * as THREE from 'three';
  import { T, type Size } from '@threlte/core';
  import { ImageMaterial } from '../../materials/ImageMaterial';
  import { useLoader } from '@threlte/core';
  import { TextureLoader } from 'three';
  import backgroundImageUrl from './sword_coast.jpg';
  import { ScaleMode, type MapProps } from './types';
  import { getImageScale } from './MapHelpers';

  let { props, containerSize }: { props: MapProps; containerSize: Size } = $props();

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
      const imageSize: Size = {
        width: $mapImage.source.data.width ?? DEFAULT_IMAGE_WIDTH,
        height: $mapImage.source.data.height ?? DEFAULT_IMAGE_HEIGHT
      };

      // Update the quad size to match the image size
      const mapScale = getImageScale(imageSize, containerSize, props.scaleMode, props.customScale);
      mapQuad.scale.copy(mapScale);

      // Update the map quad shader to use the uploaded image
      let mapMaterial = new ImageMaterial();
      mapMaterial.uniforms['tDiffuse'].value = $mapImage;
      mapQuad.material = mapMaterial;
    }
  });
</script>

<T.Mesh
  bind:ref={mapQuad}
  position={[
    props.scaleMode === ScaleMode.Custom ? props.offset.x : 0,
    props.scaleMode === ScaleMode.Custom ? -props.offset.y : 0,
    -1
  ]}
  rotation.z={(props.rotation / 180.0) * Math.PI}
>
  <T.PlaneGeometry />
</T.Mesh>
