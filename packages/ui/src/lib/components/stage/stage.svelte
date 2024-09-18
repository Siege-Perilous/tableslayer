<script lang="ts">
  import { T, useTask, useThrelte } from '@threlte/core';
  import * as THREE from 'three';
  import { interactivity } from '@threlte/extras';
  import { spring } from 'svelte/motion';
  import type StageProps from './StageProps';

  // Enables mouse interactivity
  interactivity();

  const scale = spring(1);

  let rotation = $state(0);
  useTask((delta) => {
    rotation += delta;
  });

  //const { renderer, invalidate } = useThrelte();

  let props: StageProps = $props();

  //console.log(props);

  //renderer.setClearColor(new THREE.Color(props.background.color));
</script>

<!-- Svelte 5 changes on:something to onsomething -->
<T.PerspectiveCamera
  makeDefault
  position={[10, 10, 10]}
  oncreate={({ ref }) => {
    ref.lookAt(0, 1, 0);
  }}
/>
<T.DirectionalLight position={[0, 10, 10]} />
<T.Mesh rotation.y={rotation} position.y={1} scale={$scale}>
  <T.BoxGeometry args={[1, 1, 1]} />
  <T.MeshStandardMaterial color="hotpink" />
</T.Mesh>
