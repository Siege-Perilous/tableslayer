<script lang="ts">
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { getRandomFantasyQuote, buildSceneProps } from '$lib/utils';
  import { devLog, devWarn, devError } from '$lib/utils/debug';
  import { MapLayerType, Stage, Text, Title, type StageExports, type StageProps, type Marker } from '@tableslayer/ui';
  import { Head } from '$lib/components';
  import { StageDefaultProps } from '$lib/utils/defaultMapState';
  import { initializePartyDataManager, usePartyData, destroyPartyDataManager } from '$lib/utils/yjs/stores';
  import { type SceneData } from '$lib/utils/yjs/PartyDataManager';

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

  let yjsSceneData = $state<SceneData | null>(null);
  let isHydrated = $state(false);

  let hasActiveScene = $state(!!data.activeScene);
  let isInvalidating = $state(false);
  let isProcessingSceneChange = $state(false);

  let stage: StageExports;
  let stageElement: HTMLDivElement | undefined = $state();
  let stageProps: StageProps = $state({
    ...StageDefaultProps,
    mode: 1,
    activeLayer: MapLayerType.None,
    scene: { ...StageDefaultProps.scene, autoFit: true, offset: { x: 0, y: 0 } }
  });
  let selectedMarker: Marker | undefined = $state();
  let stageIsLoading: boolean = $state(true);
  let sceneIsChanging: boolean = $state(false);
  let gameIsPaused = $derived(party.gameSessionIsPaused || !hasActiveScene);
  let randomFantasyQuote = $state(getRandomFantasyQuote());
  let stageClasses = $derived([
    'stage',
    (stageIsLoading || sceneIsChanging) && 'stage--loading',
    gameIsPaused && 'stage--hidden'
  ]);
  const fadeOutDelay = 5000;

  // No debouncing needed - flashing was caused by image versioning, not Y.js updates

  // Track initialization state to prevent race conditions
  let yjsInitialized = false;
  let initialDataApplied = false;

  // For batched marker updates
  // Marker updates now handled through Y.js scene synchronization

  // Track the last Y.js update to prevent loops
  let lastYjsUpdateTimestamp = 0;

  // Update stage props from Y.js data when available
  $effect(() => {
    if (isUnmounting || isInvalidating || isProcessingSceneChange) {
      return;
    }

    // First priority: Use Y.js data if available and initialized
    if (isHydrated && yjsInitialized && yjsSceneData?.stageProps && yjsPartyState.activeSceneId) {
      // Check if this is actually a new update
      const currentTimestamp = yjsSceneData.lastUpdated || 0;
      if (currentTimestamp === lastYjsUpdateTimestamp) {
        // Same Y.js data, no need to update
        return;
      }

      devLog('playfield', 'Playfield stageProps effect - new Y.js data:', {
        currentTimestamp,
        markerCount: yjsSceneData.stageProps?.marker?.markers?.length || 0
      });

      // Only update if we have scene data and an active scene

      stageProps = {
        ...yjsSceneData.stageProps,
        // Force player mode
        mode: 1,
        // Build scene from scratch - don't spread editor's scene settings
        scene: {
          autoFit: true,
          offset: { x: 0, y: 0 },
          rotation: 0,
          zoom: stageProps.scene?.zoom || 1
        },
        // Don't allow active layer (fog tools, etc)
        activeLayer: MapLayerType.None,
        // Filter markers to remove DM-only ones
        marker: {
          ...yjsSceneData.stageProps.marker,
          markers: (yjsSceneData.stageProps.marker?.markers || []).filter((m: Marker) => m.visibility !== 1) // 1 = MarkerVisibility.DM
        }
      };

      // Update the timestamp to prevent re-processing
      lastYjsUpdateTimestamp = currentTimestamp;
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
        devLog('playfield', 'Using SSR data instead of Y.js:', {
          reason: !initialDataApplied ? 'initial render' : 'Y.js missing scene data',
          sceneId: data.activeScene.id,
          markerCount: data.activeSceneMarkers?.length || 0,
          yjsInitialized,
          hasYjsSceneData: !!yjsSceneData?.stageProps,
          timestamp: Date.now()
        });
        devLog('playfield', 'Using SSR data:', !initialDataApplied ? 'initial render' : 'Y.js missing scene data');
        stageProps = buildSceneProps(data.activeScene, data.activeSceneMarkers, 'client');
        initialDataApplied = true;
      }
    }
  });

  // Marker updates now handled through Y.js scene synchronization

  // Effect to ensure stage fits after scene changes complete
  let lastActiveSceneId: string | undefined = undefined;
  $effect(() => {
    // When active scene changes and stage is ready, ensure it fits
    if (
      data.activeScene?.id &&
      data.activeScene.id !== lastActiveSceneId &&
      !stageIsLoading &&
      !isInvalidating &&
      stage?.scene?.fit
    ) {
      lastActiveSceneId = data.activeScene.id;

      // Use requestAnimationFrame for smoother transition
      requestAnimationFrame(() => {
        if (stage?.scene?.fit) {
          stage.scene.fit();
          devLog('playfield', 'Manually fitting stage after scene change to:', data.activeScene?.id);
        }
      });
    }
  });

  // Track mount state to prevent double initialization
  let isMounted = false;
  let isUnmounting = false;

  // Track the current game session ID to detect changes
  let currentGameSessionId = $state<string | undefined>(data.activeGameSession?.id);

  // Cursor update handler - moved to component scope so it can be reused
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  onMount(() => {
    if (isMounted) {
      devWarn('playfield', 'Playfield already mounted, skipping initialization');
      return;
    }
    isMounted = true;
    isUnmounting = false;

    let unsubscribeYjs: (() => void) | null = null;

    // Set initial stage props from SSR data
    if (data.activeScene && !initialDataApplied) {
      stageProps = buildSceneProps(data.activeScene, data.activeSceneMarkers, 'client');
      initialDataApplied = true;
    }

    // Initialize Y.js for party state AND scene data monitoring
    try {
      // Initialize with the active game session ID if available
      const activeGameSessionId = data.activeGameSession?.id;

      // Update the tracked game session ID
      currentGameSessionId = activeGameSessionId;

      devLog('playfield', 'Initializing Y.js:', {
        partySlug: page.params.party,
        userId: user.id,
        gameSessionId: activeGameSessionId,
        activeSceneId: data.activeScene?.id,
        timestamp: Date.now()
      });

      // Always create a new instance for the playfield
      // Use the party slug from the URL params for the room name
      const partySlug = page.params.party;
      initializePartyDataManager(partySlug, user.id, activeGameSessionId);
      partyData = usePartyData();

      // Ensure we don't have duplicate subscriptions
      if (unsubscribeYjs) {
        devWarn('playfield', 'Y.js subscription already exists, cleaning up before creating new one');
        (unsubscribeYjs as () => void)();
        unsubscribeYjs = null;
      }

      // Subscribe to Y.js changes (both party state and scene data)
      unsubscribeYjs = partyData.subscribe(() => {
        if (isUnmounting || isInvalidating) {
          return;
        }

        const updatedPartyState = partyData!.getPartyState();
        devLog('playfield', 'Playfield detected party state change:', updatedPartyState);

        // Update reactive state
        yjsPartyState = {
          isPaused: updatedPartyState.isPaused,
          activeSceneId: updatedPartyState.activeSceneId
        };

        // Also get scene data if we have an active scene
        if (updatedPartyState.activeSceneId) {
          // If we don't have the game session ID, we need to find it
          if (!activeGameSessionId) {
            // When the active scene changes, we'll invalidate and get the correct game session
            devLog('playfield', 'No game session ID available, will invalidate to get correct session');
          } else {
            devLog('playfield', 'Attempting to get scene data:', {
              sceneId: updatedPartyState.activeSceneId,
              gameSessionId: activeGameSessionId,
              isConnected: partyData!.getConnectionStatus(),
              timestamp: Date.now()
            });

            const sceneData = partyData!.getSceneData(updatedPartyState.activeSceneId);

            devLog('playfield', 'Scene data retrieval result:', {
              sceneId: updatedPartyState.activeSceneId,
              hasSceneData: !!sceneData,
              hasStageProps: !!sceneData?.stageProps,
              markerCount: sceneData?.markers?.length || 0,
              lastUpdated: sceneData?.lastUpdated || null,
              timestamp: Date.now()
            });

            if (sceneData) {
              devLog('playfield', 'Playfield received Y.js scene data update:', {
                sceneId: updatedPartyState.activeSceneId,
                markerCount: sceneData.markers?.length || 0
              });

              // Apply Y.js update immediately - just like editor-to-editor updates
              if (!isUnmounting && !isInvalidating && !isProcessingSceneChange) {
                yjsSceneData = sceneData;
              }
            } else {
              devLog('playfield', 'No scene data found in Y.js for scene:', updatedPartyState.activeSceneId);
            }
          }
        }
      });

      // Mark as hydrated after Y.js initialization
      isHydrated = true;
      yjsInitialized = true;
    } catch (error) {
      devError('playfield', 'Error initializing Y.js:', error);
      // Even if Y.js fails, mark as hydrated
      isHydrated = true;
    }

    // Set up cursor tracking on unified Y.js connection
    if (partyData) {
      // Wait for socket to be connected
      const checkSocketConnection = setInterval(() => {
        if (partyData && partyData.isSocketConnected()) {
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

    const handleMouseMove = () => {
      // Playfield should NOT emit cursor moves - only editors should
      // The playfield only receives and displays cursor data from editors
      return;
    };

    $effect(() => {
      if (gameIsPaused) {
        randomFantasyQuote = getRandomFantasyQuote();
      }
    });

    // Add mousemove event listener
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
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
        (unsubscribeYjs as () => void)();
      }

      // Clean up Y.js
      destroyPartyDataManager();
    };
  });

  // Effect to monitor game session changes and reinitialize Y.js
  $effect(() => {
    // Skip during initial mount, unmounting, or when processing other changes
    if (!isMounted || isUnmounting || isInvalidating || isProcessingSceneChange) return;

    const newGameSessionId = data.activeGameSession?.id;

    // Check if game session has changed
    if (partyData && newGameSessionId && currentGameSessionId && newGameSessionId !== currentGameSessionId) {
      devLog('playfield', 'Game session changed, reinitializing Y.js:', {
        from: currentGameSessionId,
        to: newGameSessionId,
        activeSceneId: data.activeScene?.id
      });

      // Update the tracked game session ID
      currentGameSessionId = newGameSessionId;

      // Unsubscribe from current Y.js updates
      if (partyData) {
        partyData.offCursorEvent('cursorUpdate');
        partyData.offCursorEvent('userDisconnect');
      }

      // Destroy the old connection
      destroyPartyDataManager();

      // Reinitialize with the new game session
      const partySlug = page.params.party;
      initializePartyDataManager(partySlug, user.id, newGameSessionId);
      partyData = usePartyData();

      devLog('playfield', 'Y.js reinitialized with new game session:', newGameSessionId);

      // Resubscribe to Y.js changes
      partyData.subscribe(() => {
        if (isUnmounting || isInvalidating) {
          return;
        }

        const updatedPartyState = partyData!.getPartyState();
        devLog('playfield', 'Playfield detected party state change:', updatedPartyState);

        // Update reactive state
        yjsPartyState = {
          isPaused: updatedPartyState.isPaused,
          activeSceneId: updatedPartyState.activeSceneId
        };

        // Also get scene data if we have an active scene
        if (updatedPartyState.activeSceneId) {
          devLog('playfield', 'Attempting to get scene data:', {
            sceneId: updatedPartyState.activeSceneId,
            gameSessionId: newGameSessionId,
            isConnected: partyData!.getConnectionStatus(),
            timestamp: Date.now()
          });

          const sceneData = partyData!.getSceneData(updatedPartyState.activeSceneId);

          devLog('playfield', 'Scene data retrieval result:', {
            sceneId: updatedPartyState.activeSceneId,
            hasSceneData: !!sceneData,
            hasStageProps: !!sceneData?.stageProps,
            markerCount: sceneData?.markers?.length || 0,
            lastUpdated: sceneData?.lastUpdated || null,
            timestamp: Date.now()
          });

          if (sceneData) {
            devLog('playfield', 'Playfield received Y.js scene data update:', {
              sceneId: updatedPartyState.activeSceneId,
              markerCount: sceneData.markers?.length || 0
            });

            // Apply Y.js update immediately
            if (!isUnmounting && !isInvalidating && !isProcessingSceneChange) {
              yjsSceneData = sceneData;
            }
          } else {
            devLog('playfield', 'No scene data found in Y.js for scene:', updatedPartyState.activeSceneId);
          }
        }
      });

      // Re-setup cursor tracking
      if (partyData) {
        // Wait for socket to be connected
        const checkSocketConnection = setInterval(() => {
          if (partyData && partyData.isSocketConnected()) {
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

            devLog('playfield', 'Cursor tracking re-established after game session change');
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => clearInterval(checkSocketConnection), 5000);
      }
    }
  });

  const getRandomColor = (): string => {
    return `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')}`;
  };

  function onSceneUpdate(offset: { x: number; y: number }, zoom: number) {
    devLog('playfield', '[Playfield] onSceneUpdate called:', { offset, zoom });
    // Update zoom only if it's a valid value from the Stage's autoFit calculation
    // Ignore zoom: 0 which seems to be a transient state during initialization
    if (zoom > 0 && stageProps.scene.zoom !== zoom) {
      stageProps.scene.zoom = zoom;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function onFogUpdate(_blob: Promise<Blob>) {
    return;
  }

  function onMapUpdate(offset: { x: number; y: number }, zoom: number) {
    devLog('playfield', 'Updating map', offset, zoom);
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
    // Immediately fit when stage is ready
    if (stage?.scene?.fit) {
      stage.scene.fit();
    }
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

      devLog('playfield', 'Playfield checking for active scene changes:', {
        yjsActiveSceneId: yjsPartyState.activeSceneId,
        currentActiveSceneId
      });

      // Check if active scene changed
      if (yjsPartyState.activeSceneId && yjsPartyState.activeSceneId !== currentActiveSceneId) {
        devLog('playfield', 'Active scene change detected:', {
          from: currentActiveSceneId,
          to: yjsPartyState.activeSceneId,
          currentGameSessionId: data.activeGameSession?.id,
          timestamp: Date.now()
        });

        devLog(
          'playfield',
          `Playfield: Active scene changed from ${currentActiveSceneId} to ${yjsPartyState.activeSceneId}, reloading page...`
        );

        // Trigger loading fade immediately when scene change is detected
        sceneIsChanging = true;

        // Set flags to prevent race conditions
        isProcessingSceneChange = true;
        isInvalidating = true;

        // Clear the current scene data to show loading state
        yjsSceneData = null;
        lastYjsUpdateTimestamp = 0; // Reset timestamp tracker for new scene
        hasActiveScene = !!yjsPartyState.activeSceneId;

        devLog('playfield', 'Starting invalidateAll() for scene change');

        // Invalidate the page to load the new scene data
        // This is necessary because:
        // 1. The new scene might be in a different game session requiring new Y.js connection
        // 2. We need fresh SSR data for the new scene
        // 3. The playfield needs to reinitialize with the correct scene context
        invalidateAll()
          .then(() => {
            devLog('playfield', 'invalidateAll() completed:', {
              newActiveSceneId: data.activeScene?.id,
              newGameSessionId: data.activeGameSession?.id,
              timestamp: Date.now()
            });
            devLog('playfield', 'Page invalidation complete after active scene change');
            // Reset flags after invalidation completes
            isInvalidating = false;
            isProcessingSceneChange = false;
            // Clear scene changing state after invalidation
            sceneIsChanging = false;
          })
          .catch((error) => {
            devLog('playfield', 'invalidateAll() failed:', error);
            devError('playfield', 'Error invalidating page after active scene change:', error);
            // Reset flags even on error
            isInvalidating = false;
            isProcessingSceneChange = false;
            sceneIsChanging = false;
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
