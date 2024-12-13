<script lang="ts">
  import { Button, Binding, Color, Folder, List, type ListOptions, Pane, Slider, Separator } from 'svelte-tweakpane-ui';
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
  import { onMount } from 'svelte';

  const stageProps: StageProps = $state(StageDefaultProps);
  let stage: StageExports;
  let stageElement: HTMLDivElement | undefined = $state();
  let mapUrl = $state(stageProps.map.url);

  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.0005;
  let mouseDown = false;

  const mapOptions: ListOptions<string> = {
    'Map 1': 'https://files.tableslayer.com/maps/01.jpeg',
    'Map 2': 'https://files.tableslayer.com/maps/02.jpeg',
    'Map 3': 'https://files.tableslayer.com/maps/03.jpeg',
    'Map 4': 'https://files.tableslayer.com/maps/04.jpeg',
    'Map 5': 'https://files.tableslayer.com/maps/05.jpeg',
    'Map 6': 'https://files.tableslayer.com/maps/06.jpeg',
    'Map 7': 'https://files.tableslayer.com/maps/07.jpeg',
    'Map 8': 'https://files.tableslayer.com/maps/08.jpeg',
    'Map 9': 'https://files.tableslayer.com/maps/09.jpeg',
    'Map 10': 'https://files.tableslayer.com/maps/10.jpeg',
    'Map 11': 'https://files.tableslayer.com/maps/11.jpeg',
    'Map 12': 'https://files.tableslayer.com/maps/12.jpeg'
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

  onMount(() => {
    if (stageElement) {
      stageElement.addEventListener('mousedown', () => (mouseDown = true));
      stageElement.addEventListener('mouseup', () => (mouseDown = false));
      stageElement.addEventListener('mousemove', onMouseMove);
      stageElement.addEventListener('wheel', onWheel);

      stageElement.addEventListener(
        'contextmenu',
        function (e) {
          e.preventDefault();
        },
        false
      );
    }

    document.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'e':
          stageProps.activeLayer = MapLayerType.FogOfWar;
          stageProps.fogOfWar.drawMode = DrawMode.Erase;
          stageProps.fogOfWar.toolType = ToolType.RoundBrush;
          break;
        case 'E':
          stageProps.activeLayer = MapLayerType.FogOfWar;
          stageProps.fogOfWar.drawMode = DrawMode.Draw;
          stageProps.fogOfWar.toolType = ToolType.RoundBrush;
          break;
        case 'f':
          stage.fogOfWar.clear();
          break;
        case 'F':
          stage.fogOfWar.reset();
          break;
        case 'o':
          stageProps.activeLayer = MapLayerType.FogOfWar;
          stageProps.fogOfWar.drawMode = DrawMode.Erase;
          stageProps.fogOfWar.toolType = ToolType.Ellipse;
          break;
        case 'O':
          stageProps.activeLayer = MapLayerType.FogOfWar;
          stageProps.fogOfWar.drawMode = DrawMode.Draw;
          stageProps.fogOfWar.toolType = ToolType.Ellipse;
          break;
        case 'p':
          stageProps.activeLayer = MapLayerType.Ping;
          stageProps.ping.editMode = PingEditMode.Remove;
          break;
        case 'P':
          stageProps.activeLayer = MapLayerType.Ping;
          stageProps.ping.editMode = PingEditMode.Add;
          break;
        case 'r':
          stageProps.activeLayer = MapLayerType.FogOfWar;
          stageProps.fogOfWar.drawMode = DrawMode.Erase;
          stageProps.fogOfWar.toolType = ToolType.Rectangle;
          break;
        case 'R':
          stageProps.activeLayer = MapLayerType.FogOfWar;
          stageProps.fogOfWar.drawMode = DrawMode.Draw;
          stageProps.fogOfWar.toolType = ToolType.Rectangle;
          break;
        case 'Escape':
          stageProps.activeLayer = MapLayerType.None;
          break;
      }
    });
  });

  function updateMapUrl() {
    stageProps.map.url = mapUrl;
    // Reset fog of war data and ping locations
    stageProps.fogOfWar.data = null;
    stageProps.ping.locations = [];
  }

  function onBrushSizeUpdated(brushSize: number) {
    stageProps.fogOfWar.brushSize = brushSize;
  }

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

  function onMouseMove(e: MouseEvent) {
    if (!mouseDown) return;

    if (e.shiftKey) {
      stageProps.map.offset.x += e.movementX / stageProps.scene.zoom;
      stageProps.map.offset.y -= e.movementY / stageProps.scene.zoom;
    } else if (e.ctrlKey) {
      stageProps.scene.offset.x += e.movementX;
      stageProps.scene.offset.y -= e.movementY;
    }
  }

  function onWheel(e: WheelEvent) {
    let scrollDelta;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      scrollDelta = e.deltaX * zoomSensitivity;
    } else {
      scrollDelta = e.deltaY * zoomSensitivity;
    }

    if (e.shiftKey) {
      stageProps.map.zoom = Math.max(minZoom, Math.min(stageProps.map.zoom - scrollDelta, maxZoom));
    } else if (e.ctrlKey) {
      stageProps.scene.zoom = Math.max(minZoom, Math.min(stageProps.scene.zoom - scrollDelta, maxZoom));
    }
  }
