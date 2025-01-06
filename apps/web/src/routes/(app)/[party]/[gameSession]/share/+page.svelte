<script lang="ts">
  import { onMount } from 'svelte';
  import { buildSceneProps, initializeStage, setupGameSessionWebSocket } from '$lib/utils';
  import { Stage, type StageExports, type StageProps, Icon } from '@tableslayer/ui';
  import { IconPointerFilled } from '@tabler/icons-svelte';
  import classNames from 'classnames';
  import type { BroadcastStageUpdate } from '$lib/utils';

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
  let stageProps: StageProps = $state(buildSceneProps(data.activeScene));
  let stageIsLoading: boolean = $state(true);
  const fadeOutDelay = 5000;

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

    socket.on('sessionUpdated', (payload: BroadcastStageUpdate) => {
      stageProps = {
        ...stageProps,
        fogOfWar: payload.stageProps.fogOfWar,
        grid: payload.stageProps.grid,
        map: payload.stageProps.map,
        display: payload.stageProps.display,
        ping: payload.stageProps.ping
      };
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
  //  const randomColor = getRandomColor();

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
    }, 1000);

    return () => clearInterval(interval);
  });
</script>

<div class={stageClasses} bind:this={stageElement}>
  <Stage bind:this={stage} props={stageProps} {onSceneUpdate} {onBrushSizeUpdated} {onMapUpdate} {onPingsUpdated} />

  {#each Object.values(cursors) as { user, position, fadedOut }}
    <div
      class="cursor"
      style={`left: ${position.x}px; top: ${position.y}px; transform: translate(-0.75rem, -0.25rem); opacity: ${fadedOut ? 0 : 1}; transition: opacity 0.5s ease;`}
    >
      <Icon Icon={IconPointerFilled} size="1.5rem" stroke={1} />
      <span class="cursor-label" style={`background-color: ${getRandomColor()}`}>{user.email}</span>
    </div>
  {/each}
</div>

<style>
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

  .cursor-pointer {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cursor-icon {
    stroke: black; /* Customize this color if needed */
  }

  .cursor-label {
    font-size: 12px;
    font-weight: 600;
    color: black;
    display: none;
  }
</style>
