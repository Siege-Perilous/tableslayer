<script lang="ts">
  import { onMount } from 'svelte';
  import { buildSceneProps, setupGameSessionWebSocket, getRandomFantasyQuote } from '$lib/utils';
  import { MapLayerType, Stage, Text, Title, type StageExports, type StageProps, type Marker } from '@tableslayer/ui';
  import type { BroadcastStageUpdate, MarkerPositionUpdate } from '$lib/utils';
  import { Head } from '$lib/components';

  type CursorData = {
    position: { x: number; y: number };
    user: { id: string; email: string };
    lastMoveTime: number;
    fadedOut: boolean;
  };

  let cursors: Record<string, CursorData> = $state({});

  let { data } = $props();
  const { user } = $derived(data);

  let stage: StageExports;
  let stageElement: HTMLDivElement | undefined = $state();
  let stageProps: StageProps = $state(buildSceneProps(data.activeScene, data.activeSceneMarkers, 'client'));
  let selectedMarker: Marker | undefined = $state();
  let stageIsLoading: boolean = $state(true);
  let gameIsPaused = $state(data.gameSession.isPaused);
  let randomFantasyQuote = $state(getRandomFantasyQuote());
  let stageClasses = $derived(['stage', stageIsLoading && 'stage--loading', gameIsPaused && 'stage--hidden']);
  const fadeOutDelay = 5000;

  // Handler for optimized marker updates
  const handleMarkerUpdate = (markerUpdate: MarkerPositionUpdate) => {
    // Only update if the marker belongs to the current scene
    if (markerUpdate.sceneId === data.activeScene?.id) {
      const index = stageProps.marker.markers.findIndex((m) => m.id === markerUpdate.markerId);
      if (index !== -1) {
        // Update only the position property of the marker
        stageProps.marker.markers[index] = {
          ...stageProps.marker.markers[index],
          position: markerUpdate.position
        };
      }
    }
  };

  onMount(() => {
    const socket = setupGameSessionWebSocket(
      data.gameSession.id,
      () => console.log('Connected to game session socket'),
      () => console.log('Disconnected from game session socket'),
      handleMarkerUpdate,
      stageProps
    );

    const handleMouseMove = (event: MouseEvent) => {
      const position = { x: event.clientX, y: event.clientY };
      socket.emit('cursorMove', { user, position });
    };

    socket.on('sessionUpdated', (payload: BroadcastStageUpdate) => {
      gameIsPaused = payload.gameIsPaused;

      stageProps = {
        ...stageProps,
        // Override stage props with the updated props from the websocket
        ...payload.stageProps,
        // Don't allow rotate and zoom from the editor
        scene: { ...stageProps.scene },
        // Don't allow erase mode
        activeLayer: MapLayerType.None,
        // Mode 1 is for player view
        mode: 1
      };
    });

    $effect(() => {
      if (gameIsPaused) {
        randomFantasyQuote = getRandomFantasyQuote();
      }
    });

    socket.on('cursorUpdate', (payload) => {
      const { normalizedPosition, user, zoom: editorZoom } = payload;

      const stageBounds = stageElement?.getBoundingClientRect();
      if (!stageBounds) return;

      const stageWidth = stageBounds.width;
      const stageHeight = stageBounds.height;

      const clientZoom = stageProps.scene.zoom;

      const displayWidthClient = stageProps.display.resolution.x * clientZoom;
      const displayHeightClient = stageProps.display.resolution.y * clientZoom;

      const displayWidthEditor = stageProps.display.resolution.x * editorZoom;
      const displayHeightEditor = stageProps.display.resolution.y * editorZoom;

      const horizontalMargin = (stageWidth - displayWidthClient) / 2;
      const verticalMargin = (stageHeight - displayHeightClient) / 2;

      const rectX = normalizedPosition.x * displayWidthEditor;
      const rectY = normalizedPosition.y * displayHeightEditor;

      const adjustedX = rectX * (displayWidthClient / displayWidthEditor);
      const adjustedY = rectY * (displayHeightClient / displayHeightEditor);

      const absoluteXClient = horizontalMargin + adjustedX;
      const absoluteYClient = verticalMargin + adjustedY;

      cursors = {
        ...cursors,
        [user.id]: {
          user,
          position: { x: absoluteXClient, y: absoluteYClient },
          lastMoveTime: Date.now(),
          fadedOut: false
        }
      };
    });

    // Remove the cursor when a user disconnects
    socket.on('userDisconnect', (userId) => {
      const updatedCursors = { ...cursors };
      delete updatedCursors[userId];
      cursors = updatedCursors;
    });

    // Add mousemove event listener
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      socket.disconnect();
    };
  });

  const getRandomColor = (): string => {
    return `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')}`;
  };

  function onSceneUpdate(offset: { x: number; y: number }, zoom: number) {
    stageProps.scene.zoom = zoom;
  }

  function onFogUpdate(blob: Promise<Blob>) {
    console.log('Updating fog', blob);
    return;
  }

  function onMapUpdate(offset: { x: number; y: number }, zoom: number) {
    console.log('Updating map', offset, zoom);
    return;
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

  const onMarkerSelected = (marker: Marker) => {
    selectedMarker = marker;
  };

  function onStageLoading() {
    console.log('Stage loading');
    stageIsLoading = true;
  }

  function onStageInitialized() {
    console.log('Stage initialized');
    stageIsLoading = false;
  }

  function onMarkerContextMenu(marker: Marker, event: MouseEvent | TouchEvent) {
    if (event instanceof MouseEvent) {
      alert('You clicked on marker: ' + marker.title + ' at ' + event.pageX + ',' + event.pageY);
    } else {
      alert('You clicked on marker: ' + marker.title + ' at ' + event.touches[0].pageX + ',' + event.touches[0].pageY);
    }
  }

  $effect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [userId, cursor] of Object.entries(cursors)) {
        if (!cursor.fadedOut && now - cursor.lastMoveTime > fadeOutDelay) {
          // Mark the cursor as faded out after inactivity
          cursors = {
            ...cursors,
            [userId]: { ...cursor, fadedOut: true }
          };
        }
      }
    }, 250);

    return () => clearInterval(interval);
  });
