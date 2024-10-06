<script lang="ts">
  import { Binding, Color, Pane, List, Slider, Folder, type ListOptions } from 'svelte-tweakpane-ui';
  import { GridType, Stage, type CameraProps, type StageProps } from '@tableslayer/ui';
  import { StageDefaultProps } from './defaults';

  const stageProps: StageProps = $state(StageDefaultProps);

  const gridTypeOptions: ListOptions<number> = {
    Square: GridType.Square,
    Hex: GridType.Hex
  };

  function onCameraUpdate(camera: CameraProps) {
    stageProps.camera.position.x = camera.position.x;
    stageProps.camera.position.y = camera.position.y;
    stageProps.camera.position.z = camera.position.z;
    stageProps.camera.zoom = camera.zoom;
  }
</script>

<div class="stage-wrapper">
  <Stage props={stageProps} {onCameraUpdate} />
</div>

<!-- DEBUG UI -->
<Pane position="draggable" title="Settings">
  <Folder title="Map">
    <Color bind:value={stageProps.backgroundColor} label="Color" />
    <Binding bind:object={stageProps.camera} key={'zoom'} label="Zoom" />
    <Binding bind:object={stageProps.camera} key={'position'} label="Position" />
  </Folder>

  <Folder title="Grid">
    <List bind:value={stageProps.grid.gridType} label="Type" options={gridTypeOptions} />
    <Slider bind:value={stageProps.grid.opacity} label="Opacity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.grid.spacing} label="Spacing" min={5} max={500} />
    <Slider bind:value={stageProps.grid.offset.x} label="Offset X" min={0} max={1} />
    <Slider bind:value={stageProps.grid.offset.y} label="Offset Y" min={0} max={1} />
    <Slider bind:value={stageProps.grid.lineThickness} label="Line Thickness" min={1} max={20} step={0.01} />
    <Color bind:value={stageProps.grid.lineColor} label="Line Color" />
    <Slider bind:value={stageProps.grid.shadowIntensity} label="Shadow Intensity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.grid.shadowSize} label="Shadow Size" min={1} max={5} step={0.01} />
    <Color bind:value={stageProps.grid.shadowColor} label="Shadow Color" />
  </Folder>
</Pane>

<style>
  .stage-wrapper {
    height: 800px;
    border: 1px solid white;
  }
</style>
