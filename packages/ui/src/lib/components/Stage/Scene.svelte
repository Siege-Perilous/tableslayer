<script lang="ts">
  import { T, useTask } from '@threlte/core';

  let rotation = $state(0);
  useTask((delta: number) => {
    rotation += delta;
  });
</script>

<T.Mesh rotation.y={rotation}>
  <T.MeshBasicMaterial color="white" />
  <T.BoxGeometry />
</T.Mesh>
