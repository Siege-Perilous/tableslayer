<script lang="ts">
  let { data } = $props();
  import { handleMutation } from '$lib/factories';
  import {
    Stage,
    type StageExports,
    type StageProps,
    MapLayerType,
    Icon,
    type Marker,
    type AnnotationLayerData,
    StageMode,
    PointerInputManager,
    addToast,
    ToolType,
    type HoveredMarker,
    MarkerVisibility,
    GridMode
  } from '@tableslayer/ui';
  import { invalidateAll } from '$app/navigation';
  import { PaneGroup, Pane, PaneResizer, type PaneAPI } from 'paneforge';
  import {
    MarkerManager,
    AnnotationManager,
    Hints,
    SceneControls,
    Shortcuts,
    SceneSelector,
    SceneZoom,
    Head
  } from '$lib/components';
  import {
    useUpdateSceneMutation,
    useUpdateGameSessionMutation,
    useUploadSceneThumbnailMutation,
    useUpsertMarkerMutation,
    useUpsertAnnotationMutation,
    useDeleteAnnotationMutation,
    useUpdateFogMaskMutation,
    useUpdateAnnotationMaskMutation
  } from '$lib/queries';
  import { type ZodIssue } from 'zod';
  import { IconChevronDown, IconChevronUp, IconChevronLeft, IconChevronRight } from '@tabler/icons-svelte';
  import { navigating } from '$app/state';
  import {
    buildSceneProps,
    handleKeyCommands,
    handleStageZoom,
    hasThumb,
    convertPropsToSceneDetails,
    convertStageMarkersToDbFormat,
    convertAnnotationToDbFormat,
    registerSceneForPropertyUpdates,
    queuePropertyUpdate,
    flushQueuedPropertyUpdates,
    setUserChangeCallback
  } from '$lib/utils';
  import { throttle } from '$lib/utils/throttle';
  import { setPreference, getPreference, type PaneConfig } from '$lib/utils/gameSessionPreferences';
  import { devLog, devWarn, devError, timingLog } from '$lib/utils/debug';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { initializePartyDataManager, usePartyData, getPartyDataManager } from '$lib/utils/yjs/stores';
  import { useGetSceneTimestampsQuery } from '$lib/queries';
  import { goto } from '$app/navigation';

  let {
    scenes,
    gameSession,
    selectedSceneNumber,
    selectedScene: ssrSelectedScene,
    party,
    activeScene,
    user,
    paneLayoutDesktop,
    paneLayoutMobile,
    brushSize
  } = $derived(data);

  // Helper function to clean stage props before sending to Y.js
  // Removes local-only properties that should not be synchronized
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleanStagePropsForYjs = (props: StageProps): any => {
    return {
      ...props,
      annotations: {
        ...props.annotations,
        activeLayer: null, // activeLayer is local-only, not synchronized
        lineWidth: undefined // lineWidth is local-only, not synchronized
      },
      fogOfWar: {
        ...props.fogOfWar,
        tool: {
          ...props.fogOfWar.tool
          // size is omitted to prevent syncing
        }
      },
      // Ensure grid props are fully included with worldGridUnits and worldGridSize
      grid: {
        ...props.grid,
        worldGridUnits: props.grid.worldGridUnits || 'FT',
        worldGridSize: props.grid.worldGridSize || 5
      }
    };
  };

  // Helper function to merge markers while protecting ones being moved or edited
  const mergeMarkersWithProtection = (
    localMarkers: Marker[],
    incomingMarkers: Marker[],
    beingMoved: Set<string>,
    beingEdited: Set<string>,
    recentlyDeleted: Set<string>
  ) => {
    const protectedMarkers = new Set([...beingMoved, ...beingEdited]);

    devLog('markers', '🔄 Merging markers:', {
      localCount: localMarkers.length,
      incomingCount: incomingMarkers.length,
      protectedCount: protectedMarkers.size
    });

    // Start with incoming markers as base, but exclude recently deleted ones
    const resultMap = new Map();
    incomingMarkers.forEach((marker) => {
      // Skip markers that were recently deleted in this editor
      if (!recentlyDeleted.has(marker.id)) {
        resultMap.set(marker.id, marker);
      }
    });

    // Apply protections and add new markers
    for (const localMarker of localMarkers) {
      if (protectedMarkers.has(localMarker.id)) {
        if (resultMap.has(localMarker.id)) {
          // Marker exists in incoming - apply protection
          const incomingMarker = resultMap.get(localMarker.id);
          if (beingMoved.has(localMarker.id)) {
            // For moved markers, only preserve position from local state
            // This protects the marker being actively dragged in THIS editor
            resultMap.set(localMarker.id, {
              ...incomingMarker,
              position: localMarker.position
            });
          } else if (beingEdited.has(localMarker.id)) {
            // For edited markers, preserve entire local marker
            resultMap.set(localMarker.id, localMarker);
          }
        } else {
          // New marker not in incoming yet - add it
          resultMap.set(localMarker.id, localMarker);
        }
      }
    }

    const result = Array.from(resultMap.values());
    return result;
  };

  // Y.js integration
  let partyData: ReturnType<typeof usePartyData> | null = $state(null);
  let yjsScenes = $state<typeof scenes>(data.scenes); // Initialize with SSR data to prevent hydration mismatch
  let isHydrated = $state(false); // Track hydration status
  let throttledCursorUpdate: ((worldPosition: { x: number; y: number; z: number }) => void) | null = null;
  let hoveredMarker: HoveredMarker | null = $state(null); // Track hovered marker from awareness
  let pinnedMarkerIds = $state<string[]>([]); // Track pinned markers from DM

  // SSR protection - prevent Y.js from overwriting fresh database data
  const pageLoadTime = Date.now();
  const ssrProtectionPeriod = 2000; // 2 seconds
  let hasReceivedFirstYjsUpdate = $state(false);

  // Y.js reactive party state - initialize with SSR data
  let yjsPartyState = $state({
    isPaused: data.party.gameSessionIsPaused,
    activeSceneId: data.activeScene?.id
  });

  // Query for scene timestamps
  const timestampsQuery = $derived(
    useGetSceneTimestampsQuery({
      gameSessionId: gameSession.id,
      partyId: party.id
    })
  );

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
          resizedUrl: `https://files.tableslayer.com/cdn-cgi/image/${options}/${imageLocation}`,
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

  devLog('annoations', data.selectedSceneAnnotations);
  // Socket now managed by PartyDataManager for unified connection
  let stageProps: StageProps = $state(
    buildSceneProps(data.selectedScene, data.selectedSceneMarkers, 'editor', data.selectedSceneAnnotations)
  );
  let selectedMarkerId: string | undefined = $state();
  let selectedAnnotationId: string | undefined = $state();

  // Track which markers were loaded from the database for Y.js sync
  let persistedMarkerIds = $state<Set<string>>(new Set(data.selectedSceneMarkers?.map((marker) => marker.id) || []));
  // Track markers that were recently saved to prevent rebuild before SSR data updates
  let recentlySavedMarkerIds = $state<Set<string>>(new Set());
  let stageElement: HTMLDivElement | undefined = $state();
  let activeControl = $state('none');
  let keyboardPopoverId = $state<string | null>(null); // Track popover state from keyboard commands
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let editingTimer: ReturnType<typeof setTimeout> | null = null; // Timer to clear isActivelyEditing flag
  let driftCheckTimer: ReturnType<typeof setInterval> | null = null; // Timer for periodic drift checks
  let protectionCleanupTimer: ReturnType<typeof setInterval> | null = null; // Timer for cleaning up stuck protections
  let fogUpdateTimer: ReturnType<typeof setTimeout> | null = null; // Timer for debouncing fog uploads
  let annotationUpdateTimers: Map<string, ReturnType<typeof setTimeout>> = new Map(); // Timers for debouncing annotation uploads per layer
  let errors = $state<ZodIssue[] | undefined>(undefined);
  let stageIsLoading = $state(true);
  let isCursorInScene = $state(false);
  let stage: StageExports = $state(null)!;

  // Derive marker states reactively from stage
  let isHoveringMarker = $derived(stage?.markers?.isHoveringMarker ?? false);
  let isDraggingMarker = $derived(stage?.markers?.isDraggingMarker ?? false);

  let stageClasses = $derived(
    [
      'stage',
      (stageIsLoading || navigating.to) && 'stage--loading',
      isCursorInScene && isDraggingMarker && 'stage--grabbingCursor',
      isCursorInScene && !isDraggingMarker && isHoveringMarker && 'stage--pointerCursor',
      isCursorInScene &&
        !isHoveringMarker &&
        !isDraggingMarker &&
        (stageProps.activeLayer === MapLayerType.Annotation ||
          (stageProps.activeLayer === MapLayerType.FogOfWar && stageProps.fogOfWar.tool.type === ToolType.Brush)) &&
        'stage--hideCursor',
      isCursorInScene &&
        !isHoveringMarker &&
        !isDraggingMarker &&
        stageProps.activeLayer === MapLayerType.FogOfWar &&
        (stageProps.fogOfWar.tool.type === ToolType.Rectangle || stageProps.fogOfWar.tool.type === ToolType.Ellipse) &&
        'stage--crosshairCursor'
    ].filter(Boolean)
  );
  let scenesPane: PaneAPI = $state(undefined)!;
  let markersPane: PaneAPI = $state(undefined)!;
  let isScenesCollapsed = $state(false);
  let isMarkersCollapsed = $state(true);
  let activeElement: HTMLElement | null = $state(null);
  let innerWidth: number = $state(1000);
  let mapThumbLocation: null | string = $state(null);

  // Track if we're receiving Y.js updates to prevent auto-save cascades
  let isReceivingYjsUpdate = $state(false);
  let hasInitialLoad = $state(false);
  let isWindowFocused = $state(true); // Track if this editor window is focused
  let markersBeingMoved = $state(new Set<string>()); // Track markers currently being moved/saved
  let markersBeingEdited = $state(new Set<string>()); // Track markers being added/edited (for Y.js protection)
  let recentlyDeletedMarkers = $state(new Set<string>()); // Track markers recently deleted to prevent re-adding
  let isActivelyEditing = $state(false); // Track if user is actively making changes
  let lastOwnYjsUpdateTime = $state(0); // Track when we last sent a Y.js update to prevent feedback loops
  let isLocallyReordering = $state(false); // Track if this editor is reordering scenes
  const isMobile = $derived(innerWidth < 768);
  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.0005;

  // Use appropriate pane layout based on device type
  // Initialize with values from cookies/SSR, or defaults
  const getInitialLayout = (key: 'paneLayoutDesktop' | 'paneLayoutMobile', serverValue: PaneConfig[] | undefined) => {
    if (typeof window !== 'undefined') {
      // Client-side: try to get from cookies first
      const saved = getPreference(key);
      if (saved) return saved;
    }
    // Fall back to server value or defaults
    return (
      serverValue ||
      (key === 'paneLayoutDesktop'
        ? [{ size: 20, isCollapsed: false }, { size: 50 }, { size: 30, isCollapsed: true }]
        : [{ size: 25, isCollapsed: false }, { size: 50 }, { size: 25, isCollapsed: true }])
    );
  };

  let clientPaneLayoutDesktop = $state<PaneConfig[]>(getInitialLayout('paneLayoutDesktop', paneLayoutDesktop));
  let clientPaneLayoutMobile = $state<PaneConfig[]>(getInitialLayout('paneLayoutMobile', paneLayoutMobile));

  const paneLayout = $derived(isMobile ? clientPaneLayoutMobile : clientPaneLayoutDesktop);

  // Initialize collapse states from preferences
  $effect(() => {
    if (paneLayout && Array.isArray(paneLayout)) {
      // Both desktop and mobile have 3 panes (start, center, end)
      const startPaneIndex = 0;
      const endPaneIndex = 2;

      isScenesCollapsed = paneLayout[startPaneIndex]?.isCollapsed ?? false;
      isMarkersCollapsed = paneLayout[endPaneIndex]?.isCollapsed ?? true;
    }
  });

  // Calculate reactive minSize for panes (250px for start, 300px for end on desktop, 10% on mobile)
  const startPaneMinSize = $derived(isMobile ? 10 : Math.min(50, Math.ceil((250 / innerWidth) * 100)));
  const endPaneMinSize = $derived(isMobile ? 10 : Math.min(50, Math.ceil((300 / innerWidth) * 100)));

  const updateSceneMutation = useUpdateSceneMutation();
  const updateGameSessionMutation = useUpdateGameSessionMutation();
  const createThumbnailMutation = useUploadSceneThumbnailMutation();
  const upsertMarkerMutation = useUpsertMarkerMutation();
  const upsertAnnotationMutation = useUpsertAnnotationMutation();
  const updateFogMaskMutation = useUpdateFogMaskMutation();
  const updateAnnotationMaskMutation = useUpdateAnnotationMaskMutation();
  const deleteAnnotationMutation = useDeleteAnnotationMutation();

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
   * SOCKET UPDATES - DEPRECATED
   *
   * Legacy socket broadcasting has been replaced by Y.js synchronization.
   * The playfield now subscribes directly to Y.js scene data.
   * This function is kept as a no-op for backward compatibility.
   */
  const socketUpdate = () => {
    // No-op - Y.js handles synchronization now
  };

  // Register the scene with the property broadcaster for Y.js updates
  $effect(() => {
    const sceneId = selectedScene?.id;
    if (sceneId) {
      registerSceneForPropertyUpdates(sceneId);
      // Y.js initialization is now handled in the stageProps rebuild effect to ensure correct timing
    }
  });

  // Initialize annotation line width from preferences on client side
  $effect(() => {
    if (typeof window !== 'undefined' && stageProps) {
      stageProps.annotations.lineWidth = getPreference('annotationLineWidth') || 50;
    }
  });

  // Subscribe to Y.js StageProps changes for the current scene
  $effect(() => {
    const sceneId = selectedScene?.id;
    if (!partyData || !sceneId || !isHydrated) return;

    devLog('scene', 'DEV: Setting up Y.js subscription for scene:', sceneId);
    const currentSceneId = sceneId; // Capture the scene ID to avoid closure issues

    // Also ensure the scene has observers set up in Y.js
    // This is important for editor-to-editor sync
    partyData.getSceneData(currentSceneId);

    const unsubscribe = partyData.subscribe(() => {
      // Make sure we're still looking at the same scene
      if (currentSceneId !== selectedScene?.id) {
        return;
      }

      // Don't block Y.js updates completely when editing - we still want updates from other editors!
      // The mergeMarkersWithProtection function will handle protecting our local changes

      // Check if this might be our own update echoing back
      const timeSinceOwnUpdate = Date.now() - lastOwnYjsUpdateTime;
      if (isActivelyEditing && timeSinceOwnUpdate < 500) {
        return;
      }

      // SSR protection: block the first Y.js update if we're in the protection period
      const timeSincePageLoad = Date.now() - pageLoadTime;
      if (!hasReceivedFirstYjsUpdate && timeSincePageLoad < ssrProtectionPeriod) {
        devLog(
          'save',
          `DEV: 🛡️ PROTECTING fresh SSR data - blocking first Y.js update (${timeSincePageLoad}ms since page load)`
        );
        hasReceivedFirstYjsUpdate = true; // Mark that we've received the first update
        return;
      }

      // Allow all subsequent updates (real-time collaboration)
      if (!hasReceivedFirstYjsUpdate) {
        hasReceivedFirstYjsUpdate = true;
      }

      const sceneData = partyData!.getSceneData(currentSceneId);
      if (sceneData && sceneData.stageProps) {
        // Update local stageProps with shared properties from Y.js, preserving local-only properties
        const incomingStageProps = sceneData.stageProps;

        // Get current local state for comparison
        const currentStagePropsSnapshot = $state.snapshot(stageProps);

        // Check if user is currently drawing on fog or annotations
        const isDrawingFog = stage?.fogOfWar?.isDrawing() ?? false;
        const isDrawingAnnotation = stage?.annotations?.isDrawing() ?? false;

        if (isDrawingFog || isDrawingAnnotation) {
          devLog('yjs', 'Blocking Y.js update for drawing layer', { isDrawingFog, isDrawingAnnotation });
        }

        // Log map URL changes for debugging
        if (incomingStageProps.map?.url !== stageProps.map.url) {
          devLog('yjs', '🗺️ Map URL change detected from Y.js:', {
            old: stageProps.map.url,
            new: incomingStageProps.map?.url
          });
        }

        // Create a merged stageProps that preserves local-only properties
        const mergedStageProps = {
          ...incomingStageProps,
          // Preserve local activeLayer (fog tools, etc.)
          activeLayer: stageProps.activeLayer,
          // Explicitly handle map to ensure URL updates are propagated
          map: {
            ...incomingStageProps.map,
            // Map URL should always come from Y.js to ensure sync
            url: incomingStageProps.map?.url || stageProps.map.url
          },
          scene: {
            ...incomingStageProps.scene,
            // Override with local viewport state (must come after the spread)
            offset: stageProps.scene.offset,
            zoom: stageProps.scene.zoom,
            rotation: stageProps.scene.rotation
          },
          marker: {
            ...incomingStageProps.marker,
            // Protect markers being moved or edited from Y.js overwrites
            markers: mergeMarkersWithProtection(
              stageProps.marker?.markers || [],
              incomingStageProps.marker?.markers || sceneData.markers || [],
              markersBeingMoved,
              markersBeingEdited,
              recentlyDeletedMarkers
            )
          },
          fogOfWar: {
            ...incomingStageProps.fogOfWar,
            // Ensure opacity is always an object (migrate old single-value format)
            opacity:
              typeof incomingStageProps.fogOfWar?.opacity === 'object'
                ? incomingStageProps.fogOfWar.opacity
                : {
                    dm: incomingStageProps.fogOfWar?.opacity ?? 0.3,
                    player: incomingStageProps.fogOfWar?.opacity ?? 0.9
                  },
            // Block fog URL updates while drawing
            url: isDrawingFog ? stageProps.fogOfWar.url : incomingStageProps.fogOfWar.url,
            tool: {
              ...incomingStageProps.fogOfWar.tool,
              // Preserve local brush size or use default from preferences
              size: stageProps.fogOfWar.tool.size || getPreference('brushSize') || 75
            }
          },
          annotations: {
            ...incomingStageProps.annotations,
            // Preserve local activeLayer for annotations (should not be shared)
            activeLayer: stageProps.annotations.activeLayer,
            // Preserve local lineWidth (global setting)
            lineWidth: stageProps.annotations.lineWidth || getPreference('annotationLineWidth') || 50,
            // Block annotation URL updates while drawing
            layers: isDrawingAnnotation
              ? stageProps.annotations.layers.map((localLayer) => {
                  const incomingLayer = incomingStageProps.annotations.layers.find((l) => l.id === localLayer.id);
                  return incomingLayer ? { ...incomingLayer, url: localLayer.url } : localLayer;
                })
              : incomingStageProps.annotations.layers
          },
          // Preserve entire measurement object (it's local-only/ephemeral)
          measurement: stageProps.measurement
        };

        // Only update if there are actual changes to avoid infinite loops
        // Use $state.snapshot to get actual values from Svelte proxy for comparison
        if (JSON.stringify(mergedStageProps) !== JSON.stringify(currentStagePropsSnapshot)) {
          // Set flag to prevent auto-save from triggering on Y.js updates
          isReceivingYjsUpdate = true;
          stageProps = mergedStageProps;

          // Check for mask version changes and fetch updated masks
          // Fog mask version changed
          if (
            !isDrawingFog &&
            mergedStageProps.fogOfWar?.maskVersion &&
            mergedStageProps.fogOfWar.maskVersion !== currentStagePropsSnapshot.fogOfWar?.maskVersion
          ) {
            devLog('yjs', 'Fog mask version changed, fetching new mask');
            fetchFogMask(selectedScene.id);
          }

          // Annotation mask versions changed
          if (!isDrawingAnnotation && mergedStageProps.annotations?.layers) {
            for (const layer of mergedStageProps.annotations.layers) {
              const oldLayer = currentStagePropsSnapshot.annotations?.layers?.find((l) => l.id === layer.id);
              if (layer.maskVersion && layer.maskVersion !== oldLayer?.maskVersion) {
                devLog('yjs', `Annotation mask version changed for layer ${layer.id}, fetching new mask`);
                fetchAnnotationMask(layer.id);
              }
            }
          }

          // Reset flag after the update - longer timeout to prevent auto-save loop
          setTimeout(() => {
            isReceivingYjsUpdate = false;
          }, 1000);

          // Playfield now subscribes directly to Y.js - no need for Socket.IO broadcast
        }
      }
    });

    return () => {
      unsubscribe();
    };
  });

  // Track when initial load is complete to prevent auto-save on hydration
  const currentSceneId = $derived(selectedScene?.id);
  $effect(() => {
    if (isHydrated && stageProps && currentSceneId) {
      // Wait a moment to ensure all initial updates are complete
      setTimeout(() => {
        hasInitialLoad = true;
      }, 500); // Reduced from 1000ms to 500ms for faster response
    }
  });

  // Handle annotation layer activation/deactivation
  $effect(() => {
    if (stageProps.activeLayer === MapLayerType.Annotation) {
      // Ensure the annotation panel is open
      if (activeControl !== 'annotation') {
        activeControl = 'annotation';
        markersPane.expand();
      }

      // Check if there are any annotation layers
      if (stageProps.annotations.layers.length === 0) {
        // No annotations exist, create one
        onAnnotationCreated();
      } else if (!stageProps.annotations.activeLayer) {
        // Annotations exist but none are selected, select the first one
        const firstAnnotation = stageProps.annotations.layers[0];
        queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], firstAnnotation.id, 'control');
      }
    } else if (stageProps.annotations.activeLayer) {
      // Annotation tool was deactivated, clear the active annotation to prevent drawing
      queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
    }
  });

  // Handle marker layer activation/deactivation
  $effect(() => {
    if (stageProps.activeLayer === MapLayerType.Marker) {
      // Ensure the marker panel is open
      if (activeControl !== 'marker') {
        activeControl = 'marker';
        markersPane.expand();
      }
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

    const previousControl = activeControl;
    const newActiveControl = handleKeyCommands(event, stageProps, activeControl, stage, handleSelectActiveControl);
    activeControl = newActiveControl;

    // Update popover state based on keyboard command
    // Close any open popovers when:
    // 1. The active control changes
    // 2. Or when any tool is activated (erase, marker, annotation, measurement)
    if (
      previousControl !== newActiveControl ||
      ['erase', 'marker', 'annotation', 'measurement', 'none'].includes(newActiveControl)
    ) {
      keyboardPopoverId = null; // This will close any open popover
    }
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

  onMount(() => {
    // Set up callback for property updates to trigger auto-save
    setUserChangeCallback(startAutoSaveTimer);

    let unsubscribeYjs: (() => void) | null = null;

    // Initialize Y.js for scene list synchronization
    try {
      devLog('scene', 'DEV: Initializing Y.js for scene list sync...');
      // Use the party slug from the URL params for the room name
      const partySlug = page.params.party;
      if (!partySlug) {
        throw new Error('Party slug is required');
      }

      // Check if we need to reinitialize (different game session)
      const existingManager = getPartyDataManager();
      if (!existingManager || existingManager.gameSessionId !== gameSession.id) {
        initializePartyDataManager(partySlug, user.id, gameSession.id, data.partykitHost);
      }
      partyData = usePartyData();

      // Generate a consistent color for this user session
      const userColor = `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0')}`;

      // Create throttled cursor update function (30 FPS for smooth LCD TV display)
      throttledCursorUpdate = throttle((worldPosition: { x: number; y: number; z: number }) => {
        partyData!.updateCursor(worldPosition, userColor, user.email);
      }, 33); // 33ms = ~30 FPS

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

        // Update hovered marker for players to see what DM is hovering
        if (stageProps.mode === StageMode.Player) {
          hoveredMarker = partyData!.getHoveredMarker();
          pinnedMarkerIds = partyData!.getPinnedMarkers();
        }

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
      devError('scene', 'Error initializing Y.js scene sync:', error);
      // Even if Y.js fails, mark as hydrated to prevent hydration issues
      isHydrated = true;
    }

    // Cursor tracking is now handled via Y.js awareness protocol
    // No need for separate socket connection setup

    if (stageElement) {
      stageElement.addEventListener('mousemove', onMouseMove);
      stageElement.addEventListener('mouseleave', () => {
        isCursorInScene = false;
      });
      stageElement.addEventListener('wheel', onWheel, { passive: false });

      stageElement.addEventListener(
        'contextmenu',
        function (e) {
          e.preventDefault();
        },
        false
      );
    }

    // Set up periodic drift check timer (every 30 seconds)
    driftCheckTimer = setInterval(() => {
      checkForDrift();
    }, 30000); // 30 seconds

    // Set up periodic protection cleanup timer (every 15 seconds)
    // This ensures markers don't stay protected forever if something goes wrong
    protectionCleanupTimer = setInterval(() => {
      const now = Date.now();
      const protectionTimeout = 15000; // 15 seconds max protection

      if (markersBeingMoved.size > 0 || markersBeingEdited.size > 0) {
        if (!isActivelyEditing && now - lastOwnYjsUpdateTime > protectionTimeout) {
          devLog('markers', 'Periodic cleanup: clearing old marker protections', {
            beingMoved: Array.from(markersBeingMoved),
            beingEdited: Array.from(markersBeingEdited),
            timeSinceLastUpdate: now - lastOwnYjsUpdateTime
          });
          markersBeingMoved.clear();
          markersBeingEdited.clear();
        }
      }
    }, 15000);

    return () => {
      if (saveTimer) clearTimeout(saveTimer);
      if (editingTimer) clearTimeout(editingTimer);
      if (driftCheckTimer) clearInterval(driftCheckTimer);
      if (protectionCleanupTimer) clearInterval(protectionCleanupTimer);
      if (fogUpdateTimer) clearTimeout(fogUpdateTimer);
      // Clear all annotation timers
      annotationUpdateTimers.forEach((timer) => clearTimeout(timer));
      annotationUpdateTimers.clear();
      if (unsubscribeYjs) {
        unsubscribeYjs();
      }
      // Socket cleanup handled by partyData.destroy()
    };
  });

  // Helper to save collapse state when panes are toggled
  const saveCollapseState = () => {
    if (!paneLayout || !Array.isArray(paneLayout)) return;

    // Use current pane sizes when saving collapse state
    const sizes = paneLayout.map((p) => p.size);
    onLayoutChange(sizes);
  };

  // This toggles the scene selector pane
  const handleToggleScenes = () => {
    if (isScenesCollapsed) {
      scenesPane.expand();
    } else {
      scenesPane.collapse();
    }
    // Save the collapse state will be handled by the pane onExpand/onCollapse handlers
  };

  const handleToggleMarkers = () => {
    if (isMarkersCollapsed) {
      markersPane.expand();
    } else {
      markersPane.collapse();
    }
    // Save the collapse state will be handled by the pane onExpand/onCollapse handlers
  };

  const handleSelectActiveControl = (control: string, openPopover?: string | null): string | null => {
    // If same control is clicked, toggle it off
    if (control === activeControl) {
      activeControl = 'none';
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      // Clear annotation active layer when deselecting
      if (control === 'annotation') {
        queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
      }
      return null; // Close popover
    }

    // Switch to new control
    activeControl = control;

    // Handle specific control types
    if (control === 'marker') {
      selectedMarkerId = undefined;
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Marker, 'control');
      // Clear annotation active layer when switching away
      queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
      if (markersPane) {
        markersPane.expand();
      }
    } else if (control === 'annotation') {
      selectedAnnotationId = undefined;
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Annotation, 'control');
      if (markersPane) {
        markersPane.expand();
      }
    } else if (control === 'measurement') {
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Measurement, 'control');
      // Clear annotation active layer when switching away
      queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
    } else if (control === 'erase') {
      // Fog tool
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.FogOfWar, 'control');
      // Clear annotation active layer when switching to fog tool
      queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
    } else {
      // Other scene controls (map, fog, weather, grid, edge, effects, play)
      // These don't have an active layer, just popover controls
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
    }

    // Return the popover ID that should be open (or null if it's a non-popover control)
    return openPopover !== undefined ? openPopover : control;
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
  let currentSelectedSceneAnnotations = $derived(data.selectedSceneAnnotations);

  // Get the Y.js version of the selected scene if available (has the latest mapLocation)
  let yjsSelectedScene = $derived(yjsScenes.find((s) => s.id === selectedScene?.id) || currentSelectedScene);

  // Track the last mapLocation we built props for
  let lastBuiltMapLocation = $state<string | null | undefined>(undefined);

  $effect(() => {
    const currentSceneId = currentSelectedScene?.id;
    const isSceneSwitch = currentSceneId !== previousSceneId;

    // Get the current mapLocation from Y.js for comparison
    const currentMapLocation = yjsSelectedScene?.mapLocation || currentSelectedScene?.mapLocation;

    // Use Y.js data if available when not switching scenes (it has the latest mapLocation)
    // But on scene switch, use SSR data to ensure all properties are loaded from DB
    const sceneToUse =
      !isSceneSwitch && yjsSelectedScene
        ? { ...currentSelectedScene, mapLocation: yjsSelectedScene.mapLocation }
        : currentSelectedScene;

    // Check if we need to rebuild due to map change
    const mapLocationChanged = currentMapLocation !== lastBuiltMapLocation;

    if (isSceneSwitch) {
      devLog('scene', 'Scene switch detected:', {
        from: previousSceneId,
        to: currentSceneId,
        isInitialLoad: !previousSceneId,
        mapLocationChanged,
        gameSessionId: gameSession.id,
        timestamp: Date.now()
      });
    }

    // Only rebuild stageProps when scene switches, initial load, or map actually changes
    if (isSceneSwitch || !stageProps || mapLocationChanged) {
      // This is a scene switch or initial load - rebuild everything
      // Always use database markers for buildSceneProps as it expects the database format
      const markersToUse = currentSelectedSceneMarkers;

      stageProps = buildSceneProps(sceneToUse, markersToUse, 'editor', currentSelectedSceneAnnotations);
      // Preserve local annotation line width preference
      stageProps.annotations.lineWidth = getPreference('annotationLineWidth') || 50;

      // Apply brush size from cookie if available
      if (brushSize) {
        stageProps.fogOfWar.tool.size = brushSize;
      }
      lastBuiltMapLocation = currentMapLocation;

      // Initialize Y.js with fresh SSR data after rebuilding stageProps
      if (partyData && currentSceneId) {
        // Only initialize Y.js data if it doesn't exist at all for this scene
        // This prevents overwriting data from other editors
        const existingSceneData = partyData.getSceneData(currentSceneId);

        devLog('scene', 'Y.js scene data check:', {
          sceneId: currentSceneId,
          hasExistingData: !!existingSceneData,
          hasStageProps: !!existingSceneData?.stageProps,
          markerCount: existingSceneData?.markers?.length || 0,
          lastUpdated: existingSceneData?.lastUpdated || null,
          isSceneSwitch,
          timestamp: Date.now()
        });

        if (!existingSceneData) {
          // Create a copy of stageProps without local-only properties for Y.js storage
          const sharedStageProps = {
            ...stageProps,
            // Reset local-only properties to defaults for shared state
            activeLayer: MapLayerType.None,
            scene: {
              ...stageProps.scene,
              // Reset local-only scene properties to defaults for shared state
              offset: { x: 0, y: 0 },
              zoom: 1,
              rotation: 0
            },
            annotations: {
              ...stageProps.annotations,
              // Reset annotation activeLayer - it's local only
              activeLayer: null
            }
          };

          devLog('scene', 'Initializing Y.js scene data:', {
            sceneId: currentSceneId,
            markerCount: currentSelectedSceneMarkers?.length || 0,
            timestamp: Date.now()
          });

          // Initialize Y.js with the current scene data
          partyData.initializeSceneData(currentSceneId, sharedStageProps, currentSelectedSceneMarkers || []);
        } else if (isSceneSwitch) {
          devLog('scene', 'Scene switch - Y.js data already exists, not reinitializing');
        } else {
          // Not a scene switch - check if we have new markers from SSR that Y.js doesn't know about
          const yjsMarkerIds = new Set((existingSceneData.markers || []).map((m: Marker) => m.id));
          const ssrMarkerIds = new Set((currentSelectedSceneMarkers || []).map((m) => m.id));
          const newMarkersFromSSR = [...ssrMarkerIds].filter((id) => !yjsMarkerIds.has(id));

          if (newMarkersFromSSR.length > 0) {
            devLog('scene', 'Updating Y.js with new markers from SSR:', {
              sceneId: currentSceneId,
              newMarkerIds: newMarkersFromSSR,
              totalMarkers: stageProps.marker.markers.length,
              timestamp: Date.now()
            });
            // Update Y.js with the current stageProps that includes the new markers
            lastOwnYjsUpdateTime = Date.now();
            partyData.updateSceneStageProps(currentSceneId, cleanStagePropsForYjs(stageProps));
          }
        }
      }
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

      // Check if any recently saved markers are still missing from SSR data
      const waitingForSSRUpdate = Array.from(recentlySavedMarkerIds).some(
        (markerId) => !currentSelectedSceneMarkers?.some((m) => m.id === markerId)
      );

      // Skip marker-based rebuilds if user is actively editing or waiting for SSR update
      if (markersChanged && !isActivelyEditing && markersBeingEdited.size === 0 && !waitingForSSRUpdate) {
        // Check if we have Y.js data available
        const yjsSceneData = partyData?.getSceneData(currentSceneId);
        const hasYjsData = yjsSceneData && yjsSceneData.stageProps && yjsSceneData.stageProps.marker;

        // If Y.js has data and is connected, trust it over SSR
        if (hasYjsData && partyData?.getConnectionStatus()) {
          // Don't rebuild from SSR - Y.js data is already being applied
        } else if ((currentSelectedSceneMarkers?.length || 0) > stageProps.marker.markers.length) {
          // Only use SSR data if Y.js is not available AND SSR has more markers
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

          stageProps = buildSceneProps(
            sceneToUse,
            currentSelectedSceneMarkers,
            'editor',
            currentSelectedSceneAnnotations
          );
          // Preserve local annotation line width preference
          stageProps.annotations.lineWidth = getPreference('annotationLineWidth') || 50;

          // Restore viewport state
          stageProps.map.offset = currentMapState.offset;
          stageProps.map.zoom = currentMapState.zoom;
          stageProps.map.rotation = currentMapState.rotation;
          stageProps.scene.offset = currentSceneState.offset;
          stageProps.scene.zoom = currentSceneState.zoom;
          stageProps.scene.rotation = currentSceneState.rotation;

          // Apply brush size from cookie if available
          if (brushSize) {
            stageProps.fogOfWar.tool.size = brushSize;
          }
        }
      } else if (markersChanged) {
        devLog('markers', 'DEV: [StageProps Effect] Skipping marker rebuild:', {
          isActivelyEditing,
          markersBeingEdited: markersBeingEdited.size,
          waitingForSSRUpdate,
          recentlySavedMarkers: Array.from(recentlySavedMarkerIds),
          currentMarkers: stageProps.marker.markers.length,
          ssrMarkers: currentSelectedSceneMarkers?.length || 0
        });
      }
    }

    previousSceneId = currentSceneId;
  });

  // REMOVED: Effect that was overwriting map URL with server thumb
  // We now generate all image URLs client-side in buildSceneProps

  // Effect removed - Y.js now handles all synchronization automatically

  const onMapUpdate = (offset: { x: number; y: number }, zoom: number) => {
    queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], offset.x, 'control');
    queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], offset.y, 'control');
    queuePropertyUpdate(stageProps, ['map', 'zoom'], zoom, 'control');
  };

  const onSceneUpdate = (offset: { x: number; y: number }, zoom: number) => {
    // Scene offset and zoom are local-only properties - update directly without Y.js sync
    stageProps.scene.offset.x = offset.x;
    stageProps.scene.offset.y = offset.y;
    stageProps.scene.zoom = zoom;
  };

  const onStageLoading = () => {
    stageIsLoading = true;
  };

  const onStageInitialized = async () => {
    stageIsLoading = false;

    // Load fog mask if available
    if (data.selectedSceneFogMask && stage?.fogOfWar?.fromRLE) {
      try {
        // Convert base64 back to Uint8Array
        const binaryString = atob(data.selectedSceneFogMask);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Apply the mask to the fog layer
        // The dimensions are now embedded in the RLE data
        await stage.fogOfWar.fromRLE(bytes, 1024, 1024);
      } catch (error) {
        devError('fog', 'Error loading fog mask:', error);
      }
    }

    // Load annotation masks if available
    if (data.selectedSceneAnnotationMasks && stage?.annotations?.loadMask) {
      try {
        for (const [annotationId, maskData] of Object.entries(data.selectedSceneAnnotationMasks)) {
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
        devError('annotations', 'Error loading annotation masks:', error);
      }
    }
  };

  const onMarkerAdded = (marker: Marker) => {
    // Add marker to local state immediately
    const updatedMarkers = [...stageProps.marker.markers, marker];
    stageProps.marker.markers = updatedMarkers; // Keep direct mutation for immediate UI feedback
    selectedMarkerId = marker.id;

    // Add marker to protection set BEFORE any sync to prevent Y.js from overwriting
    markersBeingEdited.add(marker.id);

    // Set actively editing flag and track our update time
    isActivelyEditing = true;
    lastOwnYjsUpdateTime = Date.now();

    // Clear any existing editing timer and set new one (shorter timeout)
    if (editingTimer) clearTimeout(editingTimer);
    editingTimer = setTimeout(() => {
      isActivelyEditing = false;
    }, 1000); // Clear after 1 second

    // Queue the update which will handle both Y.js sync and database save
    queuePropertyUpdate(stageProps, ['marker', 'markers'], stageProps.marker.markers, 'marker');

    // For new markers, we want immediate sync to ensure they appear in other editors
    // Force a manual Y.js sync right away for this critical operation
    if (partyData && selectedScene?.id) {
      lastOwnYjsUpdateTime = Date.now();
      partyData.updateSceneStageProps(selectedScene.id, cleanStagePropsForYjs(stageProps));
    }

    // Keep the marker protected for longer to handle save completion
    // But add a maximum timeout to prevent permanent protection
    setTimeout(() => {
      if (markersBeingEdited.has(marker.id)) {
        devLog('markers', 'Removing marker from edit protection after timeout', marker.id);
        markersBeingEdited.delete(marker.id);
      }
    }, 5000); // Keep protected for 5 seconds to ensure save completes

    // Note: The window blur handler will clear all protections if focus is lost
  };

  const onMarkerMoved = (marker: Marker, position: { x: number; y: number }) => {
    const index = stageProps.marker.markers.findIndex((m: Marker) => m.id === marker.id);
    if (index !== -1) {
      // Update marker position immediately
      stageProps.marker.markers[index] = {
        ...marker,
        position: { x: position.x, y: position.y }
      };

      // Mark this marker as being moved to protect it from Y.js overwrites
      markersBeingMoved.add(marker.id);

      // Set actively editing flag and track our update time
      isActivelyEditing = true;
      lastOwnYjsUpdateTime = Date.now();

      // Clear any existing editing timer and set new one (shorter timeout)
      if (editingTimer) clearTimeout(editingTimer);
      editingTimer = setTimeout(() => {
        isActivelyEditing = false;
      }, 1000); // Clear after 1 second

      // Add a safety timeout to ensure marker doesn't stay protected forever
      // This prevents sync issues if save fails or window loses focus
      setTimeout(() => {
        if (markersBeingMoved.has(marker.id)) {
          devLog('markers', 'Safety timeout: removing marker from protection', marker.id);
          markersBeingMoved.delete(marker.id);
        }
      }, 10000);

      // Use queuePropertyUpdate which will handle Y.js sync automatically
      queuePropertyUpdate(stageProps, ['marker', 'markers'], stageProps.marker.markers, 'marker');

      // Marker position updates now handled through Y.js synchronization
      // No need for separate Socket.IO broadcast

      // Delay auto-save for marker moves to avoid conflicts during dragging
      // Clear any existing timer and set a longer delay
      if (saveTimer) clearTimeout(saveTimer);
      if (isWindowFocused && !isReceivingYjsUpdate && hasInitialLoad && !isSaving) {
        saveTimer = setTimeout(() => {
          if (isWindowFocused && !isReceivingYjsUpdate && hasInitialLoad && !isSaving) {
            saveScene();
            // Remove marker from being moved set after save
            markersBeingMoved.delete(marker.id);
          } else {
            // Save was cancelled - remove protection
            markersBeingMoved.delete(marker.id);
          }
        }, 5000);
      }
    }
  };

  const onMarkerSelected = (marker: Marker | null) => {
    selectedMarkerId = marker?.id || undefined;
  };

  const onMarkerContextMenu = (marker: Marker, event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      alert('You clicked on marker: ' + marker.title + ' at ' + event.pageX + ',' + event.pageY);
    } else {
      alert('You clicked on marker: ' + marker.title + ' at ' + event.touches[0].pageX + ',' + event.touches[0].pageY);
    }
  };

  const onPinToggle = (markerId: string, pinned: boolean) => {
    if (stageProps.mode === StageMode.DM && partyData) {
      let newPinnedIds: string[];
      if (pinned) {
        // Add to pinned markers
        newPinnedIds = [...pinnedMarkerIds, markerId];
      } else {
        // Remove from pinned markers
        newPinnedIds = pinnedMarkerIds.filter((id) => id !== markerId);
      }
      pinnedMarkerIds = newPinnedIds;
      partyData.updatePinnedMarkers(newPinnedIds);
      devLog('markers', `Marker ${pinned ? 'pinned' : 'unpinned'}:`, markerId);
    }
  };

  const onMarkerHover = (marker: Marker | null) => {
    if (stageProps.mode === StageMode.DM) {
      if (marker && marker.visibility === MarkerVisibility.Hover) {
        // Create the hoveredMarker data
        const hoveredMarkerData = {
          id: marker.id,
          position: {
            x: marker.position.x,
            y: marker.position.y,
            z: 0 // Markers are on a 2D plane
          },
          tooltip: {
            title: marker.title,
            content: marker.note ? JSON.stringify(marker.note) : '',
            imageUrl: marker.imageUrl || undefined
          }
        };

        // Set local state for DM to see the tooltip
        hoveredMarker = hoveredMarkerData;

        // Broadcast to players if connected
        if (partyData) {
          partyData.updateHoveredMarker(hoveredMarkerData);
          devLog('markers', 'Broadcasting hovered marker:', hoveredMarkerData);
        }
      } else {
        // Clear hover broadcast when not hovering a Hover visibility marker
        hoveredMarker = null;
        if (partyData) {
          partyData.updateHoveredMarker(null);
        }
        if (marker && marker.visibility !== MarkerVisibility.Hover) {
          devLog('markers', 'Marker not set to Hover visibility, not broadcasting');
        } else {
          devLog('markers', 'Clearing hovered marker');
        }
      }
    }
  };

  // Measurement callbacks for Y.js broadcasting
  const onMeasurementStart = (startPoint: { x: number; y: number }, type: number) => {
    // Broadcast measurement start to all clients via Y.js awareness
    if (partyData && stageProps.measurement) {
      const measurementProps = {
        color: stageProps.measurement.color,
        thickness: stageProps.measurement.thickness,
        outlineColor: stageProps.measurement.outlineColor,
        outlineThickness: stageProps.measurement.outlineThickness,
        opacity: stageProps.measurement.opacity,
        markerSize: stageProps.measurement.markerSize,
        autoHideDelay: stageProps.measurement.autoHideDelay,
        fadeoutTime: stageProps.measurement.fadeoutTime,
        showDistance: stageProps.measurement.showDistance,
        snapToGrid: stageProps.measurement.snapToGrid,
        enableDMG252: stageProps.measurement.enableDMG252,
        beamWidth: stageProps.measurement.beamWidth,
        coneAngle: stageProps.measurement.coneAngle
      };
      partyData.updateMeasurement(startPoint, startPoint, type, measurementProps);
      devLog('measurement', 'Broadcasting measurement start:', { startPoint, type, measurementProps });
    }
  };

  const onMeasurementUpdate = (
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    type: number
  ) => {
    // Broadcast measurement update to all clients via Y.js awareness
    if (partyData && stageProps.measurement) {
      const measurementProps = {
        color: stageProps.measurement.color,
        thickness: stageProps.measurement.thickness,
        outlineColor: stageProps.measurement.outlineColor,
        outlineThickness: stageProps.measurement.outlineThickness,
        opacity: stageProps.measurement.opacity,
        markerSize: stageProps.measurement.markerSize,
        autoHideDelay: stageProps.measurement.autoHideDelay,
        fadeoutTime: stageProps.measurement.fadeoutTime,
        showDistance: stageProps.measurement.showDistance,
        snapToGrid: stageProps.measurement.snapToGrid,
        enableDMG252: stageProps.measurement.enableDMG252,
        beamWidth: stageProps.measurement.beamWidth,
        coneAngle: stageProps.measurement.coneAngle
      };
      partyData.updateMeasurement(startPoint, endPoint, type, measurementProps);
    }
  };

  const onMeasurementEnd = () => {
    // Clear measurement when finished (it will fade out on its own in the playfield)
    if (partyData) {
      partyData.updateMeasurement(null, null, 0);
      devLog('measurement', 'Clearing measurement broadcast');
    }
  };

  const onMarkerDeleted = (markerId: string) => {
    // Double-check the marker is removed from local state
    const filteredMarkers = stageProps.marker.markers.filter((m) => m.id !== markerId);

    // Only update if the marker was actually found and removed
    if (filteredMarkers.length < stageProps.marker.markers.length) {
      // Update the markers array
      stageProps.marker.markers = filteredMarkers;

      // Add to recently deleted set to prevent re-adding from Y.js
      recentlyDeletedMarkers.add(markerId);

      // Remove from protection sets if it was there
      markersBeingEdited.delete(markerId);
      markersBeingMoved.delete(markerId);

      // Set actively editing flag
      isActivelyEditing = true;
      lastOwnYjsUpdateTime = Date.now();

      // Clear any existing editing timer and set new one
      if (editingTimer) clearTimeout(editingTimer);
      editingTimer = setTimeout(() => {
        isActivelyEditing = false;
      }, 1000);

      // Force immediate Y.js sync for marker deletion
      if (partyData && selectedScene?.id) {
        lastOwnYjsUpdateTime = Date.now();
        partyData.updateSceneStageProps(selectedScene.id, cleanStagePropsForYjs(stageProps));
      }

      // Queue property update for database save
      queuePropertyUpdate(stageProps, ['marker', 'markers'], stageProps.marker.markers, 'marker');

      // Clear from recently deleted after some time (to allow Y.js to propagate)
      setTimeout(() => {
        recentlyDeletedMarkers.delete(markerId);
      }, 10000); // Keep for 10 seconds
    } else {
      devWarn('markers', 'DEV: Marker not found for deletion:', markerId);
    }
  };

  const onAnnotationDeleted = async (annotationId: string) => {
    // Delete annotation from database
    await handleMutation({
      mutation: () => $deleteAnnotationMutation.mutateAsync({ annotationId }),
      formLoadingState: () => {},
      onSuccess: async () => {
        // After deletion, update the orders of remaining annotations to remove gaps
        const remainingLayers = stageProps.annotations.layers.filter((layer) => layer.id !== annotationId);

        // Save all remaining annotations with their new sequential orders
        const updatePromises = remainingLayers.map(async (layer, index) => {
          const annotationData = convertAnnotationToDbFormat(layer, selectedScene.id, index);
          return $upsertAnnotationMutation.mutateAsync(annotationData);
        });

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        // Trigger auto-save after annotation deletion
        startAutoSaveTimer();
      },
      toastMessages: {
        error: { title: 'Error deleting annotation' }
      }
    });
  };

  // Track annotation save state to prevent loops
  let annotationSaveInProgress = $state<Set<string>>(new Set());

  const onAnnotationUpdated = async (annotation: AnnotationLayerData) => {
    // Prevent duplicate saves
    if (annotationSaveInProgress.has(annotation.id)) {
      return;
    }

    // Save annotation updates to database
    annotationSaveInProgress.add(annotation.id);

    // Convert to database format
    const annotationData = convertAnnotationToDbFormat(
      annotation,
      selectedScene.id,
      stageProps.annotations.layers.findIndex((a) => a.id === annotation.id)
    );

    await handleMutation({
      mutation: () => $upsertAnnotationMutation.mutateAsync(annotationData),
      formLoadingState: () => {},
      onSuccess: () => {
        // Remove from in-progress after successful save
        annotationSaveInProgress.delete(annotation.id);
        // Trigger auto-save after annotation update
        startAutoSaveTimer();
      },
      onError: () => {
        // Remove from in-progress on error too
        annotationSaveInProgress.delete(annotation.id);
      },
      toastMessages: {
        error: { title: 'Error saving annotation' }
      }
    });
  };

  // Generate random high-contrast colors that complement #d73e2e
  const getRandomAnnotationColor = () => {
    const annotationColors = [
      '#d73e2e', // Red
      '#ffa500', // Orange
      '#ffd93d', // Yellow
      '#6bcf7f', // Green
      '#2e86ab', // Blue
      '#b197fc', // Purple
      '#f06595', // Pink
      '#20c997', // Turquoise
      '#845ef7', // Violet
      '#4c6ef5', // Royal Blue
      '#15803d', // Forest Green
      '#dc2626', // Crimson
      '#06b6d4', // Cyan
      '#ec4899', // Hot Pink
      '#8b5cf6', // Indigo
      '#059669' // Emerald
    ];

    return annotationColors[Math.floor(Math.random() * annotationColors.length)];
  };

  const onAnnotationCreated = async () => {
    // Create a new annotation layer
    const newAnnotation: AnnotationLayerData = {
      id: crypto.randomUUID(),
      name: `Drawing ${stageProps.annotations.layers.length + 1}`,
      color: getRandomAnnotationColor(),
      opacity: 1.0,
      visibility: StageMode.Player,
      url: null
    };

    // Add the new annotation to the beginning of the layers array
    const updatedLayers = [newAnnotation, ...stageProps.annotations.layers];
    queuePropertyUpdate(stageProps, ['annotations', 'layers'], updatedLayers, 'control');

    // Set it as the active layer
    queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], newAnnotation.id, 'control');
    queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Annotation, 'control');

    // Select it for editing
    selectedAnnotationId = newAnnotation.id;

    // Ensure annotations panel is expanded
    if (activeControl !== 'annotation') {
      handleSelectActiveControl('annotation');
    }

    // Save all annotations with their correct orders in a single batch
    // This prevents race conditions when adding multiple annotations quickly
    const savePromises = updatedLayers.map(async (layer, index) => {
      const annotationData = convertAnnotationToDbFormat(layer, selectedScene.id, index);
      return $upsertAnnotationMutation.mutateAsync(annotationData);
    });

    await handleMutation({
      mutation: () => Promise.all(savePromises),
      formLoadingState: () => {},
      onSuccess: () => {
        // Trigger auto-save after creation
        startAutoSaveTimer();
      },
      toastMessages: {
        error: { title: 'Error creating annotation' }
      }
    });
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

    // Check if cursor is within the visible scene bounds
    isCursorInScene = relativeX >= 0 && relativeX <= rotatedWidth && relativeY >= 0 && relativeY <= rotatedHeight;

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
        const newOffsetX = stageProps.map.offset.x + rotatedMovementX * movementFactor;
        const newOffsetY = stageProps.map.offset.y - rotatedMovementY * movementFactor;

        // Use queuePropertyUpdate for map offset changes
        queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], newOffsetX, 'control');
        queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], newOffsetY, 'control');
      } else if (e.ctrlKey) {
        // Scene offset is local-only, direct mutation is OK
        stageProps.scene.offset.x += rotatedMovementX;
        stageProps.scene.offset.y -= rotatedMovementY;
      }

      // Y.js handles synchronization automatically
    }

    // Cursor tracking is now handled by the Stage component's onCursorMove callback
  };

  function onMapPan(dx: number, dy: number) {
    // Always use free movement for mouse panning (no grid snapping)
    const newOffsetX = stageProps.map.offset.x + dx;
    const newOffsetY = stageProps.map.offset.y + dy;
    queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], newOffsetX, 'control');
    queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], newOffsetY, 'control');
  }

  function onMapRotate(angle: number) {
    queuePropertyUpdate(stageProps, ['map', 'rotation'], angle, 'control');
  }

  function onMapZoom(zoom: number) {
    queuePropertyUpdate(stageProps, ['map', 'zoom'], zoom, 'control');
  }

  function onScenePan(dx: number, dy: number) {
    stageProps.scene.offset.x += dx;
    stageProps.scene.offset.y += dy;
  }

  function onSceneRotate(angle: number) {
    stageProps.scene.rotation = angle;
  }

  function onSceneZoom(zoom: number) {
    queuePropertyUpdate(stageProps, ['scene', 'zoom'], zoom, 'control');
  }

  function handleCursorMove(worldPosition: { x: number; y: number; z: number }) {
    // Only emit cursor if we're editing the active scene
    const shouldEmitCursor = currentActiveScene && currentActiveScene.id === selectedScene.id;

    if (shouldEmitCursor && throttledCursorUpdate) {
      throttledCursorUpdate(worldPosition);
    }
  }

  const onWheel = (e: WheelEvent) => {
    // Handle annotation line width adjustment
    if (stageProps.activeLayer === MapLayerType.Annotation && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();

      let scrollDelta;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        scrollDelta = e.deltaX * 0.05; // Very granular adjustment
      } else {
        scrollDelta = e.deltaY * 0.05; // Very granular adjustment
      }

      // Get current line width from global setting
      const currentLineWidth = stageProps.annotations.lineWidth || 50;

      // Calculate new line width (clamped between 1 and 200)
      const rawLineWidth = currentLineWidth - scrollDelta;
      const newLineWidth = Math.round(Math.max(1, Math.min(rawLineWidth, 200)));

      // Update the global annotation line width
      stageProps.annotations.lineWidth = newLineWidth;

      // Save preference
      setPreference('annotationLineWidth', newLineWidth);

      return;
    }

    // Handle other zoom operations
    handleStageZoom(e, stageProps);
    // Y.js handles synchronization automatically via queuePropertyUpdate
  };

  /**
   * MASK FETCHING
   * MASK FETCHING
   * MASK FETCHING
   *
   * Fetch RLE mask data when maskVersion changes in Y.js
   */

  const fetchFogMask = async (sceneId: string) => {
    try {
      const response = await fetch(`/api/scenes/getFogMask?sceneId=${sceneId}`);
      if (!response.ok) {
        devError('mask', 'Failed to fetch fog mask');
        return;
      }

      const data = (await response.json()) as { maskData?: string };
      if (data.maskData && stage?.fogOfWar?.fromRLE) {
        // Convert base64 back to Uint8Array
        const binaryString = atob(data.maskData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        // Apply the mask to the fog layer
        await stage.fogOfWar.fromRLE(bytes, 1024, 1024);
        devLog('mask', 'Applied updated fog mask from remote');
      }
    } catch (error) {
      devError('mask', 'Error fetching fog mask:', error);
    }
  };

  const fetchAnnotationMask = async (annotationId: string) => {
    try {
      const response = await fetch(`/api/annotations/getMask?annotationId=${annotationId}`);
      if (!response.ok) {
        devError('mask', 'Failed to fetch annotation mask');
        return;
      }

      const data = (await response.json()) as { maskData?: string };
      if (data.maskData && stage?.annotations?.loadMask) {
        // Convert base64 back to Uint8Array
        const binaryString = atob(data.maskData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        // Apply the mask to the annotation layer
        await stage.annotations.loadMask(annotationId, bytes);
        devLog('mask', `Applied updated annotation mask for layer ${annotationId} from remote`);
      }
    } catch (error) {
      devError('mask', 'Error fetching annotation mask:', error);
    }
  };

  /**
   * ANNOTATION LAYER
   * ANNOTATION LAYER
   * ANNOTATION LAYER
   *
   * The Stage component emits a blob when an annotation layer is updated.
   * We upload it and sync via Y.js similar to fog of war.
   */
  let isUpdatingAnnotation = false;
  let annotationUploadAbortControllers: Map<string, AbortController> = new Map();

  const processAnnotationUpdate = async (layerId: string) => {
    if (isSaving) return;

    // Check if user is still drawing
    if (stage?.annotations?.isDrawing()) {
      // User is still drawing, abort the update
      devLog('annotation', 'Aborting annotation update - user is still drawing');
      return;
    }

    // Get RLE encoded data from the specific annotation layer
    const activeLayer = stageProps.annotations.layers.find((layer) => layer.id === layerId);
    if (!activeLayer) {
      devError('annotation', 'Could not find annotation layer:', layerId);
      isUpdatingAnnotation = false;
      return;
    }

    // Set this layer as active temporarily to get its RLE data
    const originalActiveLayer = stageProps.annotations.activeLayer;
    stageProps.annotations.activeLayer = layerId;

    let rleData: Uint8Array;
    try {
      rleData = await stage?.annotations?.toRLE();
      if (!rleData) {
        devError('annotation', 'Failed to get RLE data from annotation layer');
        isUpdatingAnnotation = false;
        return;
      }
    } finally {
      // Restore original active layer
      stageProps.annotations.activeLayer = originalActiveLayer;
    }

    // Create new abort controller for this upload
    const abortController = new AbortController();
    annotationUploadAbortControllers.set(layerId, abortController);

    await handleMutation({
      mutation: () =>
        $updateAnnotationMaskMutation.mutateAsync({
          annotationId: layerId,
          partyId: party.id,
          maskData: rleData
        }),
      formLoadingState: () => {},
      onSuccess: () => {
        // Check if user started drawing while upload was in progress
        if (stage?.annotations?.isDrawing()) {
          devLog('annotation', 'Annotation mask update completed but user is drawing - continuing');
        }

        // Update mask version for this annotation layer
        const layerIndex = stageProps.annotations.layers.findIndex((layer) => layer.id === layerId);
        if (layerIndex !== -1) {
          const newMaskVersion = Date.now();
          stageProps.annotations.layers[layerIndex].maskVersion = newMaskVersion;

          console.log('[Editor] Set annotation maskVersion:', {
            layerId,
            layerIndex,
            newMaskVersion,
            layer: stageProps.annotations.layers[layerIndex]
          });

          // Sync to Y.js for real-time updates
          if (partyData && selectedScene?.id) {
            lastOwnYjsUpdateTime = Date.now();
            console.log('[Editor] Syncing annotation maskVersion to Y.js:', {
              sceneId: selectedScene.id,
              layerId,
              maskVersion: newMaskVersion,
              allLayers: stageProps.annotations.layers.map((l) => ({ id: l.id, maskVersion: l.maskVersion }))
            });
            partyData.updateSceneStageProps(selectedScene.id, cleanStagePropsForYjs(stageProps));
          }
        } else {
          console.error('[Editor] Could not find layer to update maskVersion:', layerId);
        }

        // Clear flag before triggering save so saveScene() doesn't return early
        isUpdatingAnnotation = false;
        annotationUploadAbortControllers.delete(layerId);

        // Try to trigger a scene save now that annotation update is complete
        saveScene();
      },
      onError: () => {
        devError('save', 'Error updating annotation mask');
        isUpdatingAnnotation = false;
        annotationUploadAbortControllers.delete(layerId);
      },
      toastMessages: {
        error: { title: 'Error updating annotation', body: (err) => err.message || 'Unknown error' }
      }
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onAnnotationUpdate = async (layerId: string, _blob: Promise<Blob>) => {
    // If there's an existing upload for this layer, abort it
    const existingController = annotationUploadAbortControllers.get(layerId);
    if (existingController) {
      devLog('annotation', 'Aborting previous annotation upload - new drawing started');
      existingController.abort();
      annotationUploadAbortControllers.delete(layerId);
    }

    isUpdatingAnnotation = true;

    // Clear any existing timer for this layer
    const existingTimer = annotationUpdateTimers.get(layerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set a new timer to process the update after a delay
    const timer = setTimeout(() => {
      processAnnotationUpdate(layerId);
      annotationUpdateTimers.delete(layerId);
    }, 500); // 500ms delay

    annotationUpdateTimers.set(layerId, timer);
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
  let pendingFogBlob: Blob | null = null;
  let pendingFogUpdateId: string | null = null;
  let fogUploadAbortController: AbortController | null = null;

  const processFogUpdate = async () => {
    if (!pendingFogBlob || isSaving) return;

    const updateId = pendingFogUpdateId || 'unknown';

    // Check if user is still drawing
    if (stage?.fogOfWar?.isDrawing()) {
      // User is still drawing, abort the update
      timingLog('FOG-RT', `${updateId} - ABORTED: User still drawing at ${new Date().toISOString()}`);
      devLog('fog', 'Aborting fog update - user is still drawing');
      return;
    }

    pendingFogBlob = null; // Clear pending blob
    pendingFogUpdateId = null; // Clear update ID

    timingLog('FOG-RT', `${updateId} - 3. Starting RLE encoding at ${new Date().toISOString()}`);
    // Get RLE encoded data from the fog layer
    const rleData = await stage?.fogOfWar?.toRLE();
    if (!rleData) {
      devError('fog', 'Failed to get RLE data from fog layer');
      isUpdatingFog = false;
      return;
    }
    timingLog(
      'FOG-RT',
      `${updateId} - 4. RLE encoding complete (${rleData.length} bytes) at ${new Date().toISOString()}`
    );

    // Create new abort controller for this upload
    fogUploadAbortController = new AbortController();

    timingLog('FOG-RT', `${updateId} - 5. Starting database save at ${new Date().toISOString()}`);
    await handleMutation({
      mutation: () =>
        $updateFogMaskMutation.mutateAsync({
          sceneId: selectedScene.id,
          partyId: data.party.id,
          maskData: rleData
        }),
      formLoadingState: () => {},
      onSuccess: () => {
        timingLog('FOG-RT', `${updateId} - 6. Database save complete at ${new Date().toISOString()}`);

        // Check if user started drawing while upload was in progress
        if (stage?.fogOfWar?.isDrawing()) {
          timingLog('FOG-RT', `${updateId} - ABORTED: User started drawing during save at ${new Date().toISOString()}`);
          devLog('fog', 'Fog update completed but user is drawing - skipping update');
          isUpdatingFog = false;
          fogUploadAbortController = null;
          return;
        }

        // Clear the old URL since we're using RLE now
        stageProps.fogOfWar.url = null;

        // Update mask version to signal other clients
        const maskVersion = Date.now();
        stageProps.fogOfWar.maskVersion = maskVersion;
        timingLog('FOG-RT', `${updateId} - 7. Setting mask version ${maskVersion} at ${new Date().toISOString()}`);

        // Immediately sync to Y.js for real-time collaboration
        if (partyData && selectedScene?.id) {
          lastOwnYjsUpdateTime = Date.now(); // Track that we just sent an update
          timingLog('FOG-RT', `${updateId} - 8. Broadcasting Y.js update at ${new Date().toISOString()}`);
          partyData.updateSceneStageProps(selectedScene.id, cleanStagePropsForYjs(stageProps));
          timingLog('FOG-RT', `${updateId} - 9. Y.js broadcast complete at ${new Date().toISOString()}`);
        }

        // Clear flag before triggering save so saveScene() doesn't return early
        isUpdatingFog = false;
        fogUploadAbortController = null;

        // Try to trigger a scene save now that fog update is complete
        saveScene();
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onError: (_error) => {
        devError('save', 'Error updating fog mask');
        isUpdatingFog = false;
        fogUploadAbortController = null;
      },
      toastMessages: {
        error: { title: 'Error updating fog mask', body: (err) => err.message || 'Unknown error' }
      }
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onFogUpdate = async (_blob: Promise<Blob>) => {
    // If there's an existing upload, abort it
    if (fogUploadAbortController) {
      devLog('fog', 'Aborting previous fog upload - new drawing started');
      fogUploadAbortController.abort();
      fogUploadAbortController = null;
    }

    isUpdatingFog = true;

    const updateId = `fog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    timingLog('FOG-RT', `${updateId} - 1. Fog update triggered in editor at ${new Date().toISOString()}`);

    // Store a flag that we need to process fog update
    // We'll use RLE encoding instead of the blob
    pendingFogBlob = new Blob(); // Just use empty blob as a flag
    pendingFogUpdateId = updateId; // Store ID separately

    // Clear any existing timer
    if (fogUpdateTimer) {
      clearTimeout(fogUpdateTimer);
    }

    // Set a new timer to process the update after a delay
    fogUpdateTimer = setTimeout(() => {
      timingLog(
        'FOG-RT',
        `${updateId} - 2. Starting fog processing after 500ms debounce at ${new Date().toISOString()}`
      );
      processFogUpdate();
      fogUpdateTimer = null;
    }, 500); // 500ms delay
  };

  let isSaving = false;
  const saveScene = async () => {
    if (isSaving || isUpdatingFog || isUpdatingAnnotation) return;

    // Try to become the active saver for this scene
    if (!partyData || !partyData.becomeActiveSaver(selectedScene.id)) {
      return;
    }

    isSaving = true;

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
                sceneId: selectedScene.id,
                currentUrl: selectedScene.mapThumbLocation
              }),
            formLoadingState: () => {},
            onSuccess: (result) => {
              // Store the versioned location path for database saving
              mapThumbLocation = result.location;

              // Update Y.js immediately with the new thumbnail location
              if (partyData && selectedScene) {
                // Just update the mapThumbLocation - we don't have full thumb data here
                partyData.updateScene(selectedScene.id, {
                  mapThumbLocation: result.location
                });
              }
            },
            onError: () => {
              // Don't fail the save just because thumbnail upload failed
            },
            toastMessages: {
              // Remove error toast - thumbnail upload is optional
            }
          }).catch(() => {
            // Thumbnail upload failed silently
          });
        }
      } catch {
        // Error generating thumbnail (non-blocking)
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
          devError('save', 'Error saving scene:', error);
        },
        toastMessages: {
          success: { title: 'Scene saved!' },
          error: { title: 'Error saving scene', body: (err) => err.message || 'Error saving scene' }
        }
      });

      // Save markers using simplified upsert approach
      // Use $state.snapshot to get actual values from Svelte proxy
      const markersSnapshot = $state.snapshot(stageProps.marker?.markers || []);

      // Store the marker count at save time to detect if stageProps gets modified during save
      const markerCountAtSave = markersSnapshot.length;

      if (markersSnapshot.length > 0) {
        // Process markers one by one using upsert (create or update as needed)
        for (const marker of markersSnapshot) {
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
              // Add to persisted set if this was a create operation
              if (result.operation === 'created') {
                persistedMarkerIds.add(marker.id);
              }
              // Track recently saved markers to prevent premature rebuilds
              recentlySavedMarkerIds.add(marker.id);
              // Clear from recently saved after a delay (time for SSR data to update)
              setTimeout(() => {
                recentlySavedMarkerIds.delete(marker.id);
              }, 5000); // 5 seconds should be enough for SSR update
            },
            onError: (error) => {
              devError('save', 'Error saving marker:', error);
            },
            toastMessages: {
              error: { title: 'Error saving marker', body: (err) => err.message || 'Error saving marker' }
            }
          });
        }

        // After all markers are saved, force sync the current state to Y.js
        // This ensures other editors get the saved markers
        // IMPORTANT: Use the markers snapshot from before the save started to avoid losing new markers
        if (partyData && selectedScene?.id) {
          // Check if stageProps was modified during save (e.g., by the StageProps effect)
          const currentMarkerCount = stageProps.marker?.markers?.length || 0;
          if (currentMarkerCount !== markerCountAtSave) {
            devLog('save', 'DEV: ⚠️ StageProps markers were modified during save!', {
              countAtSave: markerCountAtSave,
              currentCount: currentMarkerCount,
              snapshotCount: markersSnapshot.length
            });
          }

          lastOwnYjsUpdateTime = Date.now();

          // Create a copy of stageProps with the correct markers FROM THE SNAPSHOT
          // This ensures we sync all markers that were saved, not what's currently in stageProps
          const stagePropsWithAllMarkers = {
            ...stageProps,
            marker: {
              ...stageProps.marker,
              markers: markersSnapshot // Use the snapshot that includes all markers
            }
          };

          // Make sure Y.js has the scene initialized
          const sceneData = partyData.getSceneData(selectedScene.id);
          if (!sceneData) {
            partyData.initializeSceneData(
              selectedScene.id,
              cleanStagePropsForYjs(stagePropsWithAllMarkers),
              markersSnapshot
            );
          } else {
            partyData.updateSceneStageProps(selectedScene.id, cleanStagePropsForYjs(stagePropsWithAllMarkers));
          }
        }
      }

      // Save annotations to individual annotation records
      const annotationsSnapshot = $state.snapshot(stageProps.annotations?.layers || []);
      if (annotationsSnapshot.length > 0) {
        for (const annotation of annotationsSnapshot) {
          if (annotation.url) {
            // Extract the location from the full URL
            const locationMatch = annotation.url.match(/https:\/\/files\.tableslayer\.com\/(.+)/);
            const location = locationMatch ? locationMatch[1] : null;

            if (location) {
              await handleMutation({
                mutation: () =>
                  $upsertAnnotationMutation.mutateAsync({
                    id: annotation.id,
                    sceneId: selectedScene.id,
                    name: annotation.name,
                    opacity: annotation.opacity,
                    color: annotation.color,
                    url: location,
                    visibility: annotation.visibility,
                    order: annotationsSnapshot.indexOf(annotation)
                  }),
                formLoadingState: () => {},
                onSuccess: () => {},
                onError: (error) => {
                  devError('save', 'Error saving annotation:', error);
                },
                toastMessages: {
                  error: { title: 'Error saving annotation', body: (err) => err.message || 'Error saving annotation' }
                }
              });
            }
          }
        }
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
      devError('save', 'Error during save operation:', error);
      saveSuccess = false;
    } finally {
      // Always release the save lock and reset flags
      if (partyData) {
        partyData.releaseActiveSaver(selectedScene.id, saveSuccess);
      }
      isSaving = false;

      // Clear actively editing flag and timer after save completes
      isActivelyEditing = false;
      // Only clear protection for markers that were actually saved
      if (saveSuccess && stageProps.marker.markers && stageProps.marker.markers.length > 0) {
        // Clear protection only for markers that were saved
        for (const marker of stageProps.marker.markers) {
          if (persistedMarkerIds.has(marker.id)) {
            markersBeingEdited.delete(marker.id);
            markersBeingMoved.delete(marker.id);
          }
        }
      }
      if (editingTimer) {
        clearTimeout(editingTimer);
        editingTimer = null;
      }
    }
  };

  // Helper function for marker updates that triggers auto-save
  const updateMarkerAndSave = (markerId: string, updateFn: (marker: Marker) => void) => {
    const markerIndex = stageProps.marker.markers.findIndex((m: Marker) => m.id === markerId);
    if (markerIndex !== -1) {
      // Update the marker locally first
      updateFn(stageProps.marker.markers[markerIndex]);

      // Force Svelte to detect the change by reassigning the array
      stageProps.marker.markers = [...stageProps.marker.markers];

      // Immediately sync to Y.js for real-time collaboration
      if (partyData && selectedScene?.id) {
        lastOwnYjsUpdateTime = Date.now(); // Track that we just sent an update
        // Clean local-only properties before sending to Y.js
        const stagePropsForYjs = {
          ...stageProps,
          annotations: {
            ...stageProps.annotations,
            activeLayer: null // Don't share active annotation selection
          }
        };
        partyData.updateSceneStageProps(selectedScene.id, stagePropsForYjs);
      }

      // Add marker to protection set to prevent Y.js from overwriting during save
      markersBeingEdited.add(markerId);

      // Set actively editing flag briefly to prevent feedback loops
      isActivelyEditing = true;

      // Clear any existing editing timer and set new one (shorter timeout)
      if (editingTimer) clearTimeout(editingTimer);
      editingTimer = setTimeout(() => {
        isActivelyEditing = false;
        markersBeingEdited.delete(markerId);
      }, 1000); // Clear after 1 second if no save occurs

      // Trigger database save through property update queue
      queuePropertyUpdate(stageProps, ['marker', 'markers'], stageProps.marker.markers, 'marker');
    }
  };

  // Function to start auto-save timer after user changes
  const startAutoSaveTimer = () => {
    // Only start timer if conditions are met
    if (isSaving) {
      return;
    }

    if (!hasInitialLoad) {
      return;
    }

    if (isReceivingYjsUpdate) {
      return;
    }

    if (!isWindowFocused) {
      return;
    }

    // Clear any existing timer
    if (saveTimer) clearTimeout(saveTimer);

    // Start new timer for idle period after user change
    saveTimer = setTimeout(() => {
      // Double-check conditions before actually saving
      if (isWindowFocused && !isReceivingYjsUpdate && hasInitialLoad && !isSaving) {
        saveScene();
      } else {
        // Clear actively editing flag if save was cancelled due to conditions
        isActivelyEditing = false;
      }
    }, 3000);
  };

  // Function to check for drift periodically
  const checkForDrift = async () => {
    // Skip if window not focused, no party data, or not connected
    if (!isWindowFocused || !partyData || !partyData.getConnectionStatus()) {
      return;
    }

    try {
      if (!partyData) return;

      // Refetch timestamps
      await $timestampsQuery.refetch();

      const timestamps = $timestampsQuery.data?.timestamps || {};
      const driftedScenes = await partyData.detectDrift(async () => timestamps);

      if (driftedScenes.length > 0) {
        // Show toast notification
        addToast({
          data: {
            title: 'Syncing',
            type: 'info'
          }
        });

        // Refresh data from database
        await invalidateAll();
      }
    } catch (error) {
      devError('save', 'Error in periodic drift check:', error);
    }
  };

  // Make sure the selectedMarkerId is reset when the selectedScene changes
  // Also update persistedMarkerIds to reflect what might change in state
  let previousEffectSceneId = $state<string | undefined>(undefined);
  $effect(() => {
    const currentSceneId = selectedScene?.id;
    if (currentSceneId && currentSceneId !== previousEffectSceneId) {
      // Only run this when scene actually changes
      selectedMarkerId = undefined;
      selectedAnnotationId = undefined;
      persistedMarkerIds = new Set(data.selectedSceneMarkers?.map((marker) => marker.id) || []);
      // Clear marker protection sets when switching scenes
      markersBeingEdited.clear();
      markersBeingMoved.clear();
      previousEffectSceneId = currentSceneId;
    }
  });

  // Track last navigation to prevent loops
  let lastNavigationTarget = $state<string | null>(null);
  let navigationAttempts = $state(0);

  // Monitor scene order changes and navigate if needed
  $effect(() => {
    // Skip if not hydrated, no selected scene, or currently navigating
    if (!isHydrated || !selectedScene || navigating.to) return;

    // Skip during initial page load to avoid navigation loops
    if (!hasInitialLoad) return;

    // Skip if this editor is currently reordering scenes
    if (isLocallyReordering) {
      return;
    }

    // Check if we're on the base route without a scene number
    // If so, skip navigation as the server already handles the redirect
    const hasSceneNumber = page.params.selectedScene !== undefined;
    if (!hasSceneNumber) {
      return;
    }

    // Skip if Y.js scenes are not yet loaded
    if (!yjsScenes || yjsScenes.length === 0) {
      return;
    }

    // Find the current scene's new order in Y.js scenes
    const currentSceneInYjs = yjsScenes.find((s) => s.id === selectedScene.id);

    if (!currentSceneInYjs) {
      // Scene was deleted - navigate to scene 1
      const targetPath = `/${page.params.party}/${page.params.gameSession}/1`;

      // Prevent navigation loops
      if (lastNavigationTarget === targetPath) {
        navigationAttempts++;
        if (navigationAttempts > 2) {
          devWarn('scene', 'Navigation loop detected, stopping navigation attempts');
          return;
        }
      } else {
        navigationAttempts = 0;
        lastNavigationTarget = targetPath;
      }

      goto(targetPath);
      return;
    }

    // Check if order changed
    if (currentSceneInYjs.order !== selectedSceneNumber) {
      const targetPath = `/${page.params.party}/${page.params.gameSession}/${currentSceneInYjs.order}`;

      // Prevent navigation loops
      if (lastNavigationTarget === targetPath) {
        navigationAttempts++;
        if (navigationAttempts > 2) {
          devWarn('scene', 'Navigation loop detected, stopping navigation attempts');
          return;
        }
      } else {
        navigationAttempts = 0;
        lastNavigationTarget = targetPath;
      }

      goto(targetPath);
    }
  });

  // Handle pane layout changes
  const onLayoutChange = (sizes: number[]) => {
    // Round sizes to nearest integer to avoid float precision issues
    const roundedSizes = sizes.map((size) => Math.round(size));

    // Save layout to cookie using the preferences system
    const newLayout: PaneConfig[] = [
      { size: roundedSizes[0], isCollapsed: isScenesCollapsed },
      { size: roundedSizes[1] }, // center pane has no collapse state
      { size: roundedSizes[2], isCollapsed: isMarkersCollapsed }
    ];

    if (isMobile) {
      setPreference('paneLayoutMobile', newLayout);
      clientPaneLayoutMobile = newLayout;
    } else {
      setPreference('paneLayoutDesktop', newLayout);
      clientPaneLayoutDesktop = newLayout;
    }
  };
</script>

<svelte:document
  onkeydown={handleKeydown}
  onvisibilitychange={() => {
    isWindowFocused = !document.hidden;
  }}
  bind:activeElement
/>
<svelte:window
  bind:innerWidth
  onfocus={() => {
    isWindowFocused = true;

    // Trigger Y.js sync check when regaining focus to catch any missed updates
    if (partyData && partyData.getConnectionStatus()) {
      // Small delay to ensure Y.js has had time to reconnect if needed
      setTimeout(async () => {
        if (!partyData) return;

        partyData.forceSyncCheck();

        // Check for Y.js drift and refresh if needed
        try {
          // Refetch timestamps
          await $timestampsQuery.refetch();

          const timestamps = $timestampsQuery.data?.timestamps || {};
          const driftedScenes = await partyData.detectDrift(async () => timestamps);

          if (driftedScenes.length > 0) {
            // Show toast notification
            addToast({
              data: {
                title: 'Syncing data',
                type: 'info'
              }
            });

            // Refresh data from database
            await invalidateAll();
          }
        } catch (error) {
          devError('save', 'Error checking for drift:', error);
        }
      }, 200);
    }
  }}
  onblur={() => {
    isWindowFocused = false;
    // Clear any pending save timer when window loses focus
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    // Clear marker protection sets when losing focus
    // This prevents markers from being stuck in protected state
    if (markersBeingMoved.size > 0 || markersBeingEdited.size > 0) {
      devLog('markers', 'Clearing marker protection on window blur', {
        beingMoved: Array.from(markersBeingMoved),
        beingEdited: Array.from(markersBeingEdited)
      });
      markersBeingMoved.clear();
      markersBeingEdited.clear();
    }

    // Also clear the actively editing flag
    isActivelyEditing = false;
    if (editingTimer) {
      clearTimeout(editingTimer);
      editingTimer = null;
    }
  }}
/>
<Head title={gameSession.name} description={`${gameSession.name} on Table Slayer`} />

<div class="container">
  <PaneGroup direction={isMobile ? 'vertical' : 'horizontal'} {onLayoutChange}>
    <Pane
      defaultSize={paneLayout?.[0]?.isCollapsed ? 0 : (paneLayout?.[0]?.size ?? 15)}
      collapsible={true}
      collapsedSize={0}
      minSize={startPaneMinSize}
      maxSize={50}
      bind:this={scenesPane}
      onCollapse={() => {
        isScenesCollapsed = true;
        saveCollapseState();
      }}
      onExpand={() => {
        isScenesCollapsed = false;
        saveCollapseState();
      }}
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
        bind:isLocallyReordering
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
    <Pane defaultSize={paneLayout?.[1]?.size ?? 70}>
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
            callbacks={{
              onAnnotationUpdate,
              onFogUpdate,
              onMapUpdate,
              onSceneUpdate,
              onStageInitialized,
              onStageLoading,
              onMarkerAdded,
              onMarkerMoved,
              onMarkerSelected,
              onMarkerContextMenu,
              onMarkerHover,
              onMeasurementStart,
              onMeasurementUpdate,
              onMeasurementEnd,
              onCursorMove: handleCursorMove
            }}
            trackLocalCursor={true}
            hoveredMarkerId={hoveredMarker?.id || null}
            {pinnedMarkerIds}
            {onPinToggle}
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
          {keyboardPopoverId}
        />
        <SceneZoom {handleSceneFit} {handleMapFill} {stageProps} />
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
      defaultSize={paneLayout?.[2]?.isCollapsed ? 0 : (paneLayout?.[2]?.size ?? 25)}
      collapsible={true}
      collapsedSize={0}
      minSize={endPaneMinSize}
      maxSize={50}
      bind:this={markersPane}
      onCollapse={() => {
        isMarkersCollapsed = true;
        saveCollapseState();
      }}
      onExpand={() => {
        isMarkersCollapsed = false;
        saveCollapseState();
      }}
      onResize={() => {
        if (stage) {
          stage.scene.fit();
        }
      }}
    >
      {#if activeControl === 'annotation'}
        {#key selectedAnnotationId}
          <AnnotationManager
            {stageProps}
            bind:selectedAnnotationId
            {onAnnotationDeleted}
            {onAnnotationUpdated}
            {onAnnotationCreated}
          />
        {/key}
      {:else}
        {#key selectedMarkerId}
          <MarkerManager
            partyId={party.id}
            {stageProps}
            bind:selectedMarkerId
            {socketUpdate}
            {handleSelectActiveControl}
            {updateMarkerAndSave}
            {onMarkerDeleted}
            {pinnedMarkerIds}
            {onPinToggle}
          />
        {/key}
      {/if}
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
  .stage.stage--hideCursor {
    cursor: none;
  }
  .stage.stage--crosshairCursor {
    cursor: crosshair;
  }
  .stage.stage--pointerCursor {
    cursor: pointer;
  }
  .stage.stage--grabbingCursor {
    cursor: grabbing;
  }
</style>
