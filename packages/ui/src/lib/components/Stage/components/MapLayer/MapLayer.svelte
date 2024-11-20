<script lang="ts">
  import * as THREE from 'three';
  import { type AsyncWritable, type Size, T, useLoader } from '@threlte/core';
  import { TextureLoader } from 'three';
  import { type MapLayerProps } from './types';

  interface Props {
    props: MapLayerProps;
    z: number;
    onMapLoaded: (size: Size) => void;
  }

  let { props, z, onMapLoaded }: Props = $props();
  let image: AsyncWritable<THREE.Texture> | undefined = $state();

  const loader = useLoader(TextureLoader);

  $effect(() => {
    // Update the image whenever the URL is changed
    image = loader.load(props.url, {
      transform: (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;

        onMapLoaded({
          width: texture.source.data.width ?? 0,
          height: texture.source.data.height ?? 0
        });

        return texture;
      }
    });
  });
</script>

<T.Mesh position={[0, 0, z]}>
  <T.MeshBasicMaterial map={$image} transparent={true} />
  <T.PlaneGeometry />
</T.Mesh>
