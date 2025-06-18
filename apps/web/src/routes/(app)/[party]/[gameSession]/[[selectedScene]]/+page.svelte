<script lang="ts">
  let { data } = $props();
  import { type Socket } from 'socket.io-client';
  import { handleMutation } from '$lib/factories';
  import {
    Stage,
    type StageExports,
    type StageProps,
    MapLayerType,
    Icon,
    type Marker,
    PointerInputManager
  } from '@tableslayer/ui';
  import { PaneGroup, Pane, PaneResizer, type PaneAPI } from 'paneforge';
  import { MarkerManager, Hints, SceneControls, Shortcuts, SceneSelector, SceneZoom, Head } from '$lib/components';
  import {
    useUpdateSceneMutation,
    useUpdateGameSessionMutation,
    useUploadFogFromBlobMutation,
    useUploadSceneThumbnailMutation,
    useCreateMarkerMutation,
    useUpdateMarkerMutation,
    useUpsertMarkerMutation
  } from '$lib/queries';
  import { type $ZodIssue } from 'zod/v4/core';
  import { IconChevronDown, IconChevronUp, IconChevronLeft, IconChevronRight } from '@tabler/icons-svelte';
  import { navigating } from '$app/state';
  import {
    StageDefaultProps,
    broadcastStageUpdate,
    broadcastMarkerUpdate,
    buildSceneProps,
    handleKeyCommands,
    setupPartyWebSocket,
    handleStageZoom,
    hasThumb,
    convertPropsToSceneDetails,
    convertStageMarkersToDbFormat,
    throttle,
    type MarkerPositionUpdate,
    registerSceneForPropertyUpdates,
    queuePropertyUpdate,
    flushQueuedPropertyUpdates,
    setUserChangeCallback,
    type PropertyPath
  } from '$lib/utils';
  import { onMount } from 'svelte';
  import { initializePartyDataManager, usePartyData } from '$lib/utils/yjs/stores';

  let {
    scenes,
    gameSession,
    selectedSceneNumber,
    selectedScene: ssrSelectedScene,
    party,
    activeScene,
    activeSceneMarkers,
    user
  } = $derived(data);

  // Helper function to merge markers while protecting ones being moved
  const mergeMarkersWithMoveProtection = (localMarkers: any[], incomingMarkers: any[], beingMoved: Set<string>) => {
    if (beingMoved.size === 0) {
      return incomingMarkers; // No protection needed
    }

    console.log('Protecting moved markers from Y.js overwrite:', Array.from(beingMoved));
    const result = [...incomingMarkers];

    // Preserve local position for markers being moved
    for (const localMarker of localMarkers) {
      if (beingMoved.has(localMarker.id)) {
        const existingIndex = result.findIndex((m) => m.id === localMarker.id);
        if (existingIndex >= 0) {
          // Keep incoming marker but preserve local position
          result[existingIndex] = {
            ...result[existingIndex],
            position: localMarker.position
          };
          console.log(`Protected marker ${localMarker.id} position:`, localMarker.position);
        }
      }
    }

    return result;
  };

  // Y.js integration
  let partyData: ReturnType<typeof usePartyData> | null = $state(null);
  let yjsScenes = $state<typeof scenes>(scenes); // Initialize with SSR data to prevent hydration mismatch
  let isHydrated = $state(false); // Track hydration status

  // SSR protection - prevent Y.js from overwriting fresh database data
  const pageLoadTime = Date.now();
  const ssrProtectionPeriod = 2000; // 2 seconds
  let hasReceivedFirstYjsUpdate = $state(false);

  // Y.js reactive party state - initialize with SSR data
  let yjsPartyState = $state({
    isPaused: party.gameSessionIsPaused,
    activeSceneId: activeScene?.id
  });

  // Helper function to add thumbnails to Y.js scenes
  const processScenesThumbnails = (rawScenes: typeof scenes) => {
    return rawScenes.map((scene) => {
      // Check if scene already has thumbnail information (from SSR)
      if ('thumb' in scene && scene.thumb) {
        return scene;
      }

      // Generate thumbnail URL if mapThumbLocation or mapLocation exists
      const imageLocation = scene.mapThumbLocation || scene.mapLocation;
      if (imageLocation) {
        // Create thumbnail object using the same format as server-side processing
        const options = 'w=400,h=225,fit=cover,gravity=center';
        const thumb = {
          resizedUrl: `https://files.tableslayer.com/cdn-cgi/image/${options}/${imageLocation}?t=${Date.now()}`,
          originalUrl: `https://files.tableslayer.com/${imageLocation}`
        };
        return { ...scene, thumb };
      }

      return scene;
    });
  };

  // Use SSR data until hydrated, then switch to processed Y.js data with thumbnails
  let currentScenes = $derived(isHydrated ? processScenesThumbnails(yjsScenes) : scenes);
  // For broadcasting: find the active scene if it's in the current game session
  let currentActiveScene = $derived(
    isHydrated && yjsPartyState.activeSceneId
      ? yjsScenes.find((scene) => scene.id === yjsPartyState.activeSceneId) || null
      : activeScene
  );

  // Use Y.js scene data when available for selectedScene to ensure map image updates are reflected
  let selectedScene = $derived(
    isHydrated && yjsScenes.length > 0
      ? yjsScenes.find((scene) => scene.id === ssrSelectedScene.id) || ssrSelectedScene
      : ssrSelectedScene
  );

  // For SceneSelector: just pass the active scene ID so it can determine if any of its scenes match
  let activeSceneId = $derived(isHydrated ? yjsPartyState.activeSceneId : activeScene?.id);
  let currentParty = $derived(
    isHydrated
      ? {
          ...party,
          gameSessionIsPaused: yjsPartyState.isPaused
        }
      : party
  );

  let socket: Socket | null = $state(null);
  let stageProps: StageProps = $state(buildSceneProps(data.selectedScene, data.selectedSceneMarkers, 'editor'));
  let selectedMarkerId: string | undefined = $state();

  // Track which markers were loaded from the database for Y.js sync
  let persistedMarkerIds = $state<Set<string>>(new Set(data.selectedSceneMarkers?.map((marker) => marker.id) || []));
  let stageElement: HTMLDivElement | undefined = $state();
  let activeControl = $state('none');
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let editingTimer: ReturnType<typeof setTimeout> | null = null; // Timer to clear isActivelyEditing flag
  let errors = $state<$ZodIssue[] | undefined>(undefined);
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
  let mapThumbLocation: null | string = $state(null);

  // Track if we're receiving Y.js updates to prevent auto-save cascades
  let isReceivingYjsUpdate = $state(false);
  let hasInitialLoad = $state(false);
  let isWindowFocused = $state(true); // Track if this editor window is focused
  let markersBeingMoved = $state(new Set<string>()); // Track markers currently being moved/saved
  let isActivelyEditing = $state(false); // Track if user is actively making changes (blocks Y.js updates)
  const isMobile = $derived(innerWidth < 768);
  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.0005;

  const updateSceneMutation = useUpdateSceneMutation();
  const updateGameSessionMutation = useUpdateGameSessionMutation();
  const createFogMutation = useUploadFogFromBlobMutation();
  const createThumbnailMutation = useUploadSceneThumbnailMutation();
  const createMarkerMutation = useCreateMarkerMutation();
  const updateMarkerMutation = useUpdateMarkerMutation();
  const upsertMarkerMutation = useUpsertMarkerMutation();

  const getCollapseIcon = () => {
    if (isMobile) {
      return isScenesCollapsed ? IconChevronDown : IconChevronUp;
    } else {
      return isScenesCollapsed ? IconChevronRight : IconChevronLeft;
    }
  };

  const getMarkerCollapseIcon = () => {
    if (isMobile) {
      return isMarkersCollapsed ? IconChevronUp : IconChevronDown;
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
    // Only broadcast if we're editing the active scene (so we have full scene data)
    // The session containing the active scene is automatically the broadcasting session
    const isEditingActiveScene = selectedScene.id === currentActiveScene?.id;
    const shouldBroadcast = isEditingActiveScene;

    console.log('socketUpdate called:', {
      gameSessionId: gameSession.id,
      selectedSceneId: selectedScene.id,
      currentActiveSceneId: currentActiveScene?.id,
      isEditingActiveScene,
      shouldBroadcast
    });

    if (shouldBroadcast) {
      console.log('Broadcasting stage update to playfield');
      broadcastStageUpdate(
        socket,
        currentActiveScene,
        selectedScene,
        stageProps, // We have full scene data and stage props
        activeSceneMarkers,
        currentParty.gameSessionIsPaused
      );
    } else {
      console.log('Skipping broadcast - conditions not met');
    }
  };

  // Register the scene with the property broadcaster for Y.js updates
  $effect(() => {
    const sceneId = selectedScene?.id;
    if (sceneId) {
      registerSceneForPropertyUpdates(sceneId);

      // Initialize scene data in Y.js if partyData is available
      if (partyData && !partyData.getSceneData(selectedScene.id)) {
        // Create a copy of stageProps without local-only properties for Y.js storage
        const sharedStageProps = {
          ...stageProps,
          // Reset local-only properties to defaults for shared state
          activeLayer: MapLayerType.None, // Default activeLayer for shared state
          scene: {
            ...stageProps.scene,
            // Reset local-only scene properties to defaults for shared state
            offset: { x: 0, y: 0 },
            zoom: 1,
            rotation: 0
          }
        };
        partyData.initializeSceneData(selectedScene.id, sharedStageProps, data.selectedSceneMarkers || []);
      }
    }
  });

  // Subscribe to Y.js StageProps changes for the current scene
  $effect(() => {
    const sceneId = selectedScene?.id;
    if (!partyData || !sceneId || !isHydrated) return;

    console.log('Setting up Y.js subscription for scene:', sceneId);
    const currentSceneId = sceneId; // Capture the scene ID to avoid closure issues

    const unsubscribe = partyData.subscribe(() => {
      console.log('Y.js subscription triggered - checking for scene:', currentSceneId);

      // Block Y.js updates if user is actively editing
      if (isActivelyEditing) {
        console.log('🛡️ BLOCKING Y.js update - user is actively editing');
        return;
      }

      // SSR protection: block the first Y.js update if we're in the protection period
      const timeSincePageLoad = Date.now() - pageLoadTime;
      if (!hasReceivedFirstYjsUpdate && timeSincePageLoad < ssrProtectionPeriod) {
        console.log(
          `🛡️ PROTECTING fresh SSR data - blocking first Y.js update (${timeSincePageLoad}ms since page load)`
        );
        hasReceivedFirstYjsUpdate = true; // Mark that we've received the first update
        return;
      }

      // Allow all subsequent updates (real-time collaboration)
      if (!hasReceivedFirstYjsUpdate) {
        hasReceivedFirstYjsUpdate = true;
        console.log('🔄 Allowing Y.js updates - real-time collaboration enabled');
      }

      const sceneData = partyData!.getSceneData(currentSceneId);
      if (sceneData && sceneData.stageProps) {
        console.log('[Y.js Subscription] Received stageProps update for scene:', {
          sceneId: currentSceneId,
          mapUrl: sceneData.stageProps.map?.url,
          hasStageProps: !!sceneData.stageProps,
          timestamp: Date.now()
        });

        // Update local stageProps with shared properties from Y.js, preserving local-only properties
        const incomingStageProps = sceneData.stageProps;
        console.log('Y.js incoming stageProps (raw):', incomingStageProps);

        // Get current local state for comparison
        const currentStagePropsSnapshot = $state.snapshot(stageProps);
        console.log('Current local stageProps:', currentStagePropsSnapshot);

        // Create a merged stageProps that preserves local-only properties
        const mergedStageProps = {
          ...incomingStageProps,
          // Preserve local activeLayer (fog tools, etc.)
          activeLayer: stageProps.activeLayer,
          scene: {
            ...incomingStageProps.scene,
            // Override with local viewport state (must come after the spread)
            offset: stageProps.scene.offset,
            zoom: stageProps.scene.zoom,
            rotation: stageProps.scene.rotation
          },
          marker: {
            ...incomingStageProps.marker,
            // Protect markers being moved from Y.js overwrites
            markers: mergeMarkersWithMoveProtection(
              stageProps.marker?.markers || [],
              incomingStageProps.marker?.markers || [],
              markersBeingMoved
            )
          }
        };

        console.log('Merged result:', mergedStageProps);

        // Only update if there are actual changes to avoid infinite loops
        // Use $state.snapshot to get actual values from Svelte proxy for comparison
        if (JSON.stringify(mergedStageProps) !== JSON.stringify(currentStagePropsSnapshot)) {
          console.log('Updating stageProps from Y.js for scene:', currentSceneId);
          console.log('Previous stageProps:', currentStagePropsSnapshot);
          console.log('New merged stageProps:', mergedStageProps);

          // Set flag to prevent auto-save from triggering on Y.js updates
          isReceivingYjsUpdate = true;
          stageProps = mergedStageProps;

          // Reset flag after the update - longer timeout to prevent auto-save loop
          setTimeout(() => {
            isReceivingYjsUpdate = false;
          }, 1000);

          // Also broadcast to playfield via Socket.IO to keep it in sync
          // Only do this if we're editing the active scene to avoid duplicate broadcasts
          if (currentSceneId === currentActiveScene?.id) {
            console.log('Broadcasting Y.js changes to playfield via Socket.IO');
            socketUpdate();
          }
        } else {
          console.log('No changes detected in Y.js update - skipping stageProps update');
        }
      } else {
        console.log('No scene data or stageProps found in Y.js for scene:', currentSceneId);
      }
    });

    return () => {
      console.log('Unsubscribing from Y.js for scene:', currentSceneId);
      unsubscribe();
    };
  });

  // Track when initial load is complete to prevent auto-save on hydration
  const currentSceneId = $derived(selectedScene?.id);
  $effect(() => {
    console.log(
      'Initial load check - isHydrated:',
      isHydrated,
      'stageProps:',
      !!stageProps,
      'selectedScene:',
      !!currentSceneId
    );
    if (isHydrated && stageProps && currentSceneId) {
      // Wait a moment to ensure all initial updates are complete
      setTimeout(() => {
        hasInitialLoad = true;
        console.log('Initial load completed - auto-save enabled');
      }, 500); // Reduced from 1000ms to 500ms for faster response
    }
  });

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
    // Set up callback for property updates to trigger auto-save
    setUserChangeCallback(startAutoSaveTimer);

    let unsubscribeYjs: (() => void) | null = null;

    // Initialize Y.js for scene list synchronization
    try {
      console.log('Initializing Y.js for scene list sync...');
      const manager = initializePartyDataManager(party.id, user.id, gameSession.id);
      partyData = usePartyData();

      // Initialize Y.js with SSR scene data
      const sceneMetadata = scenes.map((scene) => ({
        id: scene.id,
        name: scene.name,
        order: scene.order,
        mapLocation: scene.mapLocation || undefined,
        mapThumbLocation: scene.mapThumbLocation || undefined,
        gameSessionId: scene.gameSessionId,
        thumb: hasThumb(scene)
          ? {
              resizedUrl: scene.thumb.resizedUrl,
              originalUrl: scene.thumb.url
            }
          : undefined
      }));
      partyData.initializeScenesList(sceneMetadata);

      // Initialize Y.js party state with SSR data
      partyData.initializePartyState({
        isPaused: party.gameSessionIsPaused,
        activeSceneId: activeScene?.id
      });

      // Subscribe to Y.js changes (both scenes and party state)
      unsubscribeYjs = partyData.subscribe(() => {
        const updatedScenes = partyData!.getScenesList();
        const updatedPartyState = partyData!.getPartyState();

        console.log('[Y.js Main Subscription] Data updated:', {
          scenesCount: updatedScenes.length,
          selectedSceneId: selectedScene?.id,
          selectedSceneMapLocation: updatedScenes.find((s) => s.id === selectedScene?.id)?.mapLocation,
          partyState: updatedPartyState
        });

        // Update reactive state
        yjsScenes = updatedScenes as typeof scenes;
        yjsPartyState = {
          isPaused: updatedPartyState.isPaused,
          activeSceneId: updatedPartyState.activeSceneId
        };
      });

      // Immediately populate reactive state with current Y.js data after initialization
      yjsScenes = partyData.getScenesList() as typeof scenes;
      const currentPartyState = partyData.getPartyState();
      yjsPartyState = {
        isPaused: currentPartyState.isPaused,
        activeSceneId: currentPartyState.activeSceneId
      };

      // Mark as hydrated after Y.js initialization to prevent hydration mismatch
      isHydrated = true;

      // Process any property updates that were queued before Y.js was ready
      flushQueuedPropertyUpdates();
    } catch (error) {
      console.error('Error initializing Y.js scene sync:', error);
      // Even if Y.js fails, mark as hydrated to prevent hydration issues
      isHydrated = true;
    }

    socket = setupPartyWebSocket(
      party.id,
      () => console.log('Connected to party socket'),
      () => console.log('Disconnected from party socket'),
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
      if (editingTimer) clearTimeout(editingTimer);
      if (unsubscribeYjs) {
        unsubscribeYjs();
      }
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
      updateProperty(stageProps, ['activeLayer'], MapLayerType.None, 'control');
    } else if (control === 'marker') {
      selectedMarkerId = undefined;
      activeControl = 'marker';
      updateProperty(stageProps, ['activeLayer'], MapLayerType.Marker, 'control');
      markersPane.expand();
    } else {
      activeControl = control;
      updateProperty(stageProps, ['activeLayer'], MapLayerType.FogOfWar, 'control');
    }
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

  // Track previous scene ID to detect scene switches
  let previousSceneId = $state<string | undefined>(undefined);

  // Extract reactive dependencies to avoid unnecessary re-runs
  let currentSelectedScene = $derived(data.selectedScene);
  let currentSelectedSceneMarkers = $derived(data.selectedSceneMarkers);

  // Get the Y.js version of the selected scene if available (has the latest mapLocation)
  let yjsSelectedScene = $derived(yjsScenes.find((s) => s.id === selectedScene?.id) || currentSelectedScene);

  // Track the last mapLocation we built props for
  let lastBuiltMapLocation = $state<string | null | undefined>(undefined);

  $effect(() => {
    const currentSceneId = currentSelectedScene?.id;
    const isSceneSwitch = currentSceneId !== previousSceneId;

    // Get the current mapLocation from Y.js or SSR data
    const sceneToUse = yjsSelectedScene || currentSelectedScene;
    const currentMapLocation = sceneToUse?.mapLocation;

    // Check if we need to rebuild due to map change
    const mapLocationChanged = currentMapLocation !== lastBuiltMapLocation;

    console.log('[StageProps Effect] Checking if rebuild needed:', {
      currentSceneId,
      isSceneSwitch,
      previousSceneId,
      currentMapLocation,
      lastBuiltMapLocation,
      mapLocationChanged,
      hasStageProps: !!stageProps,
      usingYjsData: sceneToUse === yjsSelectedScene,
      yjsMapLocation: yjsSelectedScene?.mapLocation,
      ssrMapLocation: currentSelectedScene?.mapLocation
    });

    // Only rebuild stageProps when scene switches, initial load, or map actually changes
    if (isSceneSwitch || !stageProps || mapLocationChanged) {
      console.log('[StageProps Effect] REBUILDING stageProps - reason:', {
        isSceneSwitch,
        noStageProps: !stageProps,
        mapLocationChanged
      });

      // This is a scene switch or initial load - rebuild everything
      stageProps = buildSceneProps(sceneToUse, currentSelectedSceneMarkers, 'editor');
      lastBuiltMapLocation = currentMapLocation;

      console.log('[StageProps Effect] Rebuilt stageProps with map URL:', stageProps.map.url);
    } else {
      // Same scene - only update if markers changed
      // Compare marker IDs and positions to detect changes
      const currentMarkerIds = stageProps.marker.markers
        .map((m) => m.id)
        .sort()
        .join(',');
      const newMarkerIds =
        currentSelectedSceneMarkers
          ?.map((m) => m.id)
          .sort()
          .join(',') || '';

      // Check if markers have changed (different IDs or different count)
      const markersChanged =
        currentMarkerIds !== newMarkerIds ||
        stageProps.marker.markers.length !== (currentSelectedSceneMarkers?.length || 0);

      if (markersChanged) {
        // Preserve current map and scene state when only markers change
        const currentMapState = {
          offset: { ...stageProps.map.offset },
          zoom: stageProps.map.zoom,
          rotation: stageProps.map.rotation
        };
        const currentSceneState = {
          offset: { ...stageProps.scene.offset },
          zoom: stageProps.scene.zoom,
          rotation: stageProps.scene.rotation
        };

        stageProps = buildSceneProps(sceneToUse, currentSelectedSceneMarkers, 'editor');

        // Restore viewport state
        stageProps.map.offset = currentMapState.offset;
        stageProps.map.zoom = currentMapState.zoom;
        stageProps.map.rotation = currentMapState.rotation;
        stageProps.scene.offset = currentSceneState.offset;
        stageProps.scene.zoom = currentSceneState.zoom;
        stageProps.scene.rotation = currentSceneState.rotation;
      }
    }

    previousSceneId = currentSceneId;
  });

  // REMOVED: Effect that was overwriting map URL with server thumb
  // We now generate all image URLs client-side in buildSceneProps

  // Effect to broadcast when active scene changes via Y.js (e.g., from SceneSelector)
  // Send full stage updates when we're editing the active scene
  $effect(() => {
    if (isHydrated && currentActiveScene) {
      // We're editing the active scene - send full stage update
      if (selectedScene.id === currentActiveScene.id) {
        console.log('Broadcasting full stage update - we are editing the active scene');
        socketUpdate();
      }
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
    // Set actively editing flag to block Y.js updates
    isActivelyEditing = true;

    // Clear any existing editing timer and set new one
    if (editingTimer) clearTimeout(editingTimer);
    editingTimer = setTimeout(() => {
      isActivelyEditing = false;
      console.log('Cleared isActivelyEditing flag due to timeout');
    }, 10000); // Clear after 10 seconds if no save occurs

    stageProps.marker.markers = [...stageProps.marker.markers, marker];
    selectedMarkerId = marker.id;

    // Trigger Y.js synchronization for new marker to other editors
    queuePropertyUpdate(stageProps, ['marker', 'markers'], stageProps.marker.markers, 'marker');

    startAutoSaveTimer(); // Trigger auto-save after marker added
  };

  const onMarkerMoved = (marker: Marker, position: { x: number; y: number }) => {
    const index = stageProps.marker.markers.findIndex((m: Marker) => m.id === marker.id);
    if (index !== -1) {
      // Set actively editing flag to block ALL Y.js updates during marker movement
      isActivelyEditing = true;
      console.log('🚫 Set isActivelyEditing=true for marker move:', marker.id);

      // Clear any existing editing timer and set new one
      if (editingTimer) clearTimeout(editingTimer);
      editingTimer = setTimeout(() => {
        isActivelyEditing = false;
        console.log('Cleared isActivelyEditing flag due to timeout after marker move');
      }, 10000); // Clear after 10 seconds if no save occurs

      stageProps.marker.markers[index] = {
        ...marker,
        position: { x: position.x, y: position.y }
      };

      // Mark this marker as being moved to protect it from Y.js overwrites
      markersBeingMoved.add(marker.id);

      // Trigger Y.js synchronization for marker position to other editors
      queuePropertyUpdate(stageProps, ['marker', 'markers'], stageProps.marker.markers, 'marker');

      // Use the optimized marker update for position changes
      // Only broadcast if we're editing the active scene
      if (socket && selectedScene && selectedScene.id && selectedScene.id === currentActiveScene?.id) {
        broadcastMarkerUpdate(socket, marker.id, position, selectedScene.id);
      }

      // Delay auto-save for marker moves to avoid conflicts during dragging
      // Clear any existing timer and set a longer delay
      if (saveTimer) clearTimeout(saveTimer);
      if (isWindowFocused && !isReceivingYjsUpdate && hasInitialLoad && !isSaving) {
        saveTimer = setTimeout(() => {
          if (isWindowFocused && !isReceivingYjsUpdate && hasInitialLoad && !isSaving) {
            console.log('Auto-saving after marker move completed');
            saveScene();
            // Remove marker from being moved set after save
            markersBeingMoved.delete(marker.id);
          }
        }, 5000); // Longer delay for marker moves
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

    // Handle panning with rotation adjustment
    if (e.buttons === 1 || e.buttons === 2) {
      // Get rotation for both map and scene transformations
      const rotation = stageProps.scene.rotation;
      const radians = (Math.PI / 180) * rotation;

      // Calculate rotated movement vectors
      const rotatedMovementX = e.movementX * Math.cos(radians) + e.movementY * Math.sin(radians);
      const rotatedMovementY = -e.movementX * Math.sin(radians) + e.movementY * Math.cos(radians);

      if (e.shiftKey) {
        // Apply rotation to movement for map offset
        const movementFactor = 1 / stageProps.scene.zoom;
        stageProps.map.offset.x += rotatedMovementX * movementFactor;
        stageProps.map.offset.y -= rotatedMovementY * movementFactor;
      } else if (e.ctrlKey) {
        // Scene offset also needs rotation adjustment
        stageProps.scene.offset.x += rotatedMovementX;
        stageProps.scene.offset.y -= rotatedMovementY;
      }

      // Use our proper throttled update (replaces manual throttling)
      throttledSocketUpdate();
    }

    // Emit the normalized and rotated position over the WebSocket
    // Only emit cursor if we're editing the active scene
    const shouldEmitCursor = currentActiveScene && currentActiveScene.id === selectedScene.id;

    if (shouldEmitCursor) {
      socket?.emit('cursorMove', {
        user: data.user,
        normalizedPosition: { x: finalNormalizedX, y: finalNormalizedY },
        zoom: stageProps.scene.zoom,
        offset: stageProps.scene.offset
      });
    }
  };

  function onMapPan(dx: number, dy: number) {
    const newOffsetX = stageProps.map.offset.x + dx;
    const newOffsetY = stageProps.map.offset.y + dy;
    updateProperty(stageProps, ['map', 'offset', 'x'], newOffsetX, 'control');
    updateProperty(stageProps, ['map', 'offset', 'y'], newOffsetY, 'control');
  }

  function onMapRotate(angle: number) {
    updateProperty(stageProps, ['map', 'rotation'], angle, 'control');
  }

  function onMapZoom(zoom: number) {
    updateProperty(stageProps, ['map', 'zoom'], zoom, 'control');
  }

  function onScenePan(dx: number, dy: number) {
    stageProps.scene.offset.x += dx;
    stageProps.scene.offset.y += dy;
  }

  function onSceneRotate(angle: number) {
    stageProps.scene.rotation = angle;
  }

  function onSceneZoom(zoom: number) {
    updateProperty(stageProps, ['scene', 'zoom'], zoom, 'control');
  }

  // Use throttling for wheel/zoom events to reduce update frequency
  const throttledSocketUpdate = throttle(socketUpdate, 200);

  const onWheel = (e: WheelEvent) => {
    // This tracks shift + crtl + mouse wheel and calls the appropriate zoom function
    handleStageZoom(e, stageProps);
    if (currentActiveScene && currentActiveScene.id === selectedScene.id) {
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
          updateProperty(
            stageProps,
            ['fogOfWar', 'url'],
            `https://files.tableslayer.com/${fog.location}?${Date.now()}`,
            'control'
          );
          fogBlobUpdateTime = new Date();
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

    // Try to become the active saver for this scene
    if (!partyData || !partyData.becomeActiveSaver(selectedScene.id)) {
      console.log('Cannot save: another editor is already saving this scene');
      return;
    }

    isSaving = true;
    console.log('Starting coordinated save for scene:', selectedScene.id);

    let saveSuccess = false;
    try {
      // Generate and upload thumbnail (non-blocking)
      try {
        if (stage?.scene?.generateThumbnail) {
          const thumbnailBlob = await stage.scene.generateThumbnail();

          // Upload thumbnail in background - don't block save if this fails
          handleMutation({
            mutation: () =>
              $createThumbnailMutation.mutateAsync({
                blob: thumbnailBlob,
                sceneId: selectedScene.id
              }),
            formLoadingState: () => {},
            onSuccess: (result) => {
              // Store just the location path in stageProps for database saving
              mapThumbLocation = result.location;
              console.log('Thumbnail uploaded successfully:', result.location);

              // Update Y.js immediately with the new thumbnail location
              if (partyData && selectedScene) {
                console.log('Updating Y.js with new mapThumbLocation:', result.location);
                const timestamp = Date.now();
                // Update with both the location and the thumb object to trigger UI updates
                partyData.updateScene(selectedScene.id, {
                  mapThumbLocation: result.location,
                  thumbUpdatedAt: timestamp,
                  thumb: hasThumb(result)
                    ? {
                        resizedUrl: result.thumb.resizedUrl,
                        url: result.thumb.url
                      }
                    : undefined
                });
              }
            },
            onError: (error) => {
              console.log('Error uploading thumbnail (non-blocking):', error);
              // Don't fail the save just because thumbnail upload failed
            },
            toastMessages: {
              // Remove error toast - thumbnail upload is optional
            }
          }).catch((error) => {
            console.log('Thumbnail upload failed silently:', error);
          });
        }
      } catch (error) {
        console.log('Error generating thumbnail (non-blocking):', error);
      }

      // Save scene settings
      await handleMutation({
        mutation: () =>
          $updateSceneMutation.mutateAsync({
            sceneId: selectedScene.id,
            partyId: party.id,
            sceneData: convertPropsToSceneDetails(stageProps, mapThumbLocation)
          }),
        formLoadingState: () => {},
        onSuccess: () => {},
        onError: (error) => {
          console.log('Error saving scene:', error);
        },
        toastMessages: {
          success: { title: 'Scene saved!' },
          error: { title: 'Error saving scene', body: (err) => err.message || 'Error saving scene' }
        }
      });

      // Save markers using simplified upsert approach
      console.log(
        'Checking markers for save - markers:',
        stageProps.marker?.markers?.length || 0,
        stageProps.marker?.markers
      );
      if (stageProps.marker.markers && stageProps.marker.markers.length > 0) {
        const stageMarkers = stageProps.marker.markers;
        console.log('Found markers to save:', stageMarkers.length);

        // Process markers one by one using upsert (create or update as needed)
        for (const marker of stageMarkers) {
          const markerData = convertStageMarkersToDbFormat([marker], selectedScene.id)[0];

          await handleMutation({
            mutation: () =>
              $upsertMarkerMutation.mutateAsync({
                partyId: party.id,
                sceneId: selectedScene.id,
                markerData: markerData
              }),
            formLoadingState: () => {},
            onSuccess: (result) => {
              console.log(`Marker ${marker.id} ${result.operation} successfully`);
              // Add to persisted set if this was a create operation
              if (result.operation === 'created') {
                persistedMarkerIds.add(marker.id);
              }
            },
            onError: (error) => {
              console.log('Error saving marker:', error);
            },
            toastMessages: {
              error: { title: 'Error saving marker', body: (err) => err.message || 'Error saving marker' }
            }
          });
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

      // Mark save as successful
      saveSuccess = true;
    } catch (error) {
      console.error('Error during save operation:', error);
      saveSuccess = false;
    } finally {
      // Always release the save lock and reset flags
      if (partyData) {
        partyData.releaseActiveSaver(selectedScene.id, saveSuccess);
      }
      isSaving = false;

      // Clear actively editing flag and timer after save completes
      isActivelyEditing = false;
      if (editingTimer) {
        clearTimeout(editingTimer);
        editingTimer = null;
      }
      console.log('✅ Coordinated save completed, success:', saveSuccess, '- cleared isActivelyEditing flag');
    }
  };

  // Wrapper function for property updates that also triggers auto-save
  const updateProperty = (stageProps: any, propertyPath: PropertyPath, value: any, updateType: string = 'control') => {
    // Set actively editing flag to block Y.js updates
    isActivelyEditing = true;

    // Clear any existing editing timer and set new one
    if (editingTimer) clearTimeout(editingTimer);
    editingTimer = setTimeout(() => {
      isActivelyEditing = false;
      console.log('Cleared isActivelyEditing flag due to timeout');
    }, 10000); // Clear after 10 seconds if no save occurs

    queuePropertyUpdate(stageProps, propertyPath, value, updateType);
    startAutoSaveTimer();
  };

  // Helper function for marker updates that triggers auto-save
  const updateMarkerAndSave = (markerId: string, updateFn: (marker: any) => void) => {
    const markerIndex = stageProps.marker.markers.findIndex((m: any) => m.id === markerId);
    if (markerIndex !== -1) {
      // Set actively editing flag to block Y.js updates
      isActivelyEditing = true;

      // Clear any existing editing timer and set new one
      if (editingTimer) clearTimeout(editingTimer);
      editingTimer = setTimeout(() => {
        isActivelyEditing = false;
        console.log('Cleared isActivelyEditing flag due to timeout');
      }, 10000); // Clear after 10 seconds if no save occurs

      // Update the marker locally
      updateFn(stageProps.marker.markers[markerIndex]);

      // Trigger Y.js synchronization for markers to other editors
      queuePropertyUpdate(stageProps, ['marker', 'markers'], stageProps.marker.markers, 'marker');

      startAutoSaveTimer();
    }
  };

  // Function to start auto-save timer after user changes
  const startAutoSaveTimer = () => {
    // Only start timer if conditions are met
    if (isSaving) {
      console.log('Skipping auto-save timer - save already in progress');
      return;
    }

    if (!hasInitialLoad) {
      console.log('Skipping auto-save timer - initial load not complete');
      return;
    }

    if (isReceivingYjsUpdate) {
      console.log('Skipping auto-save timer - receiving Y.js update');
      return;
    }

    if (!isWindowFocused) {
      console.log('Skipping auto-save timer - window not focused');
      return;
    }

    console.log('Starting auto-save timer after user change');

    // Clear any existing timer
    if (saveTimer) clearTimeout(saveTimer);

    // Start new timer for idle period after user change
    saveTimer = setTimeout(() => {
      // Double-check conditions before actually saving
      if (isWindowFocused && !isReceivingYjsUpdate && hasInitialLoad && !isSaving) {
        console.log('Auto-saving after user idle period');
        saveScene();
      } else {
        console.log('Cancelled auto-save - conditions changed during idle period');
        // Clear actively editing flag if save was cancelled due to conditions
        isActivelyEditing = false;
      }
    }, 3000);
  };

  // Make sure the selectedMarkerId is reset when the selectedScene changes
  // Also update persistedMarkerIds to reflect what might change in state
  $effect(() => {
    if (selectedScene.id) {
      selectedMarkerId = undefined;
      persistedMarkerIds = new Set(data.selectedSceneMarkers?.map((marker) => marker.id) || []);
    }
  });
</script>

<svelte:document
  onkeydown={handleKeydown}
  onvisibilitychange={() => {
    isWindowFocused = !document.hidden;
    console.log('Tab visibility changed, isWindowFocused:', isWindowFocused);
  }}
  bind:activeElement
/>
<svelte:window
  bind:innerWidth
  onfocus={() => {
    isWindowFocused = true;
    console.log('Window gained focus, isWindowFocused:', isWindowFocused);
  }}
  onblur={() => {
    isWindowFocused = false;
    console.log('Window lost focus, isWindowFocused:', isWindowFocused);
    // Clear any pending save timer when window loses focus
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  }}
/>
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
      <SceneSelector
        {selectedSceneNumber}
        {gameSession}
        scenes={currentScenes}
        party={currentParty}
        {activeSceneId}
        {partyData}
        {socketUpdate}
      />
    </Pane>
    <PaneResizer class="resizer">
      <button
        class="resizer__handle"
        aria-label="Collapse scenes column"
        title={isScenesCollapsed ? 'Expand scenes column' : 'Collapse scenes column'}
        onclick={handleToggleScenes}
        ontouchstart={handleToggleScenes}
      >
        <Icon Icon={getCollapseIcon()} />
      </button>
    </PaneResizer>
    <Pane defaultSize={70}>
      <div class="stageWrapper" role="presentation">
        <div class={stageClasses} bind:this={stageElement}>
          <PointerInputManager
            {minZoom}
            {maxZoom}
            {zoomSensitivity}
            {stageElement}
            {stageProps}
            {onMapPan}
            {onMapRotate}
            {onMapZoom}
            {onScenePan}
            {onSceneRotate}
            {onSceneZoom}
          />
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
          {stageProps}
          {stage}
          {handleMapFill}
          {handleMapFit}
          {selectedScene}
          {activeSceneId}
          {handleSelectActiveControl}
          {activeControl}
          {socketUpdate}
          party={currentParty}
          {gameSession}
          {errors}
          {partyData}
        />
        <SceneZoom {socketUpdate} {handleSceneFit} {handleMapFill} {stageProps} />
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
        ontouchstart={handleToggleMarkers}
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
          {stageProps}
          bind:selectedMarkerId
          {socketUpdate}
          {handleSelectActiveControl}
          {updateMarkerAndSave}
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
      position: relative;
      z-index: 1;
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
    height: calc(100dvh - 43px);
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
