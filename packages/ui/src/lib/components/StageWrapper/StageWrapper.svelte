<!--
  @component Wrapper for the `Stage` component which exposes a debug UI for modifying the stage properties
-->
<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { Color, Pane, Folder } from 'svelte-tweakpane-ui';
  import Stage from '../Stage/Stage.svelte';
  import type StageProps from '../Stage/StageProps';
  import { LayerRotation } from '../Stage/Layers/enums';

  let stageProps: StageProps = $state({
    background: {
      color: '#ff0000',
      enabled: true,
      offset: { x: 0, y: 0 },
      rotation: LayerRotation.None,
      scale: 1.0
    }
  });

  let backgroundStyle = $derived(`background-color: ${stageProps.background.color}`);
</script>

<div class="stage-background" style={backgroundStyle}>
  <Canvas>
    <Stage background={stageProps.background} />
  </Canvas>
</div>

<Pane position="draggable">
  <Folder title="Background">
    <Color bind:value={stageProps.background.color} label="Color" />
  </Folder>
</Pane>
