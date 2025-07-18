<script lang="ts">
  import { Button, Folder, List, Pane, Slider } from 'svelte-tweakpane-ui';
  import {
    Stage,
    type StageExports,
    type StageProps,
    DrawMode,
    ToolType,
    MapLayerType,
    type Marker,
    PointerInputManager,
    StageMode
  } from '@tableslayer/ui';
  import { StageDefaultProps } from './defaults';
  import { onMount } from 'svelte';
  import {
    AnnotationsControls,
    DisplayControls,
    EdgeOverlayControls,
    FogControls,
    FogOfWarControls,
    GridControls,
    MapControls,
    MarkerControls,
    PostProcessingControls,
    SceneControls,
    WeatherControls
  } from './components/index';
  let stageProps: StageProps = $state(StageDefaultProps);
  let stage: StageExports | undefined = $state();
  let stageElement: HTMLDivElement | undefined = $state();
  let selectedMarker: Marker | undefined = $state();

  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.0005;

  onMount(() => {
    if (stageElement) {
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
        case 'a':
          stageProps.activeLayer = MapLayerType.Annotation;
          break;
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
        case 'm':
          stageProps.activeLayer = MapLayerType.Marker;
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

  async function onAnnotationUpdate(layerId: string, blob: Promise<Blob>) {
    blob.then((blob) => {
      const layer = stageProps.annotations.layers.find((layer) => layer.id === layerId);
      if (layer) {
        layer.url = URL.createObjectURL(blob);
      }
    });
  }

  async function onFogUpdate() {
    // No-op
  }

  function onStageLoading() {
    console.log('Stage loading');
  }

  function onStageInitialized() {
    console.log('Stage initialized');
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

  function onMarkerAdded(marker: Marker) {
    stageProps.marker.markers = [...stageProps.marker.markers, marker];
    selectedMarker = marker;
  }

  function onMarkerMoved(marker: Marker, position: { x: number; y: number }) {
    const index = stageProps.marker.markers.findIndex((m: Marker) => m.id === marker.id);
    if (index !== -1) {
      stageProps.marker.markers[index] = {
        ...marker,
        position: { x: position.x, y: position.y }
      };
    }
  }

  function onMarkerSelected(marker: Marker) {
    selectedMarker = marker;
  }

  function onMarkerContextMenu(marker: Marker, event: MouseEvent | TouchEvent) {
    if (event instanceof MouseEvent) {
      alert('You clicked on marker: ' + marker.title + ' at ' + event.pageX + ',' + event.pageY);
    } else {
      alert('You clicked on marker: ' + marker.title + ' at ' + event.touches[0].pageX + ',' + event.touches[0].pageY);
    }
  }

  function onMapPan(dx: number, dy: number) {
    stageProps.map.offset.x += dx;
    stageProps.map.offset.y += dy;
  }

  function onMapRotate(angle: number) {
    stageProps.map.rotation = angle;
  }

  function onMapZoom(zoom: number) {
    stageProps.map.zoom = zoom;
  }

  function onScenePan(dx: number, dy: number) {
    stageProps.scene.offset.x += dx;
    stageProps.scene.offset.y += dy;
  }

  function onSceneRotate(angle: number) {
    stageProps.scene.rotation = angle;
  }

  function onSceneZoom(zoom: number) {
    stageProps.scene.zoom = zoom;
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
  <PointerInputManager
    {minZoom}
    {maxZoom}
    {zoomSensitivity}
    {stageElement}
    {stageProps}
    {onMapPan}
    {onMapRotate}
    {onMapZoom}
    {onScenePan}
    {onSceneRotate}
    {onSceneZoom}
  />

  <Stage
    bind:this={stage}
    props={stageProps}
    callbacks={{
      onAnnotationUpdate,
      onFogUpdate,
      onMapUpdate,
      onStageLoading,
      onStageInitialized,
      onSceneUpdate,
      onMarkerAdded,
      onMarkerMoved,
      onMarkerSelected,
      onMarkerContextMenu
    }}
  />
  <div>
    <h1>Keybindings</h1>
    <ul>
      <li>a - Edit Annotations</li>
      <li>e - Erase Fog (Round Brush)</li>
      <li>o - Erase Fog (Ellipse)</li>
      <li>r - Erase Fog (Rectangle)</li>
      <li>E - Draw Fog (Round Brush)</li>
      <li>O - Draw Fog (Ellipse)</li>
      <li>R - Draw Fog (Rectangle)</li>
      <li>f - Clear Fog</li>
      <li>F - Reset Fog</li>
      <li>m - Edit Markers</li>
      <li>SHIFT + Mouse Down - Pan Map</li>
      <li>SHIFT + Wheel - Zoom Map</li>
      <li>CONTROL + Mouse Down - Pan Scene</li>
      <li>CONTROL + Wheel - Zoom Scene</li>
    </ul>
  </div>
</div>

<!-- DEBUG UI -->
<Pane position="draggable" title="Settings">
  <List bind:value={stageProps.mode} label="Mode" options={{ DM: StageMode.DM, Player: StageMode.Player }} />
  <AnnotationsControls bind:props={stageProps} {stage} />
  <DisplayControls bind:props={stageProps} />
  <FogControls bind:props={stageProps} />
  <EdgeOverlayControls bind:props={stageProps} />
  <FogOfWarControls bind:props={stageProps} {stage} />
  <GridControls bind:props={stageProps} />
  <MapControls bind:props={stageProps} {stage} />
  <MarkerControls bind:props={stageProps} bind:selectedMarker />
  <PostProcessingControls bind:props={stageProps} />
  <SceneControls bind:props={stageProps} {stage} />
  <WeatherControls bind:props={stageProps} />

  <Folder title="Debug" expanded={false}>
    <List bind:value={stageProps.debug.enableStats} label="Enable Stats" options={{ Yes: true, No: false }} />
    <Slider bind:value={stageProps.debug.loggingRate} label="Logging Rate" min={0} max={10} step={1} />
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
