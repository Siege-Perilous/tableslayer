<script lang="ts">
  import { Canvas } from '@threlte/core';
  import type { CameraProps, StageProps } from './types';
  import Scene from './Scene.svelte';

  let { props, onCameraUpdate }: { props: StageProps; onCameraUpdate: (camera: CameraProps) => void } = $props();
</script>

<Canvas>
  <Scene stageProps={props} {onCameraUpdate} />
</Canvas>
