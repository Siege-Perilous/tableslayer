<script lang="ts">
  import { onMount } from 'svelte';
  import { buildSceneProps, initializeStage, setupGameSessionWebSocket } from '$lib/utils';
  import { Stage, type StageExports, type StageProps } from '@tableslayer/ui';
  import classNames from 'classnames';

  type CursorData = {
    position: { x: number; y: number };
    user: { id: string; email: string };
  };

  let cursors: Record<string, CursorData> = $state({});

  let { data } = $props();
  const { user } = $derived(data);

  let stage: StageExports;
  let stageElement: HTMLDivElement | undefined = $state();
  let stageProps: StageProps = $state(buildSceneProps(data.activeScene));
  let stageIsLoading: boolean = $state(true);

  onMount(() => {
    initializeStage(stage, (isLoading) => {
      stageIsLoading = isLoading;
    });
    const socket = setupGameSessionWebSocket(
      data.gameSession.id,
      () => console.log('Connected to game session socket'),
      () => console.log('Disconnected from game session socket')
    );

    const handleMouseMove = (event: MouseEvent) => {
      const position = { x: event.clientX, y: event.clientY };
      socket.emit('cursorMove', { user, position });
    };

    socket.on('sessionUpdated', (data) => {
      if (data.sceneId === data.activeSceneId) {
        console.log('Updating stage props', data.stageProps);

        stageProps = {
          ...stageProps,
          fogOfWar: data.stageProps.fogOfWar,
          grid: data.stageProps.grid,
          map: data.stageProps.map,
          display: data.stageProps.display,
          ping: data.stageProps.ping
        };
      }
    });

    socket.on('cursorUpdate', (data) => {
      const { normalizedPosition, user, zoom: editorZoom } = data;

      const stageBounds = stageElement?.getBoundingClientRect();
      if (!stageBounds) return;

      const stageWidth = stageBounds.width;
      const stageHeight = stageBounds.height;

      const clientZoom = stageProps.scene.zoom;

      const displayWidthClient = stageProps.display.resolution.x * clientZoom;
      const displayHeightClient = stageProps.display.resolution.y * clientZoom;

      const displayWidthEditor = stageProps.display.resolution.x * editorZoom;
      const displayHeightEditor = stageProps.display.resolution.y * editorZoom;

      // Margins to center the client rectangle
      const horizontalMargin = (stageWidth - displayWidthClient) / 2;
      const verticalMargin = (stageHeight - displayHeightClient) / 2;

      // Adjust the normalized position based on the editor's rectangle size
      const rectX = normalizedPosition.x * displayWidthEditor; // Editor space position
      const rectY = normalizedPosition.y * displayHeightEditor; // Editor space position

      // Convert to the client rectangle, scaling by the ratio of editor-to-client rectangle size
      const adjustedX = rectX * (displayWidthClient / displayWidthEditor);
      const adjustedY = rectY * (displayHeightClient / displayHeightEditor);

      const absoluteXClient = horizontalMargin + adjustedX;
      const absoluteYClient = verticalMargin + adjustedY;

      console.log('Client Adjusted Position:', { absoluteXClient, absoluteYClient });

      cursors = {
        ...cursors,
        [user.id]: { user, position: { x: absoluteXClient, y: absoluteYClient } }
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
  const randomColor = getRandomColor();

  let stageClasses = $derived(classNames('stage', { 'stage--loading': stageIsLoading }));

  $effect(() => {
    stageIsLoading = true;

    const interval = setInterval(() => {
      if (stage) {
        stageIsLoading = false;
        stage.scene.fit();
        clearInterval(interval);
      }
    }, 50);
  });

  function onSceneUpdate(offset: { x: number; y: number }, zoom: number) {
    stageProps.scene.zoom = zoom;
  }

  function onBrushSizeUpdated() {
    return;
  }

  function onMapUpdate(offset: { x: number; y: number }, zoom: number) {
    console.log('Updating map', offset, zoom);
    return;
  }
  function onPingsUpdated(updatedLocations: { x: number; y: number }[]) {
    stageProps.ping.locations = updatedLocations;
  }
</script>

<div class={stageClasses} bind:this={stageElement}>
  <Stage bind:this={stage} props={stageProps} {onSceneUpdate} {onBrushSizeUpdated} {onMapUpdate} {onPingsUpdated} />

  {#each Object.values(cursors) as { user, position }}
    <div
      class="cursor"
      style={`left: ${position.x}px; top: ${position.y}px; transform: translate(-50%, -50%); background-color: ${randomColor}`}
    >
      {user.email}
    </div>
  {/each}
</div>

<style>
  .cursor {
    position: fixed;
    width: 100px;
    height: 2rem;
    line-height: 2rem;
    pointer-events: none;
    background: red;
    color: black;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 12px;
    z-index: 2;
  }
  .stage {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .stage--loading {
    visibility: hidden;
  }
</style>