</script>

<div bind:this={stageElement} class="stage-wrapper">
  <Stage bind:this={stage} props={stageProps} {onBrushSizeUpdated} {onMapUpdate} {onSceneUpdate} {onPingsUpdated} />
  <div>
    <h1>Keybindings</h1>
    <ul>
      <li>e - Erase Fog (Round Brush)</li>
      <li>o - Erase Fog (Ellipse)</li>
      <li>r - Erase Fog (Rectangle)</li>
      <li>E - Draw Fog (Round Brush)</li>
      <li>O - Draw Fog (Ellipse)</li>
      <li>R - Draw Fog (Rectangle)</li>
      <li>f - Clear Fog</li>
      <li>E - Reset Fog</li>
      <li>p - Remove Ping</li>
      <li>P - Add Ping</li>
    </ul>
  </div>
</div>

<!-- DEBUG UI -->
<Pane position="draggable" title="Settings">
  <Folder title="Display">
    <Slider bind:value={stageProps.display.size.x} label="Width (in)" />
    <Slider bind:value={stageProps.display.size.y} label="Height (in)" />
    <Slider bind:value={stageProps.display.resolution.x} label="Resolution (X)" />
    <Slider bind:value={stageProps.display.resolution.y} label="Resolution (Y)" />
    <Slider bind:value={stageProps.display.padding.x} label="Padding (X)" min={0} />
    <Slider bind:value={stageProps.display.padding.y} label="Padding (Y)" min={0} />
  </Folder>

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

  <Folder title="Grid" expanded={true}>
    <List bind:value={stageProps.grid.gridType} label="Type" options={gridTypeOptions} />
    <Slider bind:value={stageProps.grid.opacity} label="Opacity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.grid.spacing} label="Spacing (in)" min={0.25} max={3} step={0.25} />
    <Slider bind:value={stageProps.grid.lineThickness} label="Line Thickness" min={1} max={100} />
    <Color bind:value={stageProps.grid.lineColor} label="Line Color" />
    <Slider bind:value={stageProps.grid.shadowIntensity} label="Shadow Intensity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.grid.shadowSize} label="Shadow Size" min={1} max={5} step={0.01} />
    <Color bind:value={stageProps.grid.shadowColor} label="Shadow Color" />
  </Folder>

  <Folder title="Map" expanded={false}>
    <List bind:value={mapUrl} label="Map" options={mapOptions} />
    <Button on:click={() => updateMapUrl()} title="Load" />
    <Separator />
    <Slider bind:value={stageProps.map.rotation} label="Rotation" min={0} max={360} />
    <Button on:click={() => (stageProps.map.offset = { x: 0, y: 0 })} title="Center" />
    <Button on:click={() => stage.map.fill()} title="Fill" />
    <Button on:click={() => stage.map.fit()} title="Fit" />
  </Folder>

  <Folder title="Ping" expanded={false}>
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
