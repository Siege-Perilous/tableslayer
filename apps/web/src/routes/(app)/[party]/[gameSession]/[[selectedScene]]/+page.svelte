<script lang="ts">
  let { data } = $props();
  import { type Socket } from 'socket.io-client';
  import { handleMutation } from '$lib/factories';
  import { Stage, type StageExports, type StageProps, MapLayerType, Icon, type Marker } from '@tableslayer/ui';
  import { PaneGroup, Pane, PaneResizer, type PaneAPI } from 'paneforge';
  import { MarkerManager, Hints, SceneControls, Shortcuts, SceneSelector, SceneZoom, Head } from '$lib/components';
  import {
    useUpdateSceneMutation,
    useUpdateGameSessionMutation,
    useUploadFogFromBlobMutation,
    useCreateMarkerMutation,
    useUpdateMarkerMutation
  } from '$lib/queries';
  import { type ZodIssue } from 'zod';
  import { IconChevronDown, IconChevronUp, IconChevronLeft, IconChevronRight } from '@tabler/icons-svelte';
  import { navigating } from '$app/state';
  import {
    StageDefaultProps,
    broadcastStageUpdate,
    broadcastMarkerUpdate,
    buildSceneProps,
    handleKeyCommands,
    setupGameSessionWebSocket,
    handleStageZoom,
    hasThumb,
    convertPropsToSceneDetails,
    convertStageMarkersToDbFormat,
    throttle,
    type MarkerPositionUpdate
  } from '$lib/utils';
  import { onMount } from 'svelte';

  let { scenes, gameSession, selectedSceneNumber, selectedScene, party, activeScene, activeSceneMarkers } =
    $derived(data);

  let socket: Socket | null = $state(null);
  let stageProps: StageProps = $state(buildSceneProps(data.selectedScene, data.selectedSceneMarkers, 'editor'));
  let selectedMarkerId: string | undefined = $state();
  let knownMarkerIds = $state<string[]>(data.selectedSceneMarkers?.map((marker) => marker.id) || []);
  let stageElement: HTMLDivElement | undefined = $state();
  let activeControl = $state('none');
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let errors = $state<ZodIssue[] | undefined>(undefined);
  let stageIsLoading = $state(true);
  let stageClasses = $derived(['stage', (stageIsLoading || navigating.to) && 'stage--loading']);
  let stage: StageExports = $state(null)!;
  let scenesPane: PaneAPI = $state(undefined)!;
  let markersPane: PaneAPI = $state(undefined)!;
  let isScenesCollapsed = $state(false);
  let isMarkersCollapsed = $state(true);
  let fogBlobUpdateTime: Date | null = $state(null);
  let activeElement: HTMLElement | null = $state(null);
  let innerWidth: number = $state(1000);
  const isMobile = $derived(innerWidth < 768);

  const updateSceneMutation = useUpdateSceneMutation();
  const updateGameSessionMutation = useUpdateGameSessionMutation();
  const createFogMutation = useUploadFogFromBlobMutation();
  const createMarkerMutation = useCreateMarkerMutation();
  const updateMarkerMutation = useUpdateMarkerMutation();

  const getCollapseIcon = () => {
    if (isMobile) {
      return isScenesCollapsed ? IconChevronDown : IconChevronUp;
    } else {
      return isScenesCollapsed ? IconChevronRight : IconChevronLeft;
    }
  };

  const getMarkerCollapseIcon = () => {
    if (isMobile) {
      return isMarkersCollapsed ? IconChevronDown : IconChevronUp;
    } else {
      return isMarkersCollapsed ? IconChevronLeft : IconChevronRight;
    }
  };

  /**
   * SOCKET UPDATES
   * SOCKET UPDATES
   * SOCKET UPDATES
   *
   * Sends the ACTIVE SCENE props across the WebSocket.
   * If the ACTIVE SCENE is also the SELECTED SCENE, it will send the SELECTED SCENE state.
   *
   * This is passed down to child components and manually called
   */
  const socketUpdate = () => {
    broadcastStageUpdate(socket, activeScene, selectedScene, stageProps, activeSceneMarkers, gameSession.isPaused);
  };

  /**
   * KEYBOARD HANDLER
   * KEYBOARD HANDLER
   * KEYBOARD HANDLER
   *
   * This handles keyboard shortcuts for the stage.
   * It checks if the user is typing in a form, and if not, it handles the key commands.
   */
  const handleKeydown = (event: KeyboardEvent) => {
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable)
    ) {
      return; // Ignore key events while typing
    }

    activeControl = handleKeyCommands(event, stageProps, activeControl, stage);
  };

  /**
   * ON MOUNT
   * ON MOUNT
   * ON MOUNT
   *
   * - Set up the WebSocket connection
   * - Initialize the stage
   * - Send initial broadcast to the WebSocket
   */
  // Handler for optimized marker updates
  const handleMarkerUpdate = (markerUpdate: MarkerPositionUpdate, props: StageProps) => {
    // Only handle updates for the current scene
    if (selectedScene && selectedScene.id === markerUpdate.sceneId) {
      const index = props.marker.markers.findIndex((m) => m.id === markerUpdate.markerId);
      if (index !== -1) {
        // Update the marker position without rebuilding the entire state
        props.marker.markers[index] = {
          ...props.marker.markers[index],
          position: markerUpdate.position
        };
      }
    }
  };

  onMount(() => {
    socket = setupGameSessionWebSocket(
      gameSession.id,
      () => console.log('Connected to game session socket'),
      () => console.log('Disconnected from game session socket'),
      handleMarkerUpdate, // Pass marker update handler
      stageProps // Pass stageProps for the handler to access
    );

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

    socketUpdate();

    return () => {
      socket?.disconnect();
      if (saveTimer) clearTimeout(saveTimer);
    };
  });

  // This toggles the scene selector pane
  const handleToggleScenes = () => {
    if (isScenesCollapsed) {
      scenesPane.expand();
    } else {
      scenesPane.collapse();
    }
  };

  const handleToggleMarkers = () => {
    if (isMarkersCollapsed) {
      markersPane.expand();
    } else {
      markersPane.collapse();
    }
  };

  const handleSelectActiveControl = (control: string) => {
    if (control === activeControl) {
      activeControl = 'none';
      stageProps.activeLayer = MapLayerType.None;
    } else if (control === 'marker') {
      selectedMarkerId = undefined;
      activeControl = 'marker';
      stageProps.activeLayer = MapLayerType.Marker;
      markersPane.expand();
      setTimeout(() => {
        if (stage) {
          stage.scene.fit();
        }
      }, 50);
    } else {
      activeControl = control;
      stageProps.activeLayer = MapLayerType.FogOfWar;
    }
    socketUpdate();
  };

  // We use these functions often in child components, so we define them here
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
    stageProps = buildSceneProps(data.selectedScene, data.selectedSceneMarkers, 'editor');

    // Clear any existing interval to prevent conflicts
    const interval = setInterval(() => {
      if (stage && !stageIsLoading) {
        clearInterval(interval);
      }
    }, 50);
  });

  $effect(() => {
    if (selectedScene && hasThumb(selectedScene) && selectedScene.thumb) {
      stageProps.map.url = `${selectedScene.thumb.resizedUrl}?cors=1`;
    } else {
      stageProps.map.url = StageDefaultProps.map.url;
    }
    if (activeScene) {
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

  const onStageLoading = () => {
    stageIsLoading = true;
  };

  const onStageInitialized = () => {
    stageIsLoading = false;
  };

  const onMarkerAdded = (marker: Marker) => {
    stageProps.marker.markers = [...stageProps.marker.markers, marker];
    selectedMarkerId = marker.id;
  };

  const onMarkerMoved = (marker: Marker, position: { x: number; y: number }) => {
    const index = stageProps.marker.markers.findIndex((m: Marker) => m.id === marker.id);
    if (index !== -1) {
      stageProps.marker.markers[index] = {
        ...marker,
        position: { x: position.x, y: position.y }
      };

      // Use the optimized marker update for position changes
      if (socket && selectedScene && selectedScene.id) {
        broadcastMarkerUpdate(socket, marker.id, position, selectedScene.id);
      }
    }
  };

  const onMarkerSelected = (marker: Marker) => {
    selectedMarkerId = marker.id;
  };

  const onMarkerContextMenu = (marker: Marker, event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      alert('You clicked on marker: ' + marker.title + ' at ' + event.pageX + ',' + event.pageY);
    } else {
      alert('You clicked on marker: ' + marker.title + ' at ' + event.touches[0].pageX + ',' + event.touches[0].pageY);
    }
  };

  /**
   * CURSOR TRACKING
   * CURSOR TRACKING
   * CURSOR TRACKING
   *
   * The cursor needs to be tracked so that the editor can call out positioning in the player view.
   * This requires normalizing the cursor position, because the stage can be rotated and zoomed.
   * Also the player view browser size can be different from the editor view.
   */
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

      // Use our proper throttled update (replaces manual throttling)
      throttledSocketUpdate();
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

  // Use throttling for wheel/zoom events to reduce update frequency
  const throttledSocketUpdate = throttle(socketUpdate, 200);

  const onWheel = (e: WheelEvent) => {
    // This tracks shift + crtl + mouse wheel and calls the appropriate zoom function
    handleStageZoom(e, stageProps);
    if (activeScene && activeScene.id === selectedScene.id) {
      throttledSocketUpdate();
    }
  };

  /**
   * FOG OF WAR
   * FOG OF WAR
   * FOG OF WAR
   *
   * The Stage component emits a blob when the fog of war is updated.
   * We update state so that saveScene() has something to check so uploads don't happen immediately
   */
  let isUpdatingFog = false;
  const onFogUpdate = async (blob: Promise<Blob>) => {
    isUpdatingFog = true;

    const fogBlob = await blob;

    if (blob !== null && !isSaving) {
      await handleMutation({
        mutation: () =>
          $createFogMutation.mutateAsync({
            blob: fogBlob as Blob,
            sceneId: selectedScene.id
          }),
        formLoadingState: () => {},
        onSuccess: (fog) => {
          stageProps.fogOfWar.url = `https://files.tableslayer.com/${fog.location}?${Date.now()}`;
          fogBlobUpdateTime = new Date();
          socketUpdate();
          isUpdatingFog = false;
        },
        onError: () => {
          console.log('Error uploading fog');
          isUpdatingFog = false;
        },
        toastMessages: {
          error: { title: 'Error uploading fog', body: (err) => err.message || 'Unknown error' }
        }
      });
    }
  };

  let isSaving = false;
  const saveScene = async () => {
    if (isSaving || isUpdatingFog) return;
    isSaving = true;

    // Save scene settings
    await handleMutation({
      mutation: () =>
        $updateSceneMutation.mutateAsync({
          sceneId: selectedScene.id,
          partyId: party.id,
          sceneData: convertPropsToSceneDetails(stageProps)
        }),
      formLoadingState: () => {},
      onSuccess: () => {
        // Scene saved successfully, no need to invalidate
        console.log('Scene saved successfully');
      },
      onError: (error) => {
        console.log('Error saving scene:', error);
      },
      toastMessages: {
        success: { title: 'Scene saved!' },
        error: { title: 'Error saving scene', body: (err) => err.message || 'Error saving scene' }
      }
    });

    // Save markers
    if (stageProps.marker.markers && stageProps.marker.markers.length > 0) {
      // Use our knownMarkerIds list instead of just data.selectedSceneMarkers
      const stageMarkers = stageProps.marker.markers;

      // Process markers one by one to handle creates and updates
      for (const marker of stageMarkers) {
        const markerData = convertStageMarkersToDbFormat([marker], selectedScene.id)[0];

        // If marker exists in the database, update it
        if (knownMarkerIds.includes(marker.id)) {
          await handleMutation({
            mutation: () =>
              $updateMarkerMutation.mutateAsync({
                partyId: party.id,
                markerId: marker.id,
                markerData
              }),
            formLoadingState: () => {},
            onSuccess: () => {
              // Marker updated successfully, no need to invalidate
              console.log('Marker updated successfully');
            },
            onError: (error) => {
              console.log('Error updating marker:', error);
            },
            toastMessages: {
              error: { title: 'Error updating marker', body: (err) => err.message || 'Error updating marker' }
            }
          });
        }
        // Otherwise create a new marker
        else {
          await handleMutation({
            mutation: () =>
              $createMarkerMutation.mutateAsync({
                partyId: party.id,
                sceneId: selectedScene.id,
                markerData: markerData
              }),
            formLoadingState: () => {},
            onSuccess: (result) => {
              // Update the marker with the DB-generated ID and any other fields
              if (result?.marker) {
                // Find and update the marker in stageProps
                const index = stageProps.marker.markers.findIndex((m) => m.id === marker.id);
                if (index !== -1) {
                  const oldId = stageProps.marker.markers[index].id;
                  const newId = result.marker.id;
                  stageProps.marker.markers[index].id = newId;

                  // Add the new ID to our known markers list
                  knownMarkerIds = [...knownMarkerIds, newId];
                  console.log('Added marker ID to known markers:', newId);

                  // If this is the selectedMarker, update the ID
                  if (selectedMarkerId === oldId) {
                    selectedMarkerId = newId;
                  }
                }
              }
            },
            onError: (error) => {
              console.log('Error creating marker:', error);
            },
            toastMessages: {
              error: { title: 'Error creating marker', body: (err) => err.message || 'Error creating marker' }
            }
          });
        }
      }
      socketUpdate();
    }

    // Empty game session update will update the lastUpdated field through Drizzle
    await handleMutation({
      mutation: () =>
        $updateGameSessionMutation.mutateAsync({
          gameSessionId: gameSession.id,
          partyId: party.id,
          gameSessionData: {
            lastUpdated: new Date()
          }
        }),
      formLoadingState: () => {},
      onSuccess: () => {
        // Successfully updated game session timestamp, no need to invalidate
      },
      toastMessages: {
        error: { title: 'Error saving game session', body: (err) => err.message || 'Error saving game session' }
      }
    });

    // Reset the saving flag after all updates
    isSaving = false;
  };

  $effect(() => {
    $state.snapshot(stageProps);
    $state.snapshot(fogBlobUpdateTime);

    if (isSaving) return;

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveScene();
    }, 3000);
  });

  // Make sure the selectedMarkerId is reset when the selectedScene changes
  // Also update knownMarkerIds to reflect what might change in state
  $effect(() => {
    if (selectedScene.id) {
      selectedMarkerId = undefined;
      knownMarkerIds = data.selectedSceneMarkers?.map((marker) => marker.id) || [];
    }
  });
