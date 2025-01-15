<script lang="ts">
  let { data } = $props();
  import { type Socket } from 'socket.io-client';
  import { Stage, type StageExports, type StageProps, MapLayerType, addToast } from '@tableslayer/ui';
  import { PaneGroup, Pane, PaneResizer, type PaneAPI } from 'paneforge';
  import { SceneControls, SceneSelector, SceneZoom } from '$lib/components';
  import { createUpdateSceneMutation, createUploadFogFromBlobMutation } from '$lib/queries';
  import {
    StageDefaultProps,
    broadcastStageUpdate,
    buildSceneProps,
    handleKeyCommands,
    setupGameSessionWebSocket,
    handleStageZoom,
    hasThumb,
    initializeStage
  } from '$lib/utils';
  import { onMount } from 'svelte';
  import classNames from 'classnames';

  let {
    scenes,
    gameSession,
    selectedSceneNumber,
    selectedScene,
    deleteSceneForm,
    party,
    activeScene,
    setActiveSceneForm
  } = $derived(data);

  let socket: Socket | null = $state(null);
  let stageProps: StageProps = $state(buildSceneProps(data.selectedScene));
  let stageElement: HTMLDivElement | undefined = $state();
  let activeControl = $state('none');
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    socket = setupGameSessionWebSocket(
      gameSession.id,
      () => console.log('Connected to game session socket'),
      () => console.log('Disconnected from game session socket')
    );

    socketUpdate();
    return () => {
      socket?.disconnect();
      if (saveTimer) clearTimeout(saveTimer);
    };
  });

  const socketUpdate = () => {
    broadcastStageUpdate(socket, activeScene, selectedScene, stageProps);
  };

  const updateSceneMutation = createUpdateSceneMutation();
  const createFogMutation = createUploadFogFromBlobMutation();

  const handleSelectActiveControl = (control: string) => {
    if (control === activeControl) {
      activeControl = 'none';
      stageProps.activeLayer = MapLayerType.None;
    } else {
      activeControl = control;
      stageProps.activeLayer = MapLayerType.FogOfWar;
    }
    socketUpdate();
  };

  $effect(() => {
    stageProps = buildSceneProps(data.selectedScene);
    stageIsLoading = true;

    const interval = setInterval(() => {
      if (stage) {
        stageIsLoading = false;
        stage.scene.fit();
        clearInterval(interval);
      }
    }, 50);
  });
  let stage: StageExports;

  let scenesPane: PaneAPI = $state(undefined)!;
  let isScenesCollapsed = $state(false);

  const handleToggleScenes = () => {
    if (isScenesCollapsed) {
      scenesPane.expand();
    } else {
      scenesPane.collapse();
    }
  };

  $effect(() => {
    if (selectedScene && hasThumb(selectedScene) && selectedScene.thumb) {
      stageProps.map.url = `${selectedScene.thumb.resizedUrl}?cors=1`;
    } else {
      stageProps.map.url = StageDefaultProps.map.url;
    }
    if (activeScene) {
      console.log('activeScene', activeScene);
      socketUpdate();
    }
  });

  const onMapUpdate = (offset: { x: number; y: number }, zoom: number) => {
    stageProps.map.offset.x = offset.x;
    stageProps.map.offset.y = offset.y;
    stageProps.map.zoom = zoom;
    socketUpdate();
  };

  const onSceneUpdate = (offset: { x: number; y: number }, zoom: number) => {
    stageProps.scene.offset.x = offset.x;
    stageProps.scene.offset.y = offset.y;
    stageProps.scene.zoom = zoom;
    socketUpdate();
  };

  const onPingsUpdated = (updatedLocations: { x: number; y: number }[]) => {
    stageProps.ping.locations = updatedLocations;
    socketUpdate();
  };

  const onMouseUp = async () => {
    if (stageProps.activeLayer === MapLayerType.FogOfWar) {
      await uploadFog();
      socketUpdate();
    }
  };

  let isThrottled = false;

  const onMouseMove = (e: MouseEvent) => {
    const canvasBounds = stageElement?.getBoundingClientRect(); // Full canvas bounds
    if (!canvasBounds) return;

    const cursorX = e.clientX - canvasBounds.left; // Cursor relative to the canvas bounds
    const cursorY = e.clientY - canvasBounds.top;

    const displayWidth = stageProps.display.resolution.x * stageProps.scene.zoom; // Zoomed width of the rectangle
    const displayHeight = stageProps.display.resolution.y * stageProps.scene.zoom; // Zoomed height of the rectangle

    const horizontalMargin = (canvasBounds.width - displayWidth) / 2;
    const verticalMargin = (canvasBounds.height - displayHeight) / 2;

    const relativeX = cursorX - horizontalMargin;
    const relativeY = cursorY - verticalMargin;

    const clampedX = Math.max(0, Math.min(relativeX, displayWidth));
    const clampedY = Math.max(0, Math.min(relativeY, displayHeight));

    const normalizedX = clampedX / displayWidth;
    const normalizedY = clampedY / displayHeight;

    // Handle panning
    if (e.buttons === 1 || e.buttons === 2) {
      if (e.shiftKey) {
        stageProps.map.offset.x += e.movementX / stageProps.scene.zoom;
        stageProps.map.offset.y -= e.movementY / stageProps.scene.zoom;
      } else if (e.ctrlKey) {
        stageProps.scene.offset.x += e.movementX;
        stageProps.scene.offset.y -= e.movementY;
      }

      // Avoid spamming WebSocket updates
      if (!isThrottled) {
        isThrottled = true;
        requestAnimationFrame(() => {
          socketUpdate(); // Send panning update
          isThrottled = false;
        });
      }
    }

    if (activeScene && activeScene.id === selectedScene.id) {
      socket?.emit('cursorMove', {
        user: data.user,
        normalizedPosition: { x: normalizedX, y: normalizedY },
        zoom: stageProps.scene.zoom,
        offset: stageProps.scene.offset
      });
    }
  };

  const onWheel = (e: WheelEvent) => {
    handleStageZoom(e, stageProps);
    socketUpdate();
  };

  let stageIsLoading = $state(true);
  onMount(() => {
    initializeStage(stage, (isLoading) => {
      stageIsLoading = isLoading;
    });

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
      activeControl = handleKeyCommands(event, stageProps, activeControl, stage);
    });
  });

  let stageClasses = $derived(classNames('stage', { 'stage--loading': stageIsLoading }));

  $effect(() => {
    if ($updateSceneMutation.isPending) {
      addToast({
        data: {
          title: 'Updating scene...',
          type: 'loading'
        }
      });
    }

    if ($updateSceneMutation.isSuccess) {
      addToast({
        data: {
          title: 'Scene updated successfully!',
          type: 'success'
        }
      });
    }

    if ($updateSceneMutation.isError) {
      console.error('error saving scene', $updateSceneMutation.error);
      addToast({
        data: {
          title: 'Error updating scene',
          type: 'danger'
        }
      });
    }
  });

  const uploadFog = async () => {
    const fogBlob = await stage.fogOfWar.toPng();
    const fog = await $createFogMutation.mutateAsync({
      blob: fogBlob,
      sceneId: selectedScene.id
    });

    if (fog) {
      stageProps.fogOfWar.url = `https://files.tableslayer.com/${fog.location}`;
      socketUpdate();
      console.log('Fog uploaded successfully', stageProps.fogOfWar.url);
    }
  };

  const saveScene = async () => {
    console.log('Saving scene...');
    $updateSceneMutation.mutate({
      sceneId: selectedScene.id,
      dbName: gameSession.dbName,
      stageProps
    });
  };

  // Save the scene every 3 seconds based on the stage props
  $effect(() => {
    // Snapshot is needed to track reactivity
    $state.snapshot(stageProps);

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
      saveScene();
    }, 3000);

    return () => {
      if (saveTimer) clearTimeout(saveTimer);
    };
  });
