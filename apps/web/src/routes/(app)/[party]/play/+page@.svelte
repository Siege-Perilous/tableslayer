<script lang="ts">
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { getRandomFantasyQuote, buildSceneProps } from '$lib/utils';
  import { MapLayerType, Stage, Text, Title, type StageExports, type StageProps, type Marker } from '@tableslayer/ui';
  import { Head } from '$lib/components';
  import { StageDefaultProps } from '$lib/utils/defaultMapState';
  import { initializePartyDataManager, usePartyData, destroyPartyDataManager } from '$lib/utils/yjs/stores';

  type CursorData = {
    position: { x: number; y: number };
    user: { id: string; email: string };
    lastMoveTime: number;
    fadedOut: boolean;
  };

  let cursors: Record<string, CursorData> = $state({});

  let { data } = $props();
  const { user, party } = $derived(data);

  // Y.js party state and scene data monitoring for playfield
  let partyData: ReturnType<typeof usePartyData> | null = $state(null);
  let yjsPartyState = $state({
    isPaused: data.party.gameSessionIsPaused,
    activeSceneId: data.activeScene?.id
  });

  // Debug Y.js party state initialization
  console.log('🏁 Initial yjsPartyState:', {
    isPaused: yjsPartyState.isPaused,
    activeSceneId: yjsPartyState.activeSceneId,
    dataActiveSceneId: data.activeScene?.id
  });
  let yjsSceneData = $state<any>(null);
  let isHydrated = $state(false);

  let hasActiveScene = $state(!!data.activeScene);
  let isInvalidating = $state(false);
  let isProcessingSceneChange = $state(false);

  let stage: StageExports;
  let stageElement: HTMLDivElement | undefined = $state();
  let stageProps: StageProps = $state({ ...StageDefaultProps, mode: 1, activeLayer: MapLayerType.None });
  let selectedMarker: Marker | undefined = $state();
  let stageIsLoading: boolean = $state(true);
  let gameIsPaused = $derived(party.gameSessionIsPaused || !hasActiveScene);
  let randomFantasyQuote = $state(getRandomFantasyQuote());
  let stageClasses = $derived(['stage', stageIsLoading && 'stage--loading', gameIsPaused && 'stage--hidden']);
  const fadeOutDelay = 5000;

  // No debouncing needed - flashing was caused by image versioning, not Y.js updates

  // Track initialization state to prevent race conditions
  let yjsInitialized = false;
  let initialDataApplied = false;

  // For batched marker updates
  // Marker updates now handled through Y.js scene synchronization

  // Track the last processed stage props JSON to prevent loops
  let lastStagePropsJson: string | null = null;

  // Track the last Y.js scene data we processed to avoid duplicate work
  let lastProcessedYjsData: string | null = null;

  // Update stage props from Y.js data when available
  $effect(() => {
    if (isUnmounting || isInvalidating || isProcessingSceneChange) {
      console.log('Playfield stageProps effect skipped - unmounting, invalidating, or processing scene change');
      return;
    }

    // Create a hash of the current state to detect real changes
    const currentStateHash = `${yjsPartyState.activeSceneId}-${!!yjsSceneData?.stageProps}-${yjsSceneData?.lastSavedAt || 0}`;

    // Skip if we've already processed this exact state
    if (lastProcessedYjsData === currentStateHash && lastStagePropsJson) {
      console.log('Skipping stageProps effect - no real changes detected');
      return;
    }

    console.log('Playfield stageProps effect:', {
      isHydrated,
      yjsInitialized,
      hasYjsSceneData: !!yjsSceneData,
      hasStageProps: !!yjsSceneData?.stageProps,
      activeSceneId: data.activeScene?.id,
      yjsActiveSceneId: yjsPartyState.activeSceneId,
      initialDataApplied
    });

    // First priority: Use Y.js data if available and initialized
    if (isHydrated && yjsInitialized && yjsSceneData?.stageProps && yjsPartyState.activeSceneId) {
      // Only update if we have scene data and an active scene
      console.log('Building new stage props from Y.js data');

      // Mark this data as processed
      lastProcessedYjsData = currentStateHash;

      // Build the new stage props
      const newStageProps = {
        ...yjsSceneData.stageProps,
        // Force player mode
        mode: 1,
        // Don't allow rotate and zoom from the editor
        scene: {
          ...yjsSceneData.stageProps.scene,
          autoFit: true,
          offset: { x: 0, y: 0 },
          rotation: 0,
          // IMPORTANT: Preserve the current zoom value - don't use editor's zoom
          zoom: stageProps.scene?.zoom || 1
        },
        // Don't allow active layer (fog tools, etc)
        activeLayer: MapLayerType.None,
        // Filter markers to remove DM-only ones
        marker: {
          ...yjsSceneData.stageProps.marker,
          markers: (yjsSceneData.stageProps.marker?.markers || []).filter((m: any) => m.visibility !== 1) // 1 = MarkerVisibility.DM
        }
      };

      // Check if props have changed
      const newStagePropsJson = JSON.stringify(newStageProps);

      if (newStagePropsJson !== lastStagePropsJson) {
        console.log('Playfield updating stageProps from Y.js data');

        // Track what's changing to debug flashing
        const currentMapUrl = stageProps?.map?.url;
        const currentFogUrl = stageProps?.fogOfWar?.url;
        const newMapUrl = newStageProps.map?.url;
        const newFogUrl = newStageProps.fogOfWar?.url;

        if (currentMapUrl !== newMapUrl) {
          console.log('🗺️ Map URL changing:', {
            currentMapUrl,
            newMapUrl,
            hasTimestamp: newMapUrl?.includes('?t=')
          });
        }

        if (currentFogUrl !== newFogUrl) {
          console.log('🌫️ Fog URL changing:', {
            currentFogUrl,
            newFogUrl,
            hasTimestamp: newFogUrl?.includes('?t=')
          });
        }

        // Log other property changes for debugging
        const keysToCheck = ['grid', 'weather', 'marker', 'edgeOverlay', 'fog', 'postProcessing'];
        keysToCheck.forEach((key) => {
          const currentValue = JSON.stringify(stageProps[key]);
          const newValue = JSON.stringify(newStageProps[key]);
          if (currentValue !== newValue) {
            console.log(`🔄 ${key} changing:`, {
              key,
              hasChanged: true
            });
          }
        });

        // Update the stage props and track the JSON
        stageProps = newStageProps;
        lastStagePropsJson = newStagePropsJson;
      }
    }
    // Second priority: Use SSR data when Y.js doesn't have scene data or on initial load
    else if (data.activeScene && data.activeSceneMarkers && !isUnmounting && !isInvalidating) {
      // Use SSR data if:
      // 1. Initial load (!initialDataApplied && !yjsInitialized) OR
      // 2. Y.js doesn't have scene data for the current active scene
      const shouldUseSsrData =
        (!initialDataApplied && !yjsInitialized) ||
        (yjsInitialized && !yjsSceneData?.stageProps && data.activeScene.id === yjsPartyState.activeSceneId);

      if (shouldUseSsrData) {
        console.log('Using SSR data:', !initialDataApplied ? 'initial render' : 'Y.js missing scene data');
        const initialStageProps = buildSceneProps(data.activeScene, data.activeSceneMarkers, 'client');
        stageProps = initialStageProps;
        lastStagePropsJson = JSON.stringify(initialStageProps);
        lastProcessedYjsData = currentStateHash;
        initialDataApplied = true;
      }
    }
  });

  // Marker updates now handled through Y.js scene synchronization

  // Track mount state to prevent double initialization
  let isMounted = false;
  let isUnmounting = false;

  onMount(() => {
    if (isMounted) {
      console.warn('Playfield already mounted, skipping initialization');
      return;
    }
    isMounted = true;
    isUnmounting = false;

    let unsubscribeYjs: (() => void) | null = null;

    // Set initial stage props from SSR data
    if (data.activeScene && !initialDataApplied) {
      console.log('Setting initial stage props from SSR data in onMount');
      stageProps = buildSceneProps(data.activeScene, data.activeSceneMarkers, 'client');
      lastStagePropsJson = JSON.stringify(stageProps);
      initialDataApplied = true;
    }

    // Initialize Y.js for party state AND scene data monitoring
    try {
      console.log('Playfield initializing Y.js for party state and scene data...');
      // Initialize with the active game session ID if available
      const activeGameSessionId = data.activeGameSession?.id;

      // Always create a new instance for the playfield
      // Use the party slug from the URL params for the room name
      const partySlug = $page.params.party;
      const manager = initializePartyDataManager(partySlug, user.id, activeGameSessionId);
      partyData = usePartyData();

      // Ensure we don't have duplicate subscriptions
      if (unsubscribeYjs) {
        console.warn('Y.js subscription already exists, cleaning up before creating new one');
        unsubscribeYjs();
        unsubscribeYjs = null;
      }

      // Subscribe to Y.js changes (both party state and scene data)
      unsubscribeYjs = partyData.subscribe(() => {
        if (isUnmounting || isInvalidating) {
          console.log('Playfield Y.js subscription skipped - unmounting or invalidating');
          return;
        }

        console.log('Playfield Y.js subscription fired');
        const updatedPartyState = partyData!.getPartyState();
        console.log('Playfield detected party state change:', updatedPartyState);

        // Update reactive state
        yjsPartyState = {
          isPaused: updatedPartyState.isPaused,
          activeSceneId: updatedPartyState.activeSceneId
        };

        // Also get scene data if we have an active scene
        if (updatedPartyState.activeSceneId) {
          console.log('Trying to get scene data for:', updatedPartyState.activeSceneId);
          console.log('Active game session ID:', activeGameSessionId);

          // If we don't have the game session ID, we need to find it
          if (!activeGameSessionId) {
            console.log('Playfield: No active game session ID, will wait for scene switch to get data');
            // When the active scene changes, we'll invalidate and get the correct game session
          } else {
            const sceneData = partyData!.getSceneData(updatedPartyState.activeSceneId);
            console.log('Scene data result:', sceneData);
            if (sceneData) {
              console.log('Playfield received Y.js scene data update:', {
                sceneId: updatedPartyState.activeSceneId,
                hasStageProps: !!sceneData.stageProps,
                markerCount: sceneData.markers?.length || 0,
                stagePropsMarkerCount: sceneData.stageProps?.marker?.markers?.length || 0,
                markerIds: sceneData.stageProps?.marker?.markers?.map((m: any) => m.id).slice(0, 5) || [],
                timestamp: Date.now()
              });
              // Check if the scene data actually changed
              const sceneDataJson = JSON.stringify(sceneData);
              const currentSceneDataJson = yjsSceneData ? JSON.stringify(yjsSceneData) : null;

              if (sceneDataJson === currentSceneDataJson) {
                console.log('Y.js scene data unchanged, skipping update');
                return;
              }

              // Apply Y.js update immediately - no debouncing needed
              // The flashing was caused by image versioning, not Y.js updates
              if (!isUnmounting && !isInvalidating && !isProcessingSceneChange) {
                console.log('Applying Y.js scene data update immediately:', {
                  markerCount: sceneData.markers?.length || 0,
                  stagePropsMarkerCount: sceneData.stageProps?.marker?.markers?.length || 0,
                  timestamp: Date.now()
                });
                yjsSceneData = sceneData;
              }
            } else {
              console.log('No scene data found for active scene');
            }
          }
        }
      });

      // Mark as hydrated after Y.js initialization
      isHydrated = true;
      yjsInitialized = true;
    } catch (error) {
      console.error('Error initializing Y.js:', error);
      // Even if Y.js fails, mark as hydrated
      isHydrated = true;
    }

    console.log('Playfield using Y.js for scene updates and unified cursor tracking');

    // Set up cursor tracking on unified Y.js connection
    if (partyData) {
      // Wait for socket to be connected
      const checkSocketConnection = setInterval(() => {
        if (partyData.isSocketConnected()) {
          clearInterval(checkSocketConnection);

          // Register cursor event handlers
          partyData.onCursorEvent('cursorUpdate', (payload) => {
            handleCursorUpdate(payload);
          });

          partyData.onCursorEvent('userDisconnect', (userId) => {
            const updatedCursors = { ...cursors };
            delete updatedCursors[userId];
            cursors = updatedCursors;
          });
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => clearInterval(checkSocketConnection), 5000);
    }

    const handleMouseMove = (event: MouseEvent) => {
      // Playfield should NOT emit cursor moves - only editors should
      // The playfield only receives and displays cursor data from editors
      return;
    };

    // Legacy socket handlers disabled - using Y.js for scene updates
    /*
    socket.on('sessionUpdated', (payload: BroadcastStageUpdate) => {
      // Disabled - using Y.js
    });

    socket.on('propertiesUpdated', (updates: PropertyUpdates) => {
      // Disabled - using Y.js
    });
    */

    $effect(() => {
      if (gameIsPaused) {
        randomFantasyQuote = getRandomFantasyQuote();
      }
    });

    // Cursor update handler
    const handleCursorUpdate = (payload: any) => {
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
    };

    // Add mousemove event listener
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      console.log('Playfield cleanup starting');
      isUnmounting = true;
      isMounted = false;

      // No timers to clear - we removed debouncing

      // Remove event listeners
      window.removeEventListener('mousemove', handleMouseMove);

      // Remove cursor event handlers
      if (partyData) {
        partyData.offCursorEvent('cursorUpdate');
        partyData.offCursorEvent('userDisconnect');
      }

      // Unsubscribe from Y.js
      if (unsubscribeYjs) {
        unsubscribeYjs();
      }

      // Clean up Y.js
      destroyPartyDataManager();

      console.log('Playfield cleanup completed');
    };
  });

  const getRandomColor = (): string => {
    return `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')}`;
  };

  function onSceneUpdate(offset: { x: number; y: number }, zoom: number) {
    console.log('[Playfield] onSceneUpdate called:', { offset, zoom, currentZoom: stageProps.scene.zoom });
    // Only update if zoom actually changed to prevent unnecessary re-renders
    if (stageProps.scene.zoom !== zoom) {
      stageProps = {
        ...stageProps,
        scene: {
          ...stageProps.scene,
          zoom: zoom
        }
      };
    }
  }

  function onFogUpdate(blob: Promise<Blob>) {
    console.log('Updating fog', blob);
    return;
  }

  function onMapUpdate(offset: { x: number; y: number }, zoom: number) {
    console.log('Updating map', offset, zoom);
    return;
  }

  // Don't allow marker movement in player view
  function onMarkerMoved() {}
  function onMarkerAdded() {}

  const onMarkerSelected = (marker: Marker) => {
    selectedMarker = marker;
  };

  function onStageLoading() {
    stageIsLoading = true;
  }

  function onStageInitialized() {
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

  // Effect to handle active scene changes
  $effect(() => {
    if (isHydrated && !isInvalidating && !isProcessingSceneChange) {
      const currentActiveSceneId = data.activeScene?.id;
      const currentGameSessionId = data.activeGameSession?.id;

      console.log('Playfield checking for active scene changes:', {
        yjsActiveSceneId: yjsPartyState.activeSceneId,
        currentActiveSceneId,
        currentGameSessionId
      });

      // Check if active scene changed
      if (yjsPartyState.activeSceneId && yjsPartyState.activeSceneId !== currentActiveSceneId) {
        console.log(
          `Playfield: Active scene changed from ${currentActiveSceneId} to ${yjsPartyState.activeSceneId}, reloading page...`
        );

        // Set flags to prevent race conditions
        isProcessingSceneChange = true;
        isInvalidating = true;

        // Clear the current scene data to show loading state
        yjsSceneData = null;
        hasActiveScene = !!yjsPartyState.activeSceneId;

        // Invalidate the page to load the new scene data
        // This is necessary because:
        // 1. The new scene might be in a different game session requiring new Y.js connection
        // 2. We need fresh SSR data for the new scene
        // 3. The playfield needs to reinitialize with the correct scene context
        console.log('Invalidating page due to active scene change');
        invalidateAll()
          .then(() => {
            console.log('Page invalidation complete after active scene change');
            // Reset flags after invalidation completes
            isInvalidating = false;
            isProcessingSceneChange = false;
          })
          .catch((error) => {
            console.error('Error invalidating page after active scene change:', error);
            // Reset flags even on error
            isInvalidating = false;
            isProcessingSceneChange = false;
          });

        return;
      }

      // Update hasActiveScene based on Y.js data (for pause/unpause without scene change)
      hasActiveScene = !!yjsPartyState.activeSceneId;
    }
  });

  // Note: When switching between game sessions, the playfield needs to connect to the new session's Y.js document
  // This is a limitation that may require re-initializing the Y.js manager

  // $inspect(stageProps); // Commented out to prevent performance issues
</script>

<Head title={party.name} description={`${party.name} on Table Slayer`} />

<!-- Y.js is disabled in playfield to prevent conflicts with editor -->

{#if selectedMarker}
  <span style="display: none;">
    {selectedMarker.title} - {selectedMarker.id}
  </span>
{/if}

{#if gameIsPaused || !hasActiveScene}
  <div class="paused">
    <div>
      <Title as="h1" size="lg" class="heroTitle">Table Slayer</Title>
      {#if !hasActiveScene}
        <Text size="1.5rem" color="var(--fgPrimary)">Waiting for Game Master to set an active scene</Text>
      {:else}
        <Text size="1.5rem" color="var(--fgPrimary)">Game is paused</Text>
      {/if}
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
