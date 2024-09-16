<script lang="ts">
  // This demo is based on https://threlte.xyz/docs/learn/getting-started/your-first-scene
  // There are a couple differences to work with Svelte 5
  import { T, useTask } from '@threlte/core';
  import { interactivity } from '@threlte/extras';
  import { spring } from 'svelte/motion';

  interactivity();
  const scale = spring(1);

  // Svelte 5 expects a $state for reactive variables
  let rotation = $state(0);
  useTask((delta) => {
    rotation += delta;
  });
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
<T.Mesh
  rotation.y={rotation}
  position.y={1}
  scale={$scale}
  onpointerenter={() => scale.set(1.5)}
  onpointerleave={() => scale.set(1)}
>
  <T.BoxGeometry args={[1, 2, 1]} />
  <T.MeshStandardMaterial color="hotpink" />
</T.Mesh>
