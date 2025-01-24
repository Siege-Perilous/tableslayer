<script lang="ts">
  import { onMount } from 'svelte';
  import { buildSceneProps, initializeStage, setupGameSessionWebSocket, getRandomFantasyQuote } from '$lib/utils';
  import { Stage, Text, Title, type StageExports, type StageProps } from '@tableslayer/ui';
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
  let editorSceneRotation = $state(data.activeScene.sceneRotation);
  let stageProps: StageProps = $state(buildSceneProps(data.activeScene, 'client'));
  let stageIsLoading: boolean = $state(true);
  let gameIsPaused = $state(data.gameSettings.isPaused);
  let randomFantasyQuote = $state(getRandomFantasyQuote());
  const fadeOutDelay = 5000;

  const handleResize = () => {
    if (stage) {
      stage.scene.fit();
    }
  };

  onMount(() => {
    initializeStage(stage, (isLoading: boolean) => {
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
      gameIsPaused = payload.gameIsPaused;
      editorSceneRotation = payload.stageProps.scene.rotation;
      stageProps = {
        ...stageProps,
        fogOfWar: payload.stageProps.fogOfWar,
        grid: payload.stageProps.grid,
        map: payload.stageProps.map,
        display: payload.stageProps.display,
        ping: payload.stageProps.ping
      };

      handleResize();
    });

    $effect(() => {
      if (gameIsPaused) {
        randomFantasyQuote = getRandomFantasyQuote();
      }
    });

    $inspect(editorSceneRotation);
    $inspect(stageProps);

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

  let stageClasses = $derived(['stage', stageIsLoading && 'stage--loading', gameIsPaused && 'stage--hidden']);

  $effect(() => {
    stageIsLoading = true;

    const interval = setInterval(() => {
      if (stage) {
        stageIsLoading = false;
        handleResize();
        clearInterval(interval);
      }
    }, 50);
  });

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

<svelte:window onresize={handleResize} />

{#if gameIsPaused}
  <div class="paused">
    <div>
      <Title as="h1" size="lg" class="heroTitle">Table Slayer</Title>
      <Text size="1.5rem" color="var(--fgPrimary)">Game is paused</Text>
    </div>
    <div class="quote">
      <Text size="1.5rem">{randomFantasyQuote.quote}</Text>
      <Text color="var(--fgMuted)">— {randomFantasyQuote.author}, <span>{randomFantasyQuote.source}</span></Text>
    </div>
  </div>
{/if}
<div class={stageClasses} bind:this={stageElement}>
  <Stage bind:this={stage} props={stageProps} {onFogUpdate} {onSceneUpdate} {onMapUpdate} {onPingsUpdated} />

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
    width: 100vw;
    height: 100vh;
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
    background: red;
    z-index: 1;
  }
  .stage--loading {
    visibility: hidden;
  }
  .stage--hidden {
    display: none;
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
