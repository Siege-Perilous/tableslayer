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
    type AnnotationLayerData,
    RadialMenu,
    type RadialMenuItemType,
    DrawMode,
    StageMode,
    MeasurementType
  } from '@tableslayer/ui';
  import { Head } from '$lib/components';
  import { StageDefaultProps } from '$lib/utils/defaultMapState';
  import {
    initializePartyDataManager,
    usePartyData,
    destroyPartyDataManager,
    getPartyDataManager
  } from '$lib/utils/yjs/stores';
  import { type SceneData, type MeasurementData } from '$lib/utils/yjs/PartyDataManager';
  import { createUnifiedGestureDetector } from '$lib/utils/gestureDetection';
  import { switchActiveScene } from '$lib/utils/yjs/sceneCoordination';
  import { createConditionalActivityTimer } from '$lib/utils/yjs/activityTimer';
  import { useUpdateFogMaskMutation } from '$lib/queries/masks';
  import {
    type TemporaryLayer,
    getTemporaryLayers,
    broadcastTemporaryLayer,
    createTemporaryLayer,
    cleanupExpiredLayers
  } from '$lib/utils/yjs/temporaryLayers';
  import { v4 as uuidv4 } from 'uuid';

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

  // Radial menu state
  let menuVisible = $state(false);
  let menuPosition = $state({ x: 0, y: 0 });

  // Activity timer for fog/drawing interactions
  let activityTimer: ReturnType<typeof createConditionalActivityTimer> | null = null;

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
  let lastProcessedSceneId = $state<string | undefined>(data.activeScene?.id);

  // Fog update state
  let pendingFogBlob: Blob | null = null;
  let fogUpdateTimer: ReturnType<typeof setTimeout> | null = null;
  let isUpdatingFog = false;
  const updateFogMaskMutation = useUpdateFogMaskMutation();

  // Temporary drawing state
  let temporaryLayers = $state<TemporaryLayer[]>([]);
  let currentTemporaryLayerId: string | null = null;
  let temporaryDrawingTimer: ReturnType<typeof setInterval> | null = null;

  let stage: StageExports;
  let stageElement: HTMLDivElement | undefined = $state();
  let stageProps: StageProps = $state({
    ...StageDefaultProps,
    mode: 1, // StageMode.Player = 1
    activeLayer: MapLayerType.None, // Allow marker dragging (None allows marker interaction)
    scene: { ...StageDefaultProps.scene, autoFit: true, offset: { x: 0, y: 0 } }
  });

  // Derive pinned marker IDs from markers with pinnedTooltip set to true
  let pinnedMarkerIds = $derived(stageProps.marker.markers.filter((m) => m.pinnedTooltip).map((m) => m.id));

  let selectedMarker: Marker | undefined = $state();
  let markersBeingMoved = new Set<string>(); // Track markers being dragged to prevent Y.js overwrites
  let stageIsLoading: boolean = $state(true);
  let sceneIsChanging: boolean = $state(false);
  let gameIsPaused = $derived(party.gameSessionIsPaused || !hasActiveScene);
  let randomFantasyQuote = $state(getRandomFantasyQuote());
  let stageClasses = $derived([
    'stage',
    (stageIsLoading || sceneIsChanging) && 'stage--loading',
    gameIsPaused && 'stage--hidden'
  ]);

  // Radial menu items - dynamically populate scene submenu from data
  const menuItems: RadialMenuItemType[] = $derived([
    {
      id: 'scene',
      label: 'Scene',
      submenu: data.scenes.map((scene) => ({
        id: `scene-${scene.id}`,
        label: scene.name
      }))
    },
    {
      id: 'fog',
      label: 'Fog',
      submenu: [
        { id: 'fog-remove', label: 'Remove fog' },
        { id: 'fog-add', label: 'Add fog' },
        { id: 'fog-reset', label: 'Reset fog' },
        { id: 'fog-clear', label: 'Clear fog' }
      ]
    },
    {
      id: 'draw',
      label: 'Draw',
      submenu: [
        { id: 'draw-red', label: '', color: '#d73e2e' },
        { id: 'draw-orange', label: '', color: '#ffa500' },
        { id: 'draw-yellow', label: '', color: '#ffd93d' },
        { id: 'draw-green', label: '', color: '#6bcf7f' },
        { id: 'draw-blue', label: '', color: '#2e86ab' },
        { id: 'draw-purple', label: '', color: '#b197fc' },
        { id: 'draw-pink', label: '', color: '#f06595' },
        { id: 'draw-turquoise', label: '', color: '#20c997' }
      ]
    },
    {
      id: 'measure',
      label: 'Measure',
      submenu: [
        { id: 'measure-line', label: 'Line' },
        { id: 'measure-circle', label: 'Circle' },
        { id: 'measure-square', label: 'Square' },
        { id: 'measure-cone', label: 'Cone' },
        { id: 'measure-beam', label: 'Beam' }
      ]
    },
    {
      id: 'markers',
      label: 'Move markers'
    }
  ]);

  // Helper to clean stage props for Y.js sync (removes local-only fields)
  const cleanStagePropsForYjs = (props: StageProps): any => {
    return {
      ...props,
      annotations: {
        ...props.annotations,
        activeLayer: null,
        lineWidth: undefined
      },
      fogOfWar: {
        ...props.fogOfWar,
        tool: {
          ...props.fogOfWar.tool
        }
      },
      grid: {
        ...props.grid,
        worldGridUnits: props.grid.worldGridUnits || 'FT',
        worldGridSize: props.grid.worldGridSize || 5
      }
    };
  };

  function handleMenuItemSelect(itemId: string) {
    devLog('playfield', 'Menu item selected:', itemId);

    // Handle menu selections
    switch (itemId) {
      case 'fog-remove':
        devLog('playfield', 'Fog action: Remove fog');
        stageProps.activeLayer = MapLayerType.FogOfWar;
        stageProps.fogOfWar.tool.mode = DrawMode.Erase;
        stageProps.fogOfWar.tool.size = 7.0; // 7% - smaller default for playfield
        break;

      case 'fog-add':
        devLog('playfield', 'Fog action: Add fog');
        stageProps.activeLayer = MapLayerType.FogOfWar;
        stageProps.fogOfWar.tool.mode = DrawMode.Draw;
        stageProps.fogOfWar.tool.size = 7.0; // 7% - smaller default for playfield
        break;

      case 'fog-reset':
        devLog('playfield', 'Fog action: Reset fog');
        if (stage?.fogOfWar) {
          stage.fogOfWar.reset();
        }
        stageProps.activeLayer = MapLayerType.None;
        break;

      case 'fog-clear':
        devLog('playfield', 'Fog action: Clear fog');
        if (stage?.fogOfWar) {
          stage.fogOfWar.clear();
        }
        stageProps.activeLayer = MapLayerType.None;
        break;

      case 'draw-red':
      case 'draw-orange':
      case 'draw-yellow':
      case 'draw-green':
      case 'draw-blue':
      case 'draw-purple':
      case 'draw-pink':
      case 'draw-turquoise': {
        // Map action IDs to colors (same as editor)
        const colorMap: Record<string, string> = {
          'draw-red': '#d73e2e',
          'draw-orange': '#ffa500',
          'draw-yellow': '#ffd93d',
          'draw-green': '#6bcf7f',
          'draw-blue': '#2e86ab',
          'draw-purple': '#b197fc',
          'draw-pink': '#f06595',
          'draw-turquoise': '#20c997'
        };

        const selectedColor = colorMap[itemId] || '#d73e2e';
        devLog('playfield', `Starting draw with color: ${selectedColor}`);

        // Create a new temporary layer for drawing
        currentTemporaryLayerId = uuidv4();

        const tempLayer: AnnotationLayerData = {
          id: currentTemporaryLayerId,
          name: 'Temporary drawing',
          color: selectedColor,
          opacity: 1.0,
          url: null,
          visibility: StageMode.Player
        };

        stageProps.annotations.layers = [...stageProps.annotations.layers, tempLayer];
        stageProps.annotations.activeLayer = currentTemporaryLayerId;
        stageProps.activeLayer = MapLayerType.Annotation;

        // Set line width as percentage (1% of texture resolution)
        // AnnotationMaterial will convert this to texture pixels
        stageProps.annotations.lineWidth = 1.0;

        // Immediately broadcast to Y.js awareness with empty mask
        {
          const manager = getPartyDataManager();
          if (manager && currentTemporaryLayerId) {
            const tempYjsLayer = createTemporaryLayer(currentTemporaryLayerId, user.id, tempLayer.color, '', 10000);
            broadcastTemporaryLayer(manager, tempYjsLayer);
            temporaryLayers = getTemporaryLayers(manager);
          }
        }
        break;
      }

      case 'measure-line':
        devLog('playfield', 'Starting line measurement');
        stageProps.activeLayer = MapLayerType.Measurement;
        stageProps.measurement.type = MeasurementType.Line;
        break;

      case 'measure-circle':
        devLog('playfield', 'Starting circle measurement');
        stageProps.activeLayer = MapLayerType.Measurement;
        stageProps.measurement.type = MeasurementType.Circle;
        break;

      case 'measure-square':
        devLog('playfield', 'Starting square measurement');
        stageProps.activeLayer = MapLayerType.Measurement;
        stageProps.measurement.type = MeasurementType.Square;
        break;

      case 'measure-cone':
        devLog('playfield', 'Starting cone measurement');
        stageProps.activeLayer = MapLayerType.Measurement;
        stageProps.measurement.type = MeasurementType.Cone;
        break;

      case 'measure-beam':
        devLog('playfield', 'Starting beam measurement');
        stageProps.activeLayer = MapLayerType.Measurement;
        stageProps.measurement.type = MeasurementType.Beam;
        break;

      case 'markers':
        devLog('playfield', 'Enable marker movement');
        stageProps.activeLayer = MapLayerType.Marker;
        console.log('[Play] Marker movement enabled, activeLayer:', stageProps.activeLayer);
        break;

      default:
        // Check if it's a scene selection
        if (itemId.startsWith('scene-')) {
          const sceneId = itemId.replace('scene-', '');
          devLog('playfield', 'Switching to scene:', sceneId);
          const manager = getPartyDataManager();
          if (manager) {
            switchActiveScene(manager, sceneId);
          }
        }
        break;
    }
  }

  function handleMenuClose() {
    menuVisible = false;
  }

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
      devLog('playfield', `Fog mask fetch result for scene ${sceneId}:`, {
        hasMaskData: !!data.maskData,
        maskDataLength: data.maskData?.length,
        hasStage: !!stage,
        hasFogOfWar: !!stage?.fogOfWar,
        hasFromRLE: !!stage?.fogOfWar?.fromRLE
      });

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
        devLog('playfield', `Applying fog mask: ${bytes.length} bytes`);
        // Apply the mask to the fog layer
        await stage.fogOfWar.fromRLE(bytes, 1024, 1024);
        timingLog('FOG-RT', `fog_${maskVersion} - 14. Fog mask applied successfully at ${new Date().toISOString()}`);
        timingLog('FOG-RT', `fog_${maskVersion} - COMPLETE: Full round-trip completed`);
        devLog('playfield', 'Fog mask applied successfully');
      } else {
        devLog('playfield', 'Skipping fog mask application - conditions not met');
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
        // Filter markers to remove DM-only ones, and protect markers being moved
        marker: {
          ...yjsSceneData.stageProps.marker,
          markers: (yjsSceneData.stageProps.marker?.markers || [])
            .filter((m: Marker) => m.visibility !== 1) // 1 = MarkerVisibility.DM
            .map((incomingMarker: Marker) => {
              // If this marker is being moved, preserve its local position
              if (markersBeingMoved.has(incomingMarker.id)) {
                const localMarker = stageProps.marker.markers.find((m) => m.id === incomingMarker.id);
                if (localMarker) {
                  return { ...incomingMarker, position: localMarker.position };
                }
              }
              return incomingMarker;
            })
        },
        // Merge Y.js annotations (permanent) with temporary layers from Y.js awareness
        annotations: yjsSceneData.stageProps.annotations
          ? {
              ...yjsSceneData.stageProps.annotations,
              layers: [
                // Include Y.js annotation layers (filter out DM-only permanent annotations)
                ...(yjsSceneData.stageProps.annotations.layers || []).filter(
                  (layer: AnnotationLayerData) => layer.visibility === 1 // 1 = StageMode.Player (visible to players)
                ),
                // Add temporary layers from Y.js awareness (already converted to AnnotationLayerData in effect below)
                ...(stageProps.annotations?.layers || []).filter((layer: AnnotationLayerData) => {
                  // Check if this layer exists in temporaryLayers array (these are the temp drawings from playfield)
                  const isTemporary = temporaryLayers.find((t) => t.id === layer.id);
                  if (isTemporary) {
                    // Keep if it's the current one being drawn or not expired
                    if (layer.id === currentTemporaryLayerId) {
                      return true;
                    }
                    return isTemporary.expiresAt > Date.now();
                  }
                  return false; // Don't include permanent layers here, they come from Y.js
                })
              ],
              activeLayer: stageProps.annotations?.activeLayer || null // Preserve active layer
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
        // Use Y.js active scene ID (source of truth) instead of SSR data which may be stale
        const sceneIdToFetch = yjsPartyState.activeSceneId || data.activeScene?.id;
        if (sceneIdToFetch) {
          timingLog(
            'FOG-RT',
            `fog_${stageProps.fogOfWar.maskVersion} - 11. Fetching fog mask from API for scene ${sceneIdToFetch} at ${new Date().toISOString()}`
          );
          fetchFogMask(sceneIdToFetch);
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
        stageProps = buildSceneProps(
          data.activeScene,
          data.activeSceneMarkers,
          'client',
          data.activeSceneAnnotations,
          data.bucketUrl
        );
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

      // Fetch fog mask for the new scene - use Y.js scene ID if available (source of truth)
      const sceneIdToFetch = yjsPartyState.activeSceneId || newSceneId;
      devLog('playfield', 'Scene changed, fetching fog mask for:', sceneIdToFetch);
      fetchFogMask(sceneIdToFetch);

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
      stageProps = buildSceneProps(
        data.activeScene,
        data.activeSceneMarkers,
        'client',
        data.activeSceneAnnotations,
        data.bucketUrl
      );
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

        // Update temporary layers from Y.js awareness
        const manager = getPartyDataManager();
        if (manager) {
          const yjsTemporaryLayers = getTemporaryLayers(manager);
          if (yjsTemporaryLayers.length > 0) {
            devLog('playfield', 'Received temporary layers from Y.js:', yjsTemporaryLayers.length);
          }
          temporaryLayers = yjsTemporaryLayers;
        }

        // Update hovered marker from Y.js awareness (for players to see what DM is hovering)
        const hoveredMarker = partyData!.getHoveredMarker();
        hoveredMarkerId = hoveredMarker?.id ?? null;
        if (hoveredMarker) {
          devLog('yjs', '[Play Route] Received hovered marker from Y.js:', {
            id: hoveredMarker.id,
            hoveredMarkerId,
            hasTooltip: hoveredMarker.tooltip
          });
        }

        // Note: pinnedMarkerIds is now derived from marker.pinnedTooltip in the database

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

    // Set up gesture detector for radial menu (two-finger long-press or right-click)
    let gestureDetector: ReturnType<typeof createUnifiedGestureDetector> | null = null;
    if (stageElement) {
      gestureDetector = createUnifiedGestureDetector((position) => {
        menuVisible = true;
        menuPosition = position;
      }, stageElement);
    }

    // Set up activity timer for fog/drawing interactions (5 second timeout)
    if (stageElement) {
      activityTimer = createConditionalActivityTimer(
        5000,
        () => {
          // On timeout, reset active layer to None and clear temporary drawing ID
          // The layer itself will persist in Y.js until it expires (10 seconds)
          devLog(
            'playfield',
            'Activity timeout - resetting active layer to None, currentTemporaryLayerId:',
            currentTemporaryLayerId
          );
          stageProps.activeLayer = MapLayerType.None;
          stageProps.annotations.activeLayer = null;
          currentTemporaryLayerId = null;
        },
        () => stageProps.activeLayer !== MapLayerType.None,
        ['mousedown', 'mousemove', 'touchstart', 'touchmove'],
        stageElement
      );
    }

    // Set up cleanup timer for expired temporary layers (check every 1000ms)
    temporaryDrawingTimer = setInterval(() => {
      const manager = getPartyDataManager();
      if (manager) {
        cleanupExpiredLayers(manager);
        temporaryLayers = getTemporaryLayers(manager);

        // Clear currentTemporaryLayerId if it no longer exists in Y.js awareness
        if (currentTemporaryLayerId && !temporaryLayers.find((l) => l.id === currentTemporaryLayerId)) {
          currentTemporaryLayerId = null;
        }
      }
    }, 1000);

    return () => {
      isUnmounting = true;
      isMounted = false;

      // Remove event listeners
      window.removeEventListener('mousemove', handleMouseMove);

      // Clean up gesture detector
      if (gestureDetector) {
        gestureDetector.destroy();
      }

      // Clean up activity timer
      if (activityTimer) {
        activityTimer.destroy();
      }

      // Clean up temporary drawing timer
      if (temporaryDrawingTimer) {
        clearInterval(temporaryDrawingTimer);
      }

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

        // Update temporary layers from Y.js awareness
        const manager = getPartyDataManager();
        if (manager) {
          const yjsTemporaryLayers = getTemporaryLayers(manager);
          if (yjsTemporaryLayers.length > 0) {
            devLog('playfield', 'Received temporary layers from Y.js:', yjsTemporaryLayers.length);
          }
          temporaryLayers = yjsTemporaryLayers;
        }

        // Update hovered marker from Y.js awareness (for players to see what DM is hovering)
        const hoveredMarker = partyData!.getHoveredMarker();
        hoveredMarkerId = hoveredMarker?.id ?? null;
        if (hoveredMarker) {
          devLog('yjs', '[Play Route] Received hovered marker from Y.js:', {
            id: hoveredMarker.id,
            hoveredMarkerId,
            hasTooltip: hoveredMarker.tooltip
          });
        }

        // Note: pinnedMarkerIds is now derived from marker.pinnedTooltip in the database

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

  // Process fog update - encode RLE, save to DB, sync to Y.js
  const processFogUpdate = async () => {
    // Use Y.js active scene ID as source of truth
    const activeSceneId = yjsPartyState.activeSceneId || data.activeScene?.id;
    if (!pendingFogBlob || !activeSceneId) return;

    // Check if user is still drawing
    if (stage?.fogOfWar?.isDrawing()) {
      devLog('playfield', 'Aborting fog update - user is still drawing');
      return;
    }

    pendingFogBlob = null;

    devLog('playfield', 'Processing fog update - encoding RLE');
    const rleData = await stage?.fogOfWar?.toRLE();
    if (!rleData) {
      devError('playfield', 'Failed to get RLE data from fog layer');
      isUpdatingFog = false;
      return;
    }

    devLog(
      'playfield',
      `Fog RLE encoding complete (${rleData.length} bytes), saving to database for scene ${activeSceneId}`
    );

    try {
      await updateFogMaskMutation.mutateAsync({
        sceneId: activeSceneId,
        partyId: party.id,
        maskData: rleData
      });

      devLog('playfield', 'Fog database save complete');

      // Check if user started drawing while upload was in progress
      if (stage?.fogOfWar?.isDrawing()) {
        devLog('playfield', 'Fog update completed but user is drawing - skipping Y.js sync');
        isUpdatingFog = false;
        return;
      }

      // Update mask version to signal other clients
      const maskVersion = Date.now();
      stageProps.fogOfWar.maskVersion = maskVersion;
      devLog('playfield', `Setting fog mask version ${maskVersion}`);

      // Sync to Y.js for real-time collaboration
      const manager = getPartyDataManager();
      if (manager && activeSceneId) {
        devLog('playfield', 'Broadcasting fog update to Y.js');
        manager.updateSceneStageProps(activeSceneId, cleanStagePropsForYjs(stageProps));
      }

      isUpdatingFog = false;
    } catch (error) {
      devError('playfield', 'Error updating fog mask:', error);
      isUpdatingFog = false;
    }
  };

  const onFogUpdate = async (_blob: Promise<Blob>) => {
    isUpdatingFog = true;

    // Store a flag that we need to process fog update
    pendingFogBlob = new Blob();

    // Clear any existing timer
    if (fogUpdateTimer) {
      clearTimeout(fogUpdateTimer);
    }

    // Set a new timer to process the update after a delay (500ms debounce)
    fogUpdateTimer = setTimeout(() => {
      devLog('playfield', 'Fog update debounce timer fired');
      processFogUpdate();
      fogUpdateTimer = null;
    }, 500);
  };

  function onMapUpdate(offset: { x: number; y: number }, zoom: number) {
    devLog('playfield', 'Updating map', offset, zoom);
    return;
  }

  // Players can move markers - broadcast position updates via Y.js
  function onMarkerMoved(marker: Marker, position: { x: number; y: number }) {
    const activeSceneId = yjsPartyState.activeSceneId || data.activeScene?.id;
    if (!activeSceneId) return;

    const index = stageProps.marker.markers.findIndex((m: Marker) => m.id === marker.id);
    if (index !== -1) {
      // Mark marker as being moved to protect from Y.js overwrites
      markersBeingMoved.add(marker.id);

      // Update marker position immediately in local state
      stageProps.marker.markers[index] = {
        ...marker,
        position: { x: position.x, y: position.y }
      };

      // Broadcast only the marker position update to Y.js - editor will receive and save to database
      // This prevents overwriting other stageProps state that should only be managed by the editor
      const manager = getPartyDataManager();
      if (manager) {
        manager.updateMarkerPosition(activeSceneId, marker.id, position);
        devLog('playfield', 'Broadcasting marker position update:', {
          markerId: marker.id,
          position
        });
      }

      // Remove protection after a short delay to allow Y.js sync to complete
      setTimeout(() => {
        markersBeingMoved.delete(marker.id);
      }, 2000);
    }
  }

  function onMarkerAdded() {} // Players can't add markers
  function onMarkerHover() {} // Players can't control hover, only receive it

  const onMarkerSelected = (marker: Marker | null) => {
    selectedMarker = marker ?? undefined;
  };

  // Measurement callbacks for Y.js broadcasting (playfield → editor)
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
      devLog('playfield', 'Broadcasting measurement start:', { startPoint, type, measurementProps });
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
    // Clear measurement when finished (it will fade out on its own)
    if (partyData) {
      partyData.updateMeasurement(null, null, 0);
      devLog('playfield', 'Clearing measurement broadcast');
    }
    // Reset activeLayer back to None after measurement is finished
    stageProps.activeLayer = MapLayerType.None;
  };

  async function loadFogMask() {
    // Load fog mask if available
    if (data.activeSceneFogMask && stage?.fogOfWar?.fromRLE) {
      try {
        devLog('playfield', 'Loading fog mask from server data');
        // Convert base64 back to Uint8Array
        const binaryString = atob(data.activeSceneFogMask);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        devLog('playfield', `Applying fog mask (${bytes.length} bytes) to fog layer`);
        // Apply the mask to the fog layer
        await stage.fogOfWar.fromRLE(bytes, 1024, 1024);
        devLog('playfield', 'Fog mask applied successfully');

        // Store the mask version if present in stageProps
        if (stageProps.fogOfWar?.maskVersion) {
          lastFogMaskVersion = stageProps.fogOfWar.maskVersion;
        }
      } catch (error) {
        devError('playfield', 'Error loading fog mask:', error);
      }
    } else {
      devLog('playfield', 'No fog mask data in SSR, checking if we need to fetch from Y.js state', {
        hasMaskData: !!data.activeSceneFogMask,
        hasFogLayer: !!stage?.fogOfWar?.fromRLE,
        hasMaskVersion: !!stageProps.fogOfWar?.maskVersion
      });

      // If there's a maskVersion in stageProps but no SSR data, fetch the mask
      if (stageProps.fogOfWar?.maskVersion && data.activeScene?.id) {
        devLog('playfield', `Fetching fog mask for version ${stageProps.fogOfWar.maskVersion} on initial load`);
        lastFogMaskVersion = stageProps.fogOfWar.maskVersion;
        fetchFogMask(data.activeScene.id);
      }
    }
  }

  function onStageLoading() {
    stageIsLoading = true;
  }

  async function onStageInitialized() {
    stageIsLoading = false;

    // Load fog mask from SSR data if available
    await loadFogMask();

    // Load annotation masks if available
    if (data.activeSceneAnnotationMasks && stage?.annotations?.loadMask) {
      try {
        for (const [annotationId, maskData] of Object.entries(data.activeSceneAnnotationMasks)) {
          if (maskData) {
            // Check if the annotation layer exists in stageProps
            const layerExists = stageProps.annotations.layers.some((layer) => layer.id === annotationId);
            if (!layerExists) {
              devLog('playfield', `Skipping mask load for annotation ${annotationId} - layer not found in stageProps`);
              continue;
            }

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
    blob.then(async (blob) => {
      const layer = stageProps.annotations.layers.find((layer) => layer.id === layerId);
      if (layer) {
        layer.url = URL.createObjectURL(blob);
      }

      // If this is a temporary drawing, broadcast it via Y.js awareness
      if (currentTemporaryLayerId && stage?.annotations) {
        try {
          const tempLayerData = stageProps.annotations.layers.find((l) => l.id === currentTemporaryLayerId);
          if (tempLayerData) {
            const rleData = await stage.annotations.toRLE();
            if (rleData && rleData.length > 0) {
              const base64 = btoa(String.fromCharCode(...rleData));

              const tempLayer = createTemporaryLayer(
                currentTemporaryLayerId,
                user.id,
                tempLayerData.color,
                base64,
                10000 // 10 second expiration
              );

              const manager = getPartyDataManager();
              if (manager) {
                broadcastTemporaryLayer(manager, tempLayer);
                temporaryLayers = getTemporaryLayers(manager);
              }
            }
          }
        } catch (error) {
          devError('playfield', 'Error broadcasting temporary layer:', error);
        }

        // Exit drawing mode after the drawing is complete
        devLog('playfield', 'Drawing complete, exiting annotation mode');
        stageProps.activeLayer = MapLayerType.None;
        stageProps.annotations.activeLayer = null;
        currentTemporaryLayerId = null;
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

  // Effect to convert temporary layers to annotation layers for display
  $effect(() => {
    if (stage?.annotations) {
      // Convert temporary layers to annotation layer data
      const tempAnnotationLayers: AnnotationLayerData[] = temporaryLayers.map((tempLayer) => ({
        id: tempLayer.id,
        name: tempLayer.name,
        color: tempLayer.color,
        opacity: tempLayer.opacity,
        url: null,
        maskVersion: undefined,
        visibility: StageMode.Player
      }));

      // Add temporary layers to annotations (without replacing existing ones)
      const existingLayerIds = new Set(stageProps.annotations.layers.map((l) => l.id));
      const newLayers = tempAnnotationLayers.filter((l) => !existingLayerIds.has(l.id));

      if (newLayers.length > 0) {
        stageProps.annotations.layers = [...stageProps.annotations.layers, ...newLayers];

        // Load RLE data for each new temporary layer
        newLayers.forEach(async (layer) => {
          const tempLayer = temporaryLayers.find((t) => t.id === layer.id);
          if (tempLayer && tempLayer.maskData && stage?.annotations?.loadMask) {
            try {
              const binaryString = atob(tempLayer.maskData);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              await stage.annotations.loadMask(layer.id, bytes);
            } catch (error) {
              devError('playfield', `Error loading temporary layer ${layer.id}:`, error);
            }
          }
        });
      }

      // Remove expired temporary layers from annotations
      const now = Date.now();
      const tempLayerIds = new Set(temporaryLayers.map((t) => t.id));

      const filteredLayers = stageProps.annotations.layers.filter((l) => {
        // Check if this layer ID exists in the current temporaryLayers array
        if (tempLayerIds.has(l.id)) {
          // It's a temporary layer that still exists - keep if not expired or currently being drawn
          const tempLayer = temporaryLayers.find((t) => t.id === l.id);
          if (l.id === currentTemporaryLayerId) {
            return true;
          }
          return tempLayer && tempLayer.expiresAt > now;
        }

        // Check if this was a temporary layer that expired (was in temporaryLayers before but isn't now)
        // We can identify these because they won't have a maskVersion (temporary layers don't persist to DB)
        if (!l.maskVersion) {
          // This was likely a temporary layer that expired - remove it
          return false;
        }

        // It's a permanent annotation (has maskVersion) - always keep
        return true;
      });

      if (filteredLayers.length !== stageProps.annotations.layers.length) {
        stageProps.annotations.layers = filteredLayers;
      }
    }
  });

  // Effect to handle active scene changes
  $effect(() => {
    if (isHydrated && !isInvalidating && !isProcessingSceneChange) {
      const currentActiveSceneId = data.activeScene?.id;

      devLog('playfield', 'Playfield checking for active scene changes:', {
        yjsActiveSceneId: yjsPartyState.activeSceneId,
        currentActiveSceneId
      });

      // Check if active scene changed (and we haven't already processed this change)
      if (
        yjsPartyState.activeSceneId &&
        yjsPartyState.activeSceneId !== currentActiveSceneId &&
        yjsPartyState.activeSceneId !== lastProcessedSceneId
      ) {
        devLog('playfield', 'Active scene change detected:', {
          from: currentActiveSceneId,
          to: yjsPartyState.activeSceneId,
          lastProcessedSceneId,
          currentGameSessionId: data.activeGameSession?.id,
          timestamp: Date.now()
        });

        devLog(
          'playfield',
          `Playfield: Active scene changed from ${currentActiveSceneId} to ${yjsPartyState.activeSceneId}, reloading page...`
        );

        // Trigger loading fade immediately when scene change is detected
        sceneIsChanging = true;

        // Set flags to prevent race conditions and track the scene we're switching to
        isProcessingSceneChange = true;
        isInvalidating = true;
        lastProcessedSceneId = yjsPartyState.activeSceneId;

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
      // Measurement callbacks for playfield → editor sync
      onMeasurementStart,
      onMeasurementUpdate,
      onMeasurementEnd
    }}
    cursors={cursorArray}
    trackLocalCursor={false}
  />

  <!-- Cursors are now rendered in Three.js via the CursorLayer component -->
</div>

<!-- Radial menu for player interactions -->
<RadialMenu
  visible={menuVisible}
  position={menuPosition}
  items={menuItems}
  onItemSelect={handleMenuItemSelect}
  onClose={handleMenuClose}
/>

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
