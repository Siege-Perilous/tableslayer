<script lang="ts">
  import { io } from 'socket.io-client';
  import slugify from 'slugify';
  import { onMount } from 'svelte';
  import { buildSceneProps, initializeStage } from '$lib/utils';
  import { Stage, type StageExports, type StageProps } from '@tableslayer/ui';
  import classNames from 'classnames';

  type CursorData = {
    position: { x: number; y: number };
    user: { id: string; email: string };
  };

  let cursors: Record<string, CursorData> = $state({});

  let { data } = $props();
  const { user } = $derived(data);
  const sanitizedId = slugify(data.gameSession.id, { lower: true, strict: true, replacement: '' });

  let stage: StageExports;
  let stageElement: HTMLDivElement | undefined = $state();
  let stageProps: StageProps = $state(buildSceneProps(data.activeScene));
  let stageIsLoading = $state(true);

  onMount(() => {
    initializeStage(stage, (isLoading) => {
      stageIsLoading = isLoading;
    });
    const socket = io(`ws${location.origin.slice(4)}/gameSession/${sanitizedId}`, {
      reconnectionDelayMax: 10000
    });

    // Emit cursor position on mouse movement
    const handleMouseMove = (event: MouseEvent) => {
      const position = { x: event.clientX, y: event.clientY };
      socket.emit('cursorMove', { user, position });
    };

    socket.on('sessionUpdated', (data) => {
      if (data.sceneId === data.activeSceneId) {
        console.log('Updating stage props', data.stageProps);
        // Update stage props while preserving local state

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

    // Listen for cursor updates from other users
    socket.on('cursorUpdate', (data) => {
      cursors = { ...cursors, [data.user.id]: data };
    });

    // Remove the cursor when a user disconnects
    socket.on('userDisconnect', (userId) => {
      const updatedCursors = { ...cursors };
      delete updatedCursors[userId];
      cursors = updatedCursors;
    });

    socket.on('connect', () => {
      console.log(`Connected to gameSession ${sanitizedId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Disconnected from gameSession ${sanitizedId}`);
      cursors = {};
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
</div>
{#each Object.values(cursors) as { user, position }}
  <div
    class="cursor"
    style={`left: ${position.x}px; top: ${position.y}px; transform: translate(-50%, -50%); background-color: ${randomColor}`}
  >
    {user.email}
  </div>
{/each}

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
