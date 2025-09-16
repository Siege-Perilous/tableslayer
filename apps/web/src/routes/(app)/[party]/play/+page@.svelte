<script lang="ts">
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { getRandomFantasyQuote, buildSceneProps } from '$lib/utils';
  import { devLog, devWarn, devError, timingLog } from '$lib/utils/debug';
  import {
    MapLayerType,
    Stage,
    Text,
    Title,
    type StageExports,
    type StageProps,
    type Marker,
    type AnnotationLayerData
  } from '@tableslayer/ui';
  import { Head } from '$lib/components';
  import { StageDefaultProps } from '$lib/utils/defaultMapState';
  import { initializePartyDataManager, usePartyData, destroyPartyDataManager } from '$lib/utils/yjs/stores';
  import { type SceneData, type MeasurementData } from '$lib/utils/yjs/PartyDataManager';

  type CursorData = {
    worldPosition: { x: number; y: number; z: number };
    userId: string;
    color?: string;
    label?: string;
    lastMoveTime: number;
    fadedOut: boolean;
  };

  let cursors: Record<string, CursorData> = $state({});
  let measurements: Record<string, MeasurementData> = $state({});
  let latestMeasurement: MeasurementData | null = $state(null);
  let hoveredMarkerId: string | null = $state(null);
  let pinnedMarkerIds: string[] = $state([]);

  // Convert cursors to format expected by CursorLayer
  let cursorArray = $derived(
    Object.entries(cursors).map(([id, cursor]) => ({
      id,
      worldPosition: cursor.worldPosition || { x: 0, y: 0, z: 0 },
      color: cursor.color || '#ffffff',
      label: cursor.label || cursor.userId,
      opacity: cursor.fadedOut ? 0 : 1,
      lastUpdateTime: cursor.lastMoveTime
    }))
  );

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
    mode: 1, // StageMode.Player = 1
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

  // No debouncing needed - flashing was caused by image versioning, not Y.js updates

  // Track initialization state to prevent race conditions
  let yjsInitialized = false;
  let initialDataApplied = false;

  // For batched marker updates
  // Marker updates now handled through Y.js scene synchronization

  // Track the last Y.js update to prevent loops
  let lastYjsUpdateTimestamp = 0;
  let lastFogMaskVersion: number | undefined;
  let lastAnnotationMaskVersions: Map<string, number> = new Map();

  // Fetch mask functions for real-time updates
  const fetchFogMask = async (sceneId: string) => {
    const maskVersion = lastFogMaskVersion;
    try {
      const response = await fetch(`/api/scenes/getFogMask?sceneId=${sceneId}`);
      timingLog('FOG-RT', `fog_${maskVersion} - 12. Fog mask API response received at ${new Date().toISOString()}`);
      if (!response.ok) {
        console.error('Failed to fetch fog mask');
        return;
      }

      const data = (await response.json()) as { success: boolean; maskData?: string };
      if (data.maskData && stage?.fogOfWar?.fromRLE) {
        // Convert base64 back to Uint8Array
        const binaryString = atob(data.maskData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        timingLog(
          'FOG-RT',
          `fog_${maskVersion} - 13. Applying ${bytes.length} bytes to fog layer at ${new Date().toISOString()}`
        );
        // Apply the mask to the fog layer
        await stage.fogOfWar.fromRLE(bytes, 1024, 1024);
        timingLog('FOG-RT', `fog_${maskVersion} - 14. Fog mask applied successfully at ${new Date().toISOString()}`);
        timingLog('FOG-RT', `fog_${maskVersion} - COMPLETE: Full round-trip completed`);
      }
    } catch (error) {
      devError('fog-timing', `[FOG-RT] fog_${maskVersion} - ERROR:`, error);
      console.error('Error fetching fog mask:', error);
    }
  };

  const fetchAnnotationMask = async (annotationId: string) => {
    try {
      const response = await fetch(`/api/annotations/getMask?annotationId=${annotationId}`);
      if (!response.ok) {
        console.error('Failed to fetch annotation mask:', response.status, response.statusText);
        return;
      }

      const data = (await response.json()) as { success: boolean; maskData?: string | null };

      if (data.maskData && stage?.annotations?.loadMask) {
        // Convert base64 back to Uint8Array
        const binaryString = atob(data.maskData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        // Apply the mask to the annotation layer
        await stage.annotations.loadMask(annotationId, bytes);
      }
    } catch (error) {
      console.error('Error fetching annotation mask:', error);
    }
  };

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
        },
        // Filter annotations to remove DM-only ones and preserve maskVersion
        annotations: yjsSceneData.stageProps.annotations
          ? {
              ...yjsSceneData.stageProps.annotations,
              layers: (yjsSceneData.stageProps.annotations.layers || []).filter(
                (layer: AnnotationLayerData) => layer.visibility === 1 // 1 = StageMode.Player (visible to players)
              ),
              activeLayer: null // Players can't edit annotations
            }
          : { layers: [], activeLayer: null }
      };

      // Update the timestamp to prevent re-processing
      lastYjsUpdateTimestamp = currentTimestamp;

      // Check for mask version changes and fetch updated masks
      // Fog mask version changed
      if (stageProps.fogOfWar?.maskVersion && stageProps.fogOfWar.maskVersion !== lastFogMaskVersion) {
        timingLog(
          'FOG-RT',
          `fog_${stageProps.fogOfWar.maskVersion} - 10. Playfield detected mask version change at ${new Date().toISOString()}`
        );
        timingLog(
          'FOG-RT',
          `fog_${stageProps.fogOfWar.maskVersion} - Version: ${stageProps.fogOfWar.maskVersion}, Previous: ${lastFogMaskVersion}`
        );
        lastFogMaskVersion = stageProps.fogOfWar.maskVersion;
        if (data.activeScene?.id) {
          timingLog(
            'FOG-RT',
            `fog_${stageProps.fogOfWar.maskVersion} - 11. Fetching fog mask from API at ${new Date().toISOString()}`
          );
          fetchFogMask(data.activeScene.id);
        }
      }

      // Annotation mask versions changed
      if (stageProps.annotations?.layers) {
        for (const layer of stageProps.annotations.layers) {
          const lastVersion = lastAnnotationMaskVersions.get(layer.id);
          if (layer.maskVersion && layer.maskVersion !== lastVersion) {
            lastAnnotationMaskVersions.set(layer.id, layer.maskVersion);
            // Don't await - let it run in background, but catch errors
            fetchAnnotationMask(layer.id).catch((error) => {
              console.error(`Error in fetchAnnotationMask for layer ${layer.id}:`, error);
            });
          }
        }
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
        devLog('playfield', 'Using SSR data instead of Y.js:', {
          reason: !initialDataApplied ? 'initial render' : 'Y.js missing scene data',
          sceneId: data.activeScene.id,
          markerCount: data.activeSceneMarkers?.length || 0,
          yjsInitialized,
          hasYjsSceneData: !!yjsSceneData?.stageProps,
          timestamp: Date.now()
        });
        devLog('playfield', 'Using SSR data:', !initialDataApplied ? 'initial render' : 'Y.js missing scene data');
        stageProps = buildSceneProps(data.activeScene, data.activeSceneMarkers, 'client', data.activeSceneAnnotations);
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
      const newSceneId = data.activeScene.id;
      lastActiveSceneId = newSceneId;

      // Reset mask versions for the new scene to ensure fresh fetches
      lastFogMaskVersion = undefined;
      lastAnnotationMaskVersions.clear();

      // Fetch fog mask for the new scene
      devLog('playfield', 'Scene changed, fetching fog mask for:', newSceneId);
      fetchFogMask(newSceneId);

      // Also fetch annotation masks if there are any
      if (stageProps.annotations?.layers) {
        for (const layer of stageProps.annotations.layers) {
          if (layer.maskVersion) {
            // Store the version so we don't re-fetch on Y.js updates
            lastAnnotationMaskVersions.set(layer.id, layer.maskVersion);
            fetchAnnotationMask(layer.id).catch((error) => {
              console.error(`Error fetching annotation mask for layer ${layer.id} on scene change:`, error);
            });
          }
        }
      }

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

  // Cursor handling is now done through Three.js world coordinates

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
      stageProps = buildSceneProps(data.activeScene, data.activeSceneMarkers, 'client', data.activeSceneAnnotations);
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
      if (!partySlug) {
        throw new Error('Party slug is required');
      }
      initializePartyDataManager(partySlug, user.id, activeGameSessionId, data.partykitHost);
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

        // Update cursors from Y.js awareness
        const yjsCursors = partyData!.getCursors();

        // Clear out any cursors that are no longer in Y.js
        const activeCursorKeys = new Set(Object.keys(yjsCursors));
        const newCursors = { ...cursors };
        for (const cursorKey of Object.keys(cursors)) {
          if (!activeCursorKeys.has(cursorKey)) {
            delete newCursors[cursorKey];
          }
        }
        cursors = newCursors;

        // Update or add cursors from Y.js
        Object.entries(yjsCursors).forEach(([cursorKey, cursorData]) => {
          // Transform cursor data to match playfield format
          cursors = {
            ...cursors,
            [cursorKey]: {
              worldPosition: cursorData.worldPosition || { x: 0, y: 0, z: 0 },
              userId: cursorData.userId,
              color: cursorData.color,
              label: cursorData.label,
              lastMoveTime: cursorData.lastMoveTime || Date.now(),
              fadedOut: false
            }
          };
        });

        // Update measurements from Y.js awareness
        const yjsMeasurements = partyData!.getMeasurements();
        if (Object.keys(yjsMeasurements).length > 0) {
          devLog('playfield', 'Received measurements from Y.js:', yjsMeasurements);
        }
        measurements = yjsMeasurements;

        // Update hovered marker from Y.js awareness (for players to see what DM is hovering)
        const hoveredMarker = partyData!.getHoveredMarker();
        hoveredMarkerId = hoveredMarker?.id ?? null;
        if (hoveredMarker) {
          console.log('[Play Route] Received hovered marker from Y.js:', {
            id: hoveredMarker.id,
            hoveredMarkerId,
            hasTooltip: hoveredMarker.tooltip
          });
        }

        // Update pinned markers from Y.js awareness
        pinnedMarkerIds = partyData!.getPinnedMarkers();

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

    // Cursor tracking is now handled via Y.js awareness protocol
    // The playfield is read-only, so it doesn't need cursor tracking setup

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

      // Cursor cleanup is handled by Y.js awareness automatically

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

      // Y.js cleanup will be handled by destroy

      // Destroy the old connection
      destroyPartyDataManager();

      // Reinitialize with the new game session
      const partySlug = page.params.party;
      if (!partySlug) {
        throw new Error('Party slug is required');
      }
      initializePartyDataManager(partySlug, user.id, newGameSessionId, data.partykitHost);
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

        // Update cursors from Y.js awareness
        const yjsCursors = partyData!.getCursors();

        // Clear out any cursors that are no longer in Y.js
        const activeCursorKeys = new Set(Object.keys(yjsCursors));
        const newCursors = { ...cursors };
        for (const cursorKey of Object.keys(cursors)) {
          if (!activeCursorKeys.has(cursorKey)) {
            delete newCursors[cursorKey];
          }
        }
        cursors = newCursors;

        // Update or add cursors from Y.js
        Object.entries(yjsCursors).forEach(([cursorKey, cursorData]) => {
          // Transform cursor data to match playfield format
          cursors = {
            ...cursors,
            [cursorKey]: {
              worldPosition: cursorData.worldPosition || { x: 0, y: 0, z: 0 },
              userId: cursorData.userId,
              color: cursorData.color,
              label: cursorData.label,
              lastMoveTime: cursorData.lastMoveTime || Date.now(),
              fadedOut: false
            }
          };
        });

        // Update measurements from Y.js awareness
        const yjsMeasurements = partyData!.getMeasurements();
        if (Object.keys(yjsMeasurements).length > 0) {
          devLog('playfield', 'Received measurements from Y.js:', yjsMeasurements);
        }
        measurements = yjsMeasurements;

        // Update hovered marker from Y.js awareness (for players to see what DM is hovering)
        const hoveredMarker = partyData!.getHoveredMarker();
        hoveredMarkerId = hoveredMarker?.id ?? null;
        if (hoveredMarker) {
          console.log('[Play Route] Received hovered marker from Y.js:', {
            id: hoveredMarker.id,
            hoveredMarkerId,
            hasTooltip: hoveredMarker.tooltip
          });
        }

        // Update pinned markers from Y.js awareness
        pinnedMarkerIds = partyData!.getPinnedMarkers();

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

      // Cursor tracking is now handled via Y.js awareness protocol
      // The playfield is read-only, so it doesn't need cursor tracking setup
    }
  });

  // Color generation removed - now handled in cursor data

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
  function onMarkerHover() {} // Players can't control hover, only receive it

  const onMarkerSelected = (marker: Marker | null) => {
    selectedMarker = marker ?? undefined;
  };

  function onStageLoading() {
    stageIsLoading = true;
  }

  async function onStageInitialized() {
    stageIsLoading = false;

    // Load fog mask if available
    if (data.activeSceneFogMask && stage?.fogOfWar?.fromRLE) {
      try {
        // Convert base64 back to Uint8Array
        const binaryString = atob(data.activeSceneFogMask);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        // Apply the mask to the fog layer
        await stage.fogOfWar.fromRLE(bytes, 1024, 1024);
      } catch (error) {
        console.error('Error loading fog mask:', error);
      }
    }

    // Load annotation masks if available
    if (data.activeSceneAnnotationMasks && stage?.annotations?.loadMask) {
      try {
        for (const [annotationId, maskData] of Object.entries(data.activeSceneAnnotationMasks)) {
          if (maskData) {
            // Convert base64 back to Uint8Array
            const binaryString = atob(maskData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            // Apply the mask to the annotation layer
            await stage.annotations.loadMask(annotationId, bytes);
          }
        }
      } catch (error) {
        console.error('Error loading annotation masks:', error);
      }
    }

    // Immediately fit when stage is ready
    if (stage?.scene?.fit) {
      stage.scene.fit();
    }
  }

  async function onAnnotationUpdate(layerId: string, blob: Promise<Blob>) {
    blob.then((blob) => {
      const layer = stageProps.annotations.layers.find((layer) => layer.id === layerId);
      if (layer) {
        layer.url = URL.createObjectURL(blob);
      }
    });
  }

  function onMarkerContextMenu(marker: Marker, event: MouseEvent | TouchEvent) {
    if (event instanceof MouseEvent) {
      alert('You clicked on marker: ' + marker.title + ' at ' + event.pageX + ',' + event.pageY);
    } else {
      alert('You clicked on marker: ' + marker.title + ' at ' + event.touches[0].pageX + ',' + event.touches[0].pageY);
    }
  }

  // Track the latest measurement to pass to Stage
  $effect(() => {
    const measurementValues = Object.values(measurements);
    if (measurementValues.length > 0) {
      // Find the most recent measurement
      const newest = measurementValues.reduce((latest, current) =>
        current.timestamp > latest.timestamp ? current : latest
      );
      devLog('playfield', 'Latest measurement to pass to Stage:', newest);
      latestMeasurement = newest;
    } else {
      latestMeasurement = null;
    }
  });

  // Fade-out logic is now handled in CursorLayer component via opacity calculation

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
    {hoveredMarkerId}
    {pinnedMarkerIds}
    receivedMeasurement={latestMeasurement
      ? {
          startPoint: latestMeasurement.startPoint,
          endPoint: latestMeasurement.endPoint,
          type: latestMeasurement.type,
          beamWidth: latestMeasurement.beamWidth,
          coneAngle: latestMeasurement.coneAngle,
          // Visual properties
          color: latestMeasurement.color,
          thickness: latestMeasurement.thickness,
          outlineColor: latestMeasurement.outlineColor,
          outlineThickness: latestMeasurement.outlineThickness,
          opacity: latestMeasurement.opacity,
          markerSize: latestMeasurement.markerSize,
          // Timing properties
          autoHideDelay: latestMeasurement.autoHideDelay,
          fadeoutTime: latestMeasurement.fadeoutTime,
          // Distance properties
          showDistance: latestMeasurement.showDistance,
          snapToGrid: latestMeasurement.snapToGrid,
          enableDMG252: latestMeasurement.enableDMG252
        }
      : null}
    callbacks={{
      onAnnotationUpdate,
      onFogUpdate,
      onMapUpdate,
      onStageLoading,
      onStageInitialized,
      onSceneUpdate,
      onMarkerAdded,
      onMarkerMoved,
      onMarkerSelected,
      onMarkerContextMenu,
      onMarkerHover,
      // Measurements are read-only in playfield, but we still need the callbacks
      onMeasurementStart: () => {},
      onMeasurementUpdate: () => {},
      onMeasurementEnd: () => {}
    }}
    cursors={cursorArray}
    trackLocalCursor={false}
  />

  <!-- Cursors are now rendered in Three.js via the CursorLayer component -->
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
</style>
