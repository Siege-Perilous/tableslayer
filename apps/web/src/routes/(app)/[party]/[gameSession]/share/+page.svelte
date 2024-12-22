<script lang="ts">
  import { io } from 'socket.io-client';
  import slugify from 'slugify';
  import { onMount } from 'svelte';
  import { buildSceneProps } from '$lib/utils/buildSceneProps.js';
  import { Stage, type StageExports, type StageProps } from '@tableslayer/ui';
  import classNames from 'classnames';

  let { data } = $props();
  const { user, activeScene } = $derived(data);
  const sanitizedId = slugify(data.gameSession.id, { lower: true, strict: true, replacement: '' });
  console.log('activeScene', activeScene);

  $effect(() => {
    if (activeScene) {
      stageProps = buildSceneProps(activeScene);
    }
  });

  let stage: StageExports;
  let stageElement: HTMLDivElement | undefined = $state();
  let stageProps: StageProps = $state(buildSceneProps(data.activeScene));
  let stageIsLoading = $state(true);

  $inspect(stageProps);

  let cursors = $state({}); // Track cursor positions of all users

  onMount(() => {
    const interval = setInterval(() => {
      if (stage) {
        stageIsLoading = false;
        stage.scene.fit();
        clearInterval(interval);
      }
    }, 50);
    const socket = io(`ws${location.origin.slice(4)}/gameSession/${sanitizedId}`, {
      reconnectionDelayMax: 10000
    });

    // Emit cursor position on mouse movement
    const handleMouseMove = (event: MouseEvent) => {
      const position = { x: event.clientX, y: event.clientY };
      socket.emit('cursorMove', { user, position });
    };

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

  const updateStage = (newProps: Partial<StageProps>) => {
    Object.assign(stageProps, newProps);
  };

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
    if (!stageProps) {
      return;
    }
    stageProps.ping.locations = updatedLocations;
  }

  let stageClasses = $derived(classNames('stage', { 'stage--loading': stageIsLoading }));
</script>

<div class={stageClasses} bind:this={stageElement}>
  <Stage bind:this={stage} props={stageProps} {onBrushSizeUpdated} {onMapUpdate} {onSceneUpdate} {onPingsUpdated} />
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
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    top: 0;
    left: 0;
  }
  .stage--loading {
    visibility: hidden;
  }
</style>