</script>

<svelte:document onkeydown={handleKeydown} bind:activeElement />
<svelte:window bind:innerWidth />
<Head title={gameSession.name} description={`${gameSession.name} on Table Slayer`} />

<div class="container">
  <PaneGroup direction={isMobile ? 'vertical' : 'horizontal'}>
    <Pane
      defaultSize={15}
      collapsible={true}
      collapsedSize={0}
      minSize={10}
      maxSize={50}
      bind:pane={scenesPane}
      onCollapse={() => (isScenesCollapsed = true)}
      onExpand={() => (isScenesCollapsed = false)}
      onResize={() => {
        if (stage) {
          stage.scene.fit();
        }
      }}
    >
      <SceneSelector {selectedSceneNumber} {gameSession} {scenes} {party} {activeScene} />
    </Pane>
    <PaneResizer class="resizer">
      <button
        class="resizer__handle"
        aria-label="Collapse scenes column"
        title={isScenesCollapsed ? 'Expand scenes column' : 'Collapse scenes column'}
        onclick={handleToggleScenes}
      >
        <Icon Icon={getCollapseIcon()} />
      </button>
    </PaneResizer>
    <Pane defaultSize={70}>
      <div class="stageWrapper" role="presentation">
        <div class={stageClasses} bind:this={stageElement}>
          <Stage
            bind:this={stage}
            props={stageProps}
            {onFogUpdate}
            {onMapUpdate}
            {onSceneUpdate}
            {onStageInitialized}
            {onStageLoading}
            {onMarkerAdded}
            {onMarkerMoved}
            {onMarkerSelected}
            {onMarkerContextMenu}
          />
        </div>
        <SceneControls
          bind:stageProps
          {stage}
          {handleMapFill}
          {handleMapFit}
          {selectedScene}
          {activeScene}
          {handleSelectActiveControl}
          {activeControl}
          {socketUpdate}
          {party}
          {gameSession}
          {errors}
        />
        <SceneZoom {socketUpdate} {handleSceneFit} {handleMapFill} bind:stageProps />
        <Shortcuts />
        <Hints {stageProps} />
      </div>
    </Pane>
    <PaneResizer class="resizer">
      <button
        class="resizer__handle"
        aria-label="Collapse scenes column"
        title={isMarkersCollapsed ? 'Expand markers column' : 'Collapse markers column'}
        onclick={handleToggleMarkers}
      >
        <Icon Icon={getMarkerCollapseIcon()} />
      </button>
    </PaneResizer>
    <Pane
      defaultSize={25}
      collapsible={true}
      collapsedSize={0}
      minSize={10}
      maxSize={50}
      bind:pane={markersPane}
      onCollapse={() => (isMarkersCollapsed = true)}
      onExpand={() => (isMarkersCollapsed = false)}
      onResize={() => {
        if (stage) {
          stage.scene.fit();
        }
      }}
    >
      {#key selectedMarkerId}
        <MarkerManager
          partyId={party.id}
          bind:stageProps
          bind:selectedMarkerId
          {socketUpdate}
          {handleSelectActiveControl}
        />
      {/key}
    </Pane>
  </PaneGroup>
</div>

<style>
  :global {
    .panel.scene {
      aspect-ratio: 16 / 9;
    }
    /* Don't change container-name */
    /* Container is globally checked in child components */
    .stageWrapper {
      container-name: stageWrapper;
      container-type: size;
      display: flex;
      align-items: center;
      background: var(--contrastEmpty);
      height: 100%;
      position: relative;
    }
    .resizer {
      position: relative;
      display: flex;
      width: 1rem;
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
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .resizer:hover .resizer__handle {
      background: var(--fg);
      color: var(--bg);
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

    @media (max-width: 768px) {
      .resizer {
        width: 100% !important;
        height: 2rem !important;
        cursor: row-resize;
      }
      .resizer__handle {
        width: 4rem !important;
        height: 100% !important;
        cursor: pointer;
        margin-left: 50%;
        transform: translateX(-50%);
        margin-top: 0 !important;
      }
    }
  }
  .container {
    height: calc(100vh - 49px);
    user-select: none;
  }
  .stage {
    width: 100%;
    height: 100%;
    opacity: 1;
    visibility: visible;
    transition: opacity 0.25s ease-in;
  }
  .stage.stage--loading {
    visibility: hidden;
    opacity: 0;
  }
</style>
