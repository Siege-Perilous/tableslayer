<script lang="ts">
  import * as THREE from 'three';
  import { type Size, T, useLoader } from '@threlte/core';
  import { TextureLoader } from 'three';
  import { type MapLayerProps } from './types';

  interface Props {
    props: MapLayerProps;
    z: number;
    onMapLoaded: (size: Size) => void;
  }

  let { props, z, onMapLoaded }: Props = $props();
  let clippingPlanes: THREE.Plane[] = $state([]);

  const loader = useLoader(TextureLoader);
  let image = loader.load(props.url, {
    transform: (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }
  });

  $effect(() => {
    if ($image) {
      const width = $image.source.data.width ?? 0;
      const height = $image.source.data.height ?? 0;

      clippingPlanes = [
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), 100),
        new THREE.Plane(new THREE.Vector3(1, 0, 0), 100)
        /*
        new THREE.Plane(new THREE.Vector3(0, 0, 0), -height / 2),
        new THREE.Plane(new THREE.Vector3(0, 0, 0), height / 2)*/
      ];

      onMapLoaded({ width, height });
    }
  });
</script>

<T.Mesh position={[0, 0, z]}>
  <T.MeshBasicMaterial map={$image} transparent={true} {clippingPlanes} />
  <T.PlaneGeometry />
</T.Mesh>
