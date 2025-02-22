<script lang="ts">
  import { Color, Button, List, Folder, type ListOptions } from 'svelte-tweakpane-ui';
  import type { StageProps, StageExports } from '@tableslayer/ui';
  import { SceneRotation } from '@tableslayer/ui';

  let { props = $bindable(), stage } = $props<{
    props: StageProps;
    stage: StageExports;
  }>();

  const sceneRotationOptions: ListOptions<number> = {
    Deg0: SceneRotation.Deg0,
    Deg90: SceneRotation.Deg90,
    Deg180: SceneRotation.Deg180,
    Deg270: SceneRotation.Deg270
  };
</script>

<Folder title="Scene" expanded={false}>
  <Color bind:value={props.backgroundColor} label="Background Color" />
  <Button on:click={() => (props.scene.offset = { x: 0, y: 0 })} title="Center" />
  <List bind:value={props.scene.rotation} label="Rotation" options={sceneRotationOptions} />
  <Button on:click={() => stage?.scene.fill()} title="Fill" />
  <Button on:click={() => stage?.scene.fit()} title="Fit" />
</Folder>
