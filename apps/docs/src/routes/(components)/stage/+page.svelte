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
    StageMode
  } from '@tableslayer/ui';
  import { StageDefaultProps } from './defaults';
  import { onMount } from 'svelte';
  import {
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
  import StageInputHandler from './components/StageInputHandler.svelte';

  let stageProps: StageProps = $state(StageDefaultProps);
  let stage: StageExports | undefined = $state();
  let stageElement: HTMLDivElement | undefined = $state();
  let selectedMarker: Marker | undefined = $state();

  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.0005;

  function onFogUpdate() {
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
</script>

<div bind:this={stageElement} class="stage-wrapper">
  <StageInputHandler bind:props={stageProps} element={stageElement}>
    <Stage
      bind:this={stage}
      props={stageProps}
      {onFogUpdate}
      {onMapUpdate}
      {onStageLoading}
      {onStageInitialized}
      {onSceneUpdate}
      {onMarkerAdded}
      {onMarkerMoved}
      {onMarkerSelected}
      {onMarkerContextMenu}
    />
  </StageInputHandler>
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
