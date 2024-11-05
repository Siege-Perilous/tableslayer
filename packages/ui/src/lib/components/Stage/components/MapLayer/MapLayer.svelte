<script lang="ts">
  import * as THREE from 'three';
  import { type Size, T, useLoader } from '@threlte/core';
  import { TextureLoader } from 'three';
  import backgroundImageUrl from './dungeon.png';
  import { type MapProps } from './types';

  interface Props {
    props: MapProps;
    onimageloaded: (size: Size) => void;
  }

  let { props, onimageloaded }: Props = $props();

  let material = $state(new THREE.MeshBasicMaterial({ transparent: true, premultipliedAlpha: true }));

  const loader = useLoader(TextureLoader);
  let mapImage = loader.load(backgroundImageUrl, {
    transform: (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }
  });

  $effect(() => {
    if ($mapImage) {
      const size: Size = {
        width: $mapImage.source.data.width ?? 0,
        height: $mapImage.source.data.height ?? 0
      };

      material.map = $mapImage;

      onimageloaded(size);
    }
  });
</script>

<T.Mesh>
  <T.MeshBasicMaterial bind:ref={material} />
  <T.PlaneGeometry />
</T.Mesh>