</script>

<Head title={data.gameSession.name} description={`${data.gameSession.name} on Table Slayer`} />

{#if selectedMarker}
  <span style="display: none;">
    {selectedMarker.title} - {selectedMarker.id}
  </span>
{/if}

{#if gameIsPaused}
  <div class="paused">
    <div>
      <Title as="h1" size="lg" class="heroTitle">Table Slayer</Title>
      <Text size="1.5rem" color="var(--fgPrimary)">Game is paused</Text>
    </div>
    <div class="quote">
      <Text size="1.5rem">{randomFantasyQuote.quote}</Text>
      <Text color="var(--fgMuted)">
        — {randomFantasyQuote.author},
        <span>{randomFantasyQuote.source}</span>
      </Text>
    </div>
  </div>
{/if}
<div class={stageClasses} bind:this={stageElement}>
  <Stage
    bind:this={stage}
    props={stageProps}
    {onFogUpdate}
    {onSceneUpdate}
    {onStageLoading}
    {onStageInitialized}
    {onMapUpdate}
    {onMarkerAdded}
    {onMarkerMoved}
    {onMarkerSelected}
    {onMarkerContextMenu}
  />

  {#each Object.values(cursors) as { user, position, fadedOut }}
    <div
      class="cursor"
      style={`left: ${position.x}px; top: ${position.y}px; transform: translate(-0.75rem, -0.25rem); opacity: ${fadedOut ? 0 : 1}; transition: opacity 0.5s ease;`}
    >
      <div class="cursor__pointer"></div>
      <span class="cursor__label" style={`background-color: ${getRandomColor()}`}>{user.email}</span>
    </div>
  {/each}
</div>

<style>
  .paused {
    display: flex;
    gap: 4rem;
    width: 100dvw;
    height: 100dvh;
    align-items: center;
    justify-content: center;
  }
  .quote {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: var(--contain-mobile);
    font-family: var(--font-mono);
    border-left: var(--borderThin);
    padding-left: 4rem;
  }
  .quote span {
    font-style: italic;
  }
  .stage {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: black;
    z-index: 1;
    opacity: 1;
    visibility: visible;
    transition: opacity 0.25s ease-in;
  }
  .stage.stage--loading {
    opacity: 0 !important;
    visibility: hidden !important;
  }
  .stage.stage--hidden {
    display: none;
    visibility: hidden;
    opacity: 0;
  }
  .cursor {
    position: fixed;
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    z-index: 10;
    font-size: 12px;
  }

  .cursor__pointer {
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    border: solid 0.25rem white;
    background-color: black;
  }

  .cursor__label {
    font-size: 12px;
    font-weight: 600;
    color: black;
    display: none;
  }
</style>
