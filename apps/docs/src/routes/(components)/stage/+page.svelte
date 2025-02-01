<script lang="ts">
  import { Button, Binding, Color, Folder, List, type ListOptions, Pane, Slider, Separator } from 'svelte-tweakpane-ui';
  import {
    GridType,
    Stage,
    type StageExports,
    type StageProps,
    DrawMode,
    ToolType,
    MapLayerType,
    PingEditMode,
    SceneRotation,
    ParticleType
  } from '@tableslayer/ui';
  import { StageDefaultProps } from './defaults';
  import { onMount } from 'svelte';

  let stageProps: StageProps = $state(StageDefaultProps);
  let stage: StageExports | undefined = $state();
  let stageElement: HTMLDivElement | undefined = $state();
  // svelte-ignore state_referenced_locally
  let mapUrl = $state(stageProps.map.url);

  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.0005;

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
    Brush: ToolType.Brush,
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

  const sceneRotationOptions: ListOptions<number> = {
    Deg0: SceneRotation.Deg0,
    Deg90: SceneRotation.Deg90,
    Deg180: SceneRotation.Deg180,
    Deg270: SceneRotation.Deg270
  };

  const particleTypeOptions: ListOptions<number> = {
    Snow: ParticleType.Snow,
    Rain: ParticleType.Rain
  };

  onMount(() => {
    if (stageElement) {
      stageElement.addEventListener('mousemove', onMouseMove);
      stageElement.addEventListener('wheel', onWheel, { passive: false });

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
          stageProps.fogOfWar.tool.mode = DrawMode.Erase;
          stageProps.fogOfWar.tool.type = ToolType.Brush;
          break;
        case 'E':
          stageProps.activeLayer = MapLayerType.FogOfWar;
          stageProps.fogOfWar.tool.mode = DrawMode.Draw;
          stageProps.fogOfWar.tool.type = ToolType.Brush;
          break;
        case 'f':
          stage?.fogOfWar.clear();
          break;
        case 'F':
          stage?.fogOfWar.reset();
          break;
        case 'o':
          stageProps.activeLayer = MapLayerType.FogOfWar;
          stageProps.fogOfWar.tool.type = ToolType.Ellipse;
          stageProps.fogOfWar.tool.mode = DrawMode.Erase;
          break;
        case 'O':
          stageProps.activeLayer = MapLayerType.FogOfWar;
          stageProps.fogOfWar.tool.type = ToolType.Ellipse;
          stageProps.fogOfWar.tool.mode = DrawMode.Draw;
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
          stageProps.fogOfWar.tool.type = ToolType.Rectangle;
          stageProps.fogOfWar.tool.mode = DrawMode.Erase;
          break;
        case 'R':
          stageProps.activeLayer = MapLayerType.FogOfWar;
          stageProps.fogOfWar.tool.type = ToolType.Rectangle;
          stageProps.fogOfWar.tool.mode = DrawMode.Draw;
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
    stageProps.fogOfWar.url = null;
    stageProps.ping.locations = [];
  }

  async function onFogUpdate(blob: Promise<Blob>) {
    // No-op
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
    if (!(e.buttons === 1 || e.buttons === 2)) return;

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
      e.preventDefault();
      stageProps.scene.zoom = Math.max(minZoom, Math.min(stageProps.scene.zoom - scrollDelta, maxZoom));
    } else if (stageProps.activeLayer === MapLayerType.FogOfWar) {
      stageProps.fogOfWar.tool.size = Math.max(10, Math.min(stageProps.fogOfWar.tool.size + 500.0 * scrollDelta, 1000));
    }
  }
</script>

<div bind:this={stageElement} class="stage-wrapper">
  <Stage bind:this={stage} props={stageProps} {onFogUpdate} {onMapUpdate} {onSceneUpdate} {onPingsUpdated} />
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
      <li>F - Reset Fog</li>
      <li>p - Remove Ping</li>
      <li>P - Add Ping</li>
      <li>SHIFT + Mouse Down - Pan Map</li>
      <li>SHIFT + Wheel - Zoom Map</li>
      <li>CONTROL + Mouse Down - Pan Scene</li>
      <li>CONTROL + Wheel - Zoom Scene</li>
    </ul>
  </div>
</div>

<!-- DEBUG UI -->
<Pane position="draggable" title="Settings">
  <Folder title="Display" expanded={false}>
    <Slider bind:value={stageProps.display.size.x} label="Width (in)" />
    <Slider bind:value={stageProps.display.size.y} label="Height (in)" />
    <Slider bind:value={stageProps.display.resolution.x} label="Resolution (X)" />
    <Slider bind:value={stageProps.display.resolution.y} label="Resolution (Y)" />
    <Slider bind:value={stageProps.display.padding.x} label="Padding (X)" min={0} />
    <Slider bind:value={stageProps.display.padding.y} label="Padding (Y)" min={0} />
  </Folder>

  <Folder title="Fog of War" expanded={false}>
    <List bind:value={stageProps.fogOfWar.tool.type} label="Tool" options={toolTypeOptions} />
    <List bind:value={stageProps.fogOfWar.tool.mode} label="Draw Mode" options={drawModeOptions} />
    <Slider
      bind:value={stageProps.fogOfWar.tool.size}
      label="Brush Size"
      min={1}
      max={500}
      step={1}
      disabled={stageProps.fogOfWar.tool.type !== ToolType.Brush}
    />

    <Slider bind:value={stageProps.fogOfWar.opacity} label="Opacity" min={0} max={1} step={0.01} />

    <Folder title="Outline" expanded={false}>
      <Color bind:value={stageProps.fogOfWar.outline.color} label="Color" />
      <Slider bind:value={stageProps.fogOfWar.outline.thickness} label="Thickness" min={0} max={100} step={1} />
      <Slider bind:value={stageProps.fogOfWar.outline.opacity} label="Opacity" min={0} max={1} step={0.01} />
    </Folder>

    <Folder title="Edge" expanded={false}>
      <Slider
        bind:value={stageProps.fogOfWar.edge.minMipMapLevel}
        label="Min Mip Map Level"
        min={0}
        max={10}
        step={1}
      />
      <Slider
        bind:value={stageProps.fogOfWar.edge.maxMipMapLevel}
        label="Max Mip Map Level"
        min={0}
        max={10}
        step={1}
      />
      <Binding bind:object={stageProps.fogOfWar.edge} key={'frequency'} label="Frequency" />
      <Binding bind:object={stageProps.fogOfWar.edge} key={'amplitude'} label="Amplitude" />
      <Slider bind:value={stageProps.fogOfWar.edge.offset} label="Offset" min={0} max={2} step={0.01} />
      <Slider bind:value={stageProps.fogOfWar.edge.speed} label="Speed" min={0} max={1} step={0.01} />
    </Folder>

    <Folder title="Noise" expanded={false}>
      <Color bind:value={stageProps.fogOfWar.noise.baseColor} label="Base Color" />
      <Color bind:value={stageProps.fogOfWar.noise.fogColor1} label="Color 1" />
      <Color bind:value={stageProps.fogOfWar.noise.fogColor2} label="Color 2" />
      <Color bind:value={stageProps.fogOfWar.noise.fogColor3} label="Color 3" />
      <Color bind:value={stageProps.fogOfWar.noise.fogColor4} label="Color 4" />
      <Binding bind:object={stageProps.fogOfWar.noise} key={'speed'} label="Fog Speed" />
      <Binding bind:object={stageProps.fogOfWar.noise} key={'frequency'} label="Frequency" />
      <Binding bind:object={stageProps.fogOfWar.noise} key={'offset'} label="Offset" />
      <Binding bind:object={stageProps.fogOfWar.noise} key={'amplitude'} label="Amplitude" />
      <Binding bind:object={stageProps.fogOfWar.noise} key={'persistence'} label="Persistence" />
      <Binding bind:object={stageProps.fogOfWar.noise} key={'lacunarity'} label="Lacunarity" />
      <Binding bind:object={stageProps.fogOfWar.noise} key={'levels'} label="Levels" />
    </Folder>
    <Button on:click={() => stage?.fogOfWar.reset()} title="Reset Fog Of War" />
    <Button on:click={() => stage?.fogOfWar.clear()} title="Clear Fog Of War" />
    <Button
      on:click={async () => {
        const blob = await stage?.fogOfWar.toPng();
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'fog-of-war.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      }}
      title="Export PNG"
    />
  </Folder>

  <Folder title="Grid" expanded={false}>
    <List bind:value={stageProps.grid.gridType} label="Type" options={gridTypeOptions} />
    <Color bind:value={stageProps.grid.lineColor} label="Line Color" />
    <Color bind:value={stageProps.grid.shadowColor} label="Shadow Color" />
    <Slider bind:value={stageProps.grid.opacity} label="Opacity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.grid.lineThickness} label="Line Thickness" min={0} max={100} />
    <Slider bind:value={stageProps.grid.spacing} label="Spacing (in)" min={0.25} max={3} step={0.25} />
    <Folder title="Drop Shadow" expanded={false}>
      <Slider bind:value={stageProps.grid.shadowOpacity} label="Shadow Opacity" min={0} max={1} step={0.01} />
      <Slider bind:value={stageProps.grid.shadowBlur} label="Shadow Blur" min={0} max={1} step={0.01} />
      <Slider bind:value={stageProps.grid.shadowSpread} label="Shadow Spread" min={1} max={10} step={0.01} />
    </Folder>
  </Folder>

  <Folder title="Map" expanded={false}>
    <List bind:value={mapUrl} label="Map" options={mapOptions} />
    <Button on:click={() => updateMapUrl()} title="Load" />
    <Separator />
    <Slider bind:value={stageProps.map.rotation} label="Rotation" min={0} max={360} step={1} />
    <Button on:click={() => (stageProps.map.offset = { x: 0, y: 0 })} title="Center" />
    <Button on:click={() => stage?.map.fill()} title="Fill" />
    <Button on:click={() => stage?.map.fit()} title="Fit" />
  </Folder>

  <Folder title="Ping" expanded={false}>
    <Color bind:value={stageProps.ping.color} label="Color" />
    <Slider bind:value={stageProps.ping.markerSize} label="Marker Size" min={1} max={500} step={1} />
    <Slider bind:value={stageProps.ping.thickness} label="Thickness" min={0} max={1} />
    <Slider bind:value={stageProps.ping.sharpness} label="Edge Sharpness" min={0} max={1} />
    <Slider bind:value={stageProps.ping.pulseAmplitude} label="Pulse Amplitude" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.ping.pulseSpeed} label="Pulse Speed" min={0} max={5} step={0.01} />
  </Folder>

  <Folder title="Scene" expanded={false}>
    <Color bind:value={stageProps.backgroundColor} label="Background Color" />
    <Button on:click={() => (stageProps.scene.offset = { x: 0, y: 0 })} title="Center" />
    <List bind:value={stageProps.scene.rotation} label="Rotation" options={sceneRotationOptions} />
    <Button on:click={() => stage?.scene.fill()} title="Fill" />
    <Button on:click={() => stage?.scene.fit()} title="Fit" />
  </Folder>

  <Folder title="Weather" expanded={true}>
    <Folder title="Camera" expanded={true}>
      <Slider bind:value={stageProps.weather.camera.fov} label="FOV" min={1} max={180} step={1} />
    </Folder>
    <Folder title="Particles" expanded={true}>
      <List bind:value={stageProps.weather.particles.type} label="Type" options={particleTypeOptions} />
      <Slider bind:value={stageProps.weather.particles.count} label="Count" min={1} max={10000} step={1} />
      <Color bind:value={stageProps.weather.particles.color} label="Color" />
      <Slider bind:value={stageProps.weather.particles.opacity} label="Opacity" min={0} max={1} step={0.01} />
      <Slider bind:value={stageProps.weather.particles.lifetime} label="Lifetime" min={1} max={10} />

      <Slider bind:value={stageProps.weather.particles.fadeInTime} label="Fade In (s)" min={0} max={10} step={0.01} />
      <Slider bind:value={stageProps.weather.particles.fadeOutTime} label="Fade Out (s)" min={0} max={10} step={0.01} />

      <Folder title="Force" expanded={false}>
        <Folder title="Linear" expanded={false}>
          <Slider
            bind:value={stageProps.weather.particles.force.linear.x}
            label="Amplitude X"
            min={0}
            max={1000}
            step={1}
          />
          <Slider
            bind:value={stageProps.weather.particles.force.linear.y}
            label="Amplitude Y"
            min={0}
            max={1000}
            step={1}
          />
          <Slider
            bind:value={stageProps.weather.particles.force.linear.z}
            label="Amplitude Z"
            min={0}
            max={1000}
            step={1}
          />
        </Folder>

        <Folder title="Exponential" expanded={false}>
          <Slider bind:value={stageProps.weather.particles.force.exponential.x} label="Amplitude X" min={0} max={10} />
          <Slider bind:value={stageProps.weather.particles.force.exponential.y} label="Amplitude Y" min={0} max={10} />
          <Slider bind:value={stageProps.weather.particles.force.exponential.z} label="Amplitude Z" min={0} max={10} />
        </Folder>

        <Folder title="Sinusoidal" expanded={false}>
          <Slider
            bind:value={stageProps.weather.particles.force.sinusoidal.amplitude.x}
            label="Amplitude X"
            min={0}
            max={0.1}
          />
          <Slider
            bind:value={stageProps.weather.particles.force.sinusoidal.amplitude.y}
            label="Amplitude Y"
            min={0}
            max={0.1}
          />
          <Slider
            bind:value={stageProps.weather.particles.force.sinusoidal.frequency.x}
            label="Frequency X"
            min={0}
            max={10}
          />
          <Slider
            bind:value={stageProps.weather.particles.force.sinusoidal.frequency.y}
            label="Frequency Y"
            min={0}
            max={10}
          />
        </Folder>
      </Folder>

      <Folder title="Initial Velocity" expanded={false}>
        <Slider bind:value={stageProps.weather.particles.initialVelocity.x} label="X" min={-1000} max={1000} step={1} />
        <Slider bind:value={stageProps.weather.particles.initialVelocity.y} label="Y" min={-1000} max={1000} step={1} />
        <Slider bind:value={stageProps.weather.particles.initialVelocity.z} label="Z" min={-1000} max={1000} step={1} />
      </Folder>

      <Folder title="Rotation" expanded={false}>
        <Slider bind:value={stageProps.weather.particles.rotation.x} label="X" min={0} max={360} step={1} />
        <Slider bind:value={stageProps.weather.particles.rotation.y} label="Y" min={0} max={360} step={1} />
        <Slider bind:value={stageProps.weather.particles.rotation.z} label="Z" min={0} max={360} step={1} />
      </Folder>

      <Folder title="Scale" expanded={false}>
        <Slider bind:value={stageProps.weather.particles.scale.x} label="X" min={0} max={10} />
        <Slider bind:value={stageProps.weather.particles.scale.y} label="Y" min={0} max={10} />
      </Folder>

      <Folder title="Size" expanded={false}>
        <Slider bind:value={stageProps.weather.particles.size.min} label="Min Size" min={0.001} max={0.1} />
        <Slider bind:value={stageProps.weather.particles.size.max} label="Max Size" min={0.001} max={0.1} />
      </Folder>

      <Folder title="Spawn Area" expanded={false}>
        <Slider bind:value={stageProps.weather.particles.spawnArea.width} label="Width" min={1} step={1} />
        <Slider bind:value={stageProps.weather.particles.spawnArea.height} label="Height" min={1} step={1} />
      </Folder>
    </Folder>
  </Folder>

  <Button
    on:click={() => {
      localStorage.setItem('stageProps', JSON.stringify(stageProps));
      console.log(stageProps);
      alert('Props saved to local storage');
    }}
    title="Save Props"
  />
  <Button
    on:click={() => {
      stageProps = JSON.parse(localStorage.getItem('stageProps') || '{}');
      console.log(stageProps);
      alert('Props loaded from local storage');
    }}
    title="Load Props"
  />
</Pane>

<style>
  .stage-wrapper {
    height: 800px;
    border: 1px solid white;
  }
</style>
