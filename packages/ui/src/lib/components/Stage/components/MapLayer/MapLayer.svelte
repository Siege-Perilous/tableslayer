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

  const loader = useLoader(TextureLoader);
  let image = loader.load(backgroundImageUrl, {
    transform: (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }
  });

  $effect(() => {
    if ($image) {
      const size: Size = {
        width: $image.source.data.width ?? 0,
        height: $image.source.data.height ?? 0
      };

      onimageloaded(size);
    }
  });
</script>

<T.Mesh position={[0, 0, -4]}>
  <T.MeshBasicMaterial map={$image} transparent={true} />
  <T.PlaneGeometry />
</T.Mesh>
