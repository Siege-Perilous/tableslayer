<script lang="ts">
  import { Button, Binding, Color, Pane, List, Slider, Folder, type ListOptions } from 'svelte-tweakpane-ui';
  import {
    GridType,
    Stage,
    type StageExports,
    type StageProps,
    DrawMode,
    ToolType,
    WeatherType,
    MapLayerType,
    PingEditMode
  } from '@tableslayer/ui';
  import { StageDefaultProps } from './defaults';

  const stageProps: StageProps = $state(StageDefaultProps);
  let stage: StageExports;

  const layerTypeOptions: ListOptions<number> = {
    None: MapLayerType.None,
    'Fog of War': MapLayerType.FogOfWar,
    Ping: MapLayerType.Ping
  };

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

  const weatherTypeOptions: ListOptions<number> = {
    Rain: WeatherType.Rain
  };

  function onMapUpdate(offset: { x: number; y: number }, zoom: number) {
    stageProps.map.offset.x = offset.x;
    stageProps.map.offset.y = offset.y;
    stageProps.map.zoom = zoom;
  }

  function onSceneUpdate(offset: { x: number; y: number }, zoom: number) {
    stageProps.scene.offset.x = offset.x;
    stageProps.scene.offset.y = offset.y;
    stageProps.scene.zoom = zoom;
  }

  function onPingsUpdated(updatedLocations: { x: number; y: number }[]) {
    stageProps.ping.locations = updatedLocations;
  }
</script>

<div class="stage-wrapper">
  <Stage bind:this={stage} props={stageProps} {onMapUpdate} {onSceneUpdate} {onPingsUpdated} />
</div>

<!-- DEBUG UI -->
<Pane position="draggable" title="Settings">
  <List bind:value={stageProps.scene.activeLayer} label="Active Layer" options={layerTypeOptions} />

  <Folder title="Fog of War" expanded={false}>
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
    <Button on:click={() => stage.fogOfWar.reset()} title="Reset Fog" />
    <Button on:click={() => stage.fogOfWar.clear()} title="Reveal All" />
    <Button on:click={() => console.log(stage.fogOfWar.toBase64())} title="Export" />
  </Folder>

  <Folder title="Grid" expanded={false}>
    <List bind:value={stageProps.grid.gridType} label="Type" options={gridTypeOptions} />
    <Slider bind:value={stageProps.grid.opacity} label="Opacity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.grid.divisions} label="Subdivisions" min={1} max={50} step={1} />
    <Slider bind:value={stageProps.grid.offset.x} label="Offset X" min={0} max={1000} step={1} />
    <Slider bind:value={stageProps.grid.offset.y} label="Offset Y" min={0} max={1000} step={1} />
    <Slider bind:value={stageProps.grid.lineThickness} label="Line Thickness" min={1} max={10} />
    <Color bind:value={stageProps.grid.lineColor} label="Line Color" />
    <Slider bind:value={stageProps.grid.shadowIntensity} label="Shadow Intensity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.grid.shadowSize} label="Shadow Size" min={1} max={5} step={0.01} />
    <Color bind:value={stageProps.grid.shadowColor} label="Shadow Color" />
  </Folder>

  <Folder title="Map" expanded={false}>
    <Slider bind:value={stageProps.map.rotation} label="Rotation" min={0} max={360} />
    <Button on:click={() => (stageProps.map.offset = { x: 0, y: 0 })} title="Center" />
    <Button on:click={() => stage.map.fill()} title="Fill" />
    <Button on:click={() => stage.map.fit()} title="Fit" />
  </Folder>

  <Folder title="Ping">
    <Color bind:value={stageProps.ping.color} label="Color" />
    <Slider bind:value={stageProps.ping.markerSize} label="Marker Size" min={1} max={500} step={1} />
    <Slider bind:value={stageProps.ping.thickness} label="Thickness" min={0} max={1} />
    <Slider bind:value={stageProps.ping.sharpness} label="Edge Sharpness" min={0} max={1} />
    <Slider bind:value={stageProps.ping.pulseAmplitude} label="Pulse Amplitude" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.ping.pulseSpeed} label="Pulse Speed" min={0} max={5} step={0.01} />
    <Button on:click={() => (stageProps.ping.editMode = PingEditMode.Add)} title="Add Ping" />
    <Button on:click={() => (stageProps.ping.editMode = PingEditMode.Remove)} title="Remove Ping" />
  </Folder>

  <Folder title="Scene" expanded={false}>
    <Color bind:value={stageProps.backgroundColor} label="Background Color" />
    <Button on:click={() => (stageProps.scene.offset = { x: 0, y: 0 })} title="Center" />
    <Button on:click={() => stage.scene.fill()} title="Fill" />
    <Button on:click={() => stage.scene.fit()} title="Fit" />
  </Folder>

  <Folder title="Weather" expanded={false}>
    <List bind:value={stageProps.weather.weatherType} label="Type" options={weatherTypeOptions} />
    <Color bind:value={stageProps.weather.color} label="Color" />
    <Slider bind:value={stageProps.weather.opacity} label="Opacity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.weather.angle} label="Angle" min={-180} max={180} step={0.1} />
    <Slider bind:value={stageProps.weather.intensity} label="Intensity" min={0} max={1} step={0.01} />
    <Binding bind:object={stageProps.weather} key={'scale'} label="Scale" />
    <Slider bind:value={stageProps.weather.speed} label="Speed" min={0} max={25} step={0.01} />
  </Folder>
</Pane>

<style>
  .stage-wrapper {
    height: 800px;
    border: 1px solid white;
  }
</style>
