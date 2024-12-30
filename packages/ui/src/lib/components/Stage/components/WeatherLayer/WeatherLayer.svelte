<script lang="ts">
  import { T } from '@threlte/core';
  import { type WeatherProps } from './types';
  import WeatherMaterial from './WeatherMaterial.svelte';

  interface Props {
    props: WeatherProps;
    resolution: { x: number; y: number };
  }

  const { props, resolution }: Props = $props();
</script>

<T.Mesh scale={[resolution.x, resolution.y, 1]}>
  <WeatherMaterial {props} {resolution} />
  <T.PlaneGeometry />
</T.Mesh>
