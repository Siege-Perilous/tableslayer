<script lang="ts">
  let { data } = $props();
  import { type Socket } from 'socket.io-client';
  import { handleMutation } from '$lib/factories';
  import { Stage, type StageExports, type StageProps, MapLayerType } from '@tableslayer/ui';
  import { PaneGroup, Pane, PaneResizer, type PaneAPI } from 'paneforge';
  import { SceneControls, SceneSelector, SceneZoom } from '$lib/components';
  import { useUpdateSceneMutation, useUploadFogFromBlobMutation } from '$lib/queries';
  import { type ZodIssue } from 'zod';
  import { convertPropsToSceneDetails } from '$lib/utils';
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

  let { scenes, gameSession, gameSettings, selectedSceneNumber, selectedScene, party, activeScene } = $derived(data);

  let socket: Socket | null = $state(null);
  let stageProps: StageProps = $state(buildSceneProps(data.selectedScene, 'editor'));
  let stageElement: HTMLDivElement | undefined = $state();
  let activeControl = $state('none');
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let errors = $state<ZodIssue[] | undefined>(undefined);

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
    broadcastStageUpdate(socket, activeScene, selectedScene, stageProps, gameSettings.isPaused);
  };

  const updateSceneMutation = useUpdateSceneMutation();
  const createFogMutation = useUploadFogFromBlobMutation();

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

  const handleSceneFit = () => {
    stage.scene.fit();
  };

  const handleMapFill = () => {
    stage.map.fill();
  };

  const handleMapFit = () => {
    stage.map.fit();
  };

  $effect(() => {
    stageProps = buildSceneProps(data.selectedScene, 'editor');
    stageIsLoading = true;

    const interval = setInterval(() => {
      if (stage) {
        stageIsLoading = false;
        handleSceneFit();
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
      console.log('activeScene', activeScene, 'stageProps', $state.snapshot(stageProps));
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

  let isThrottled = false;

  const onMouseMove = (e: MouseEvent) => {
    const rotation = stageProps.scene.rotation; // Rotation in degrees
    const canvasBounds = stageElement?.getBoundingClientRect(); // Full canvas bounds
    if (!canvasBounds) return;

    const cursorX = e.clientX - canvasBounds.left; // Cursor relative to the canvas bounds
    const cursorY = e.clientY - canvasBounds.top;

    const displayWidth = stageProps.display.resolution.x * stageProps.scene.zoom; // Zoomed width of the rectangle
    const displayHeight = stageProps.display.resolution.y * stageProps.scene.zoom; // Zoomed height of the rectangle

    const rotatedWidth = rotation % 180 === 0 ? displayWidth : displayHeight;
    const rotatedHeight = rotation % 180 === 0 ? displayHeight : displayWidth;

    const horizontalMargin = (canvasBounds.width - rotatedWidth) / 2;
    const verticalMargin = (canvasBounds.height - rotatedHeight) / 2;

    const relativeX = cursorX - horizontalMargin;
    const relativeY = cursorY - verticalMargin;

    // Clamp to ensure cursor stays within visible bounds after rotation
    const clampedX = Math.max(0, Math.min(relativeX, rotatedWidth));
    const clampedY = Math.max(0, Math.min(relativeY, rotatedHeight));

    // Normalize clamped coordinates to range [0, 1]
    const normalizedX = clampedX / rotatedWidth;
    const normalizedY = clampedY / rotatedHeight;

    // Rotate the normalized coordinates to account for the scene's rotation
    const rotatePoint = (x: number, y: number, angle: number): { x: number; y: number } => {
      const radians = (Math.PI / 180) * angle;
      return {
        x: x * Math.cos(radians) - y * Math.sin(radians),
        y: x * Math.sin(radians) + y * Math.cos(radians)
      };
    };

    // Rotate around the center (0.5, 0.5) of the normalized coordinate space
    const rotated = rotatePoint(normalizedX - 0.5, normalizedY - 0.5, -rotation);

    // Adjust back to [0, 1] normalized space
    const finalNormalizedX = rotated.x + 0.5;
    const finalNormalizedY = rotated.y + 0.5;

    // Handle panning (existing logic)
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

    // Emit the normalized and rotated position over the WebSocket
    if (activeScene && activeScene.id === selectedScene.id) {
      socket?.emit('cursorMove', {
        user: data.user,
        normalizedPosition: { x: finalNormalizedX, y: finalNormalizedY },
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

      stageElement.addEventListener('keydown', (event) => {
        activeControl = handleKeyCommands(event, stageProps, activeControl, stage);
      });
      // Add tabindex so event listener can be triggered
      stageElement.setAttribute('tabindex', '0');
    }
  });

  let stageClasses = $derived(['stage', stageIsLoading && 'stage--loading']);

  const onFogUpdate = async (blob: Promise<Blob>) => {
    const fogBlob = await blob;

    await handleMutation({
      mutation: () =>
        $createFogMutation.mutateAsync({
          blob: fogBlob,
          sceneId: selectedScene.id
        }),
      formLoadingState: () => console.log('fog is uploading'),
      onSuccess: (fog) => {
        stageProps.fogOfWar.url = `https://files.tableslayer.com/${fog.location}?${Date.now()}`;
        socketUpdate();
        console.log('Fog uploaded successfully', stageProps.fogOfWar.url);
      },
      toastMessages: {
        error: { title: 'Error uploading fog', body: (err) => err.message || 'Unknown error' }
      }
    });
  };

  let lastSavedData = '';
  let dirtyData = '';
  const updateDirtyData = () => {
    dirtyData = JSON.stringify(convertPropsToSceneDetails(stageProps));
  };

  const saveScene = async () => {
    if (dirtyData === lastSavedData) return;

    await handleMutation({
      mutation: () =>
        $updateSceneMutation.mutateAsync({
          sceneId: selectedScene.id,
          dbName: gameSession.dbName,
          partyId: party.id,
          sceneData: JSON.parse(dirtyData)
        }),
      formLoadingState: () => console.log('stage is loading'),
      onError: (error) => {
        console.log('Error saving scene:', error);
      },
      onSuccess: () => {
        lastSavedData = dirtyData;
      },
      toastMessages: {
        success: { title: 'Scene saved!' },
        error: { title: 'Error saving scene', body: (err) => err.message || 'Error saving scene' }
      }
    });
  };

  // This effect will run whenever `stageProps` changes.
  $effect(() => {
    // Recompute the “dirty” data from stageProps
    updateDirtyData();

    if (dirtyData !== lastSavedData) {
      if (saveTimer) clearTimeout(saveTimer);

      saveTimer = setTimeout(() => {
        saveScene();
      }, 3000);
    }

    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  });
</script>

<div class="container">
  <PaneGroup direction="horizontal">
    <Pane
      defaultSize={15}
      collapsible={true}
      collapsedSize={0}
      minSize={10}
      maxSize={30}
      bind:pane={scenesPane}
      onCollapse={() => (isScenesCollapsed = true)}
      onExpand={() => (isScenesCollapsed = false)}
    >
      <SceneSelector {selectedSceneNumber} {gameSession} {scenes} {party} {activeScene} />
    </Pane>
    <PaneResizer class="resizer">
      <button
        class="resizer__handle resizer__hander--left"
        aria-label="Collapse scenes column"
        title={isScenesCollapsed ? 'Expand scenes column' : 'Collapse scenes column'}
        onclick={handleToggleScenes}
      ></button>
    </PaneResizer>
    <Pane defaultSize={70}>
      <div class="stageWrapper" role="presentation">
        <div class={stageClasses} bind:this={stageElement}>
          <Stage bind:this={stage} props={stageProps} {onFogUpdate} {onMapUpdate} {onSceneUpdate} {onPingsUpdated} />
        </div>
        <SceneControls
          bind:stageProps
          {handleMapFill}
          {handleMapFit}
          {handleSceneFit}
          {selectedScene}
          {activeScene}
          {handleSelectActiveControl}
          {activeControl}
          {socketUpdate}
          {party}
          {gameSession}
          {gameSettings}
          {errors}
        />
        <SceneZoom {socketUpdate} {handleSceneFit} {handleMapFill} bind:stageProps />
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
      transition: background 0.2s;
    }
    .resizer:hover .resizer__handle {
      background: var(--fg);
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