</script>

<div class="container">
  <PaneGroup direction="horizontal">
    <Pane
      defaultSize={15}
      collapsible={true}
      collapsedSize={0}
      minSize={20}
      bind:pane={scenesPane}
      onCollapse={() => (isScenesCollapsed = true)}
      onExpand={() => (isScenesCollapsed = false)}
    >
      <SceneSelector
        {deleteSceneForm}
        {selectedSceneNumber}
        {gameSession}
        {scenes}
        {party}
        {activeScene}
        {setActiveSceneForm}
        createSceneForm={data.createSceneForm}
      />
    </Pane>
    <PaneResizer class="resizer">
      <button
        class="resizer__handle resizer__hander--left"
        aria-label="Collapse scenes column"
        onclick={handleToggleScenes}
      ></button>
    </PaneResizer>
    <Pane defaultSize={70}>
      <div class="stageWrapper" onmouseup={onMouseUp} role="presentation">
        <div class={stageClasses} bind:this={stageElement}>
          <Stage bind:this={stage} props={stageProps} {onMapUpdate} {onSceneUpdate} {onPingsUpdated} />
        </div>
        <SceneControls {stageProps} {handleSelectActiveControl} {activeControl} {socketUpdate} />
        <SceneZoom {socketUpdate} {stageProps} />
      </div>
    </Pane>
  </PaneGroup>
</div>

<style>
  :global {
    .panel.scene {
      aspect-ratio: 16 / 9;
    }
    .stageWrapper {
      display: flex;
      align-items: center;
      background: var(--contrastEmpty);
      height: 100%;
      position: relative;
    }
    .resizer {
      position: relative;
      display: flex;
      width: 0.5rem;
      z-index: 2;
      background: var(--contrastEmpty);
    }
    .resizer__handle {
      width: 100%;
      height: 2rem;
      cursor: col-resize;
      background: var(--contrastMedium);
      margin-top: 1rem;
      cursor: pointer;
    }
    .resizer__handle--left {
      position: relative;
      transform: translateX(-0.25rem);
    }
    .resizer__handle--right {
      position: relative;
      transform: translateX(0.25rem);
    }
    .controls {
      border-left: var(--borderThin);
      background: var(--bg);
    }
  }
  .container {
    height: calc(100vh - 49px);
    user-select: none;
  }
  .stage {
    width: 100%;
    height: 100%;
  }
  .stage--loading {
    visibility: hidden;
  }
</style>
