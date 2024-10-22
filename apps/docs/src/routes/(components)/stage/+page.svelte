<script lang="ts">
  import { Button, Binding, Color, Pane, List, Slider, Folder, type ListOptions } from 'svelte-tweakpane-ui';
  import { ScaleMode, GridType, Stage, type StageProps, DrawMode, ToolType } from '@tableslayer/ui';
  import { StageDefaultProps } from './defaults';

  const stageProps: StageProps = $state(StageDefaultProps);
  let stage;

  const toolTypeOptions: ListOptions<number> = {
    RoundBrush: ToolType.RoundBrush,
    SquareBrush: ToolType.SquareBrush,
    Rectangle: ToolType.Rectangle,
    Ellipse: ToolType.Ellipse
  };

  const drawModeOptions: ListOptions<number> = {
    Eraser: DrawMode.Erase,
    Draw: DrawMode.Draw
  };

  const gridTypeOptions: ListOptions<number> = {
    Square: GridType.Square,
    Hex: GridType.Hex
  };

  const scaleModeOptions: ListOptions<number> = {
    None: ScaleMode.Custom,
    Fill: ScaleMode.Fill,
    Fit: ScaleMode.Fit
  };

  function centerCamera() {
    stageProps.map.offset = {
      x: 0,
      y: 0
    };
  }
</script>

<div class="stage-wrapper">
  <Stage bind:this={stage} props={stageProps} />
</div>

<!-- DEBUG UI -->
<Pane position="draggable" title="Settings">
  <Folder title="Map">
    <Color bind:value={stageProps.backgroundColor} label="Color" />
    <Slider bind:value={stageProps.map.rotation} label="Rotation" min={0} max={360} />
    <List bind:value={stageProps.map.scaleMode} label="Fill Mode" options={scaleModeOptions} />
    <Binding
      bind:object={stageProps.map}
      key={'offset'}
      label="Offset"
      disabled={stageProps.map.scaleMode !== ScaleMode.Custom}
    />
    <Slider
      bind:value={stageProps.map.customScale}
      label="Scale"
      min={0.1}
      max={2}
      disabled={stageProps.map.scaleMode !== ScaleMode.Custom}
    />
    <Button on:click={centerCamera} title="Re-Center Map" />
  </Folder>

  <Folder title="Fog of War">
    <List bind:value={stageProps.fogOfWar.toolType} label="Tool" options={toolTypeOptions} />
    <List bind:value={stageProps.fogOfWar.drawMode} label="Draw Mode" options={drawModeOptions} />
    <Slider
      bind:value={stageProps.fogOfWar.brushSize}
      label="Brush Size"
      min={1}
      max={500}
      step={1}
      disabled={stageProps.fogOfWar.toolType !== ToolType.RoundBrush &&
        stageProps.fogOfWar.toolType !== ToolType.SquareBrush}
    />
    <Color bind:value={stageProps.fogOfWar.fogColor} label="Color" />
    <Slider bind:value={stageProps.fogOfWar.opacity} label="Opacity" min={0} max={1} step={0.01} />
    <Button on:click={() => stage!.resetFog()} title="Reset Fog" />
    <Button on:click={() => stage!.revealAll()} title="Reveal All" />
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
