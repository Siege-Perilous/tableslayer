<script lang="ts">
  import { onMount, untrack } from 'svelte';
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
    type RadialMenuItemProps,
    DrawMode,
    StageMode,
    MeasurementType,
    PersistButton
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
  import { useUpdateFogMaskMutation, useUpdateAnnotationMaskMutation } from '$lib/queries/masks';
  import { useUpsertAnnotationMutation, useDeleteAnnotationMutation } from '$lib/queries/annotations';
  import { useUpdatePartyMutation } from '$lib/queries/parties';
  import {
    IconMap,
    IconShadow,
    IconPencil,
    IconRuler,
    IconPaint,
    IconPaintFilled,
    IconRestore,
    IconTrash,
    IconLine,
    IconCircle,
    IconSquare,
    IconCone2,
    IconRectangleVertical,
    IconArrowBackUp
  } from '@tabler/icons-svelte';
  import {
    type TemporaryLayer,
    getTemporaryLayers,
    broadcastTemporaryLayer,
    createTemporaryLayer,
    cleanupExpiredLayers,
    removeTemporaryLayer
  } from '$lib/utils/yjs/temporaryLayers';
  import { v4 as uuidv4 } from 'uuid';
  import { mergeMarkersWithProtection } from '$lib/utils/markers/mergeMarkersWithProtection';
  import { transformCursorsToArray, type CursorData } from '$lib/utils/cursors';
  import { uint8ArrayToBase64, base64ToUint8Array } from '$lib/utils/encoding';
  import { getLatestMeasurement, extractMeasurementProps } from '$lib/utils/measurements';

  let cursors: Record<string, CursorData> = $state({});
  let measurements: Record<string, MeasurementData> = $state({});
  let latestMeasurement: MeasurementData | null = $state(null);
  let hoveredMarkerId: string | null = $state(null);

  // Radial menu state
  let menuVisible = $state(false);
  let menuPosition = $state({ x: 0, y: 0 });

  // Touch hint state
  let showTouchHint = $state(false);
  let isTouchDevice = $state(false);

  // Activity timer for fog/drawing interactions
  let activityTimer: ReturnType<typeof createConditionalActivityTimer> | null = null;

  // Convert cursors to format expected by CursorLayer
  let cursorArray = $derived(transformCursorsToArray(cursors));

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
  const updateFogMaskMutation = useUpdateFogMaskMutation();
  const updatePartyMutation = useUpdatePartyMutation();

  // Annotation persistence mutations
  const upsertAnnotationMutation = useUpsertAnnotationMutation();
  const updateAnnotationMaskMutation = useUpdateAnnotationMaskMutation();
  const deleteAnnotationMutation = useDeleteAnnotationMutation();

  // Temporary drawing state
  let temporaryLayers = $state<TemporaryLayer[]>([]);
  let currentTemporaryLayerId: string | null = null;
  let temporaryDrawingTimer: ReturnType<typeof setInterval> | null = null;
  let resetLayerTimer: ReturnType<typeof setTimeout> | null = null;

  // Persist button state
  let showPersistButton = $state(false);
  let persistButtonPosition = $state({ x: 0, y: 0 });
  let persistButtonLayerId: string | null = $state(null);
  let persistButtonTimer: ReturnType<typeof setTimeout> | null = null;
  // Store pending position to show persist button after drawing window closes
  let pendingPersistPosition: { x: number; y: number } | null = null;

  // Track IDs of layers we've created as temporary (so we can clean them up when they expire)
  let knownTemporaryLayerIds = new Set<string>();

  // Store SSR annotation layers separately to preserve them during Y.js merging
  let ssrAnnotationLayers: AnnotationLayerData[] = [];

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

  // Build scene submenu items from all game sessions
  const allSceneItems = $derived(
    data.gameSessionsWithScenes.flatMap((gs) =>
      gs.scenes.map((scene) => ({
        id: `scene-${scene.id}`,
        label: scene.name,
        gameSessionId: gs.id
      }))
    )
  );

  // Build filter options from game sessions
  const gameSessionFilterOptions = $derived(
    data.gameSessionsWithScenes.map((gs) => ({
      value: gs.id,
      label: gs.name
    }))
  );

  // Radial menu items - dynamically populate scene submenu from data
  const menuItems: RadialMenuItemProps[] = $derived([
    {
      id: 'scene',
      label: '',
      icon: IconMap,
      submenuLayout: 'table',
      submenu: allSceneItems,
      submenuFilterOptions: gameSessionFilterOptions,
      submenuFilterDefault: data.activeGameSession?.id,
      submenuFilterKey: 'gameSessionId'
    },
    {
      id: 'fog',
      label: '',
      icon: IconShadow,
      submenu: [
        { id: 'fog-remove', label: '', icon: IconPaint },
        { id: 'fog-add', label: '', icon: IconPaintFilled },
        { id: 'fog-reset', label: '', icon: IconRestore },
        { id: 'fog-clear', label: '', icon: IconTrash }
      ]
    },
    {
      id: 'draw',
      label: '',
      icon: IconPencil,
      submenu: [
        { id: 'draw-red', label: '', color: '#d73e2e' },
        { id: 'draw-orange', label: '', color: '#ffa500' },
        { id: 'draw-yellow', label: '', color: '#ffd93d' },
        { id: 'draw-green', label: '', color: '#6bcf7f' },
        { id: 'draw-blue', label: '', color: '#2e86ab' },
        { id: 'draw-purple', label: '', color: '#b197fc' },
        { id: 'draw-pink', label: '', color: '#f06595' },
        { id: 'draw-turquoise', label: '', color: '#20c997' },
        {
          id: 'draw-delete-all',
          label: '',
          icon: IconTrash,
          submenu: [
            { id: 'draw-delete-all-confirm', label: 'Yes, delete all' },
            { id: 'draw-delete-all-cancel', label: 'Cancel' }
          ]
        }
      ]
    },
    {
      id: 'measure',
      label: '',
      icon: IconRuler,
      submenu: [
        { id: 'measure-line', label: '', icon: IconLine },
        { id: 'measure-circle', label: '', icon: IconCircle },
        { id: 'measure-square', label: '', icon: IconSquare },
        {
          id: 'measure-cone',
          label: '',
          icon: IconCone2,
          submenu: [
            { id: 'measure-cone-30', label: '30°' },
            { id: 'measure-cone-60', label: '60°' },
            { id: 'measure-cone-90', label: '90°' }
          ]
        },
        {
          id: 'measure-beam',
          label: '',
          icon: IconRectangleVertical,
          submenu: [
            { id: 'measure-beam-5', label: '5 ft' },
            { id: 'measure-beam-10', label: '10 ft' },
            { id: 'measure-beam-15', label: '15 ft' },
            { id: 'measure-beam-20', label: '20 ft' }
          ]
        }
      ]
    }
  ]);

  import { cleanStagePropsForYjs } from '$lib/utils/stage/cleanStagePropsForYjs';

  // Reset active layer to None after a delay (3 seconds)
  // Also clears currentTemporaryLayerId so a new layer is created on next draw
  // Shows the persist button if there's a pending position
  function resetToNoneAfterDelay() {
    if (resetLayerTimer) {
      clearTimeout(resetLayerTimer);
    }
    resetLayerTimer = setTimeout(() => {
      devLog('playfield', 'Resetting active layer to None after timeout');

      // Show persist button now that drawing window is closed
      if (pendingPersistPosition && currentTemporaryLayerId) {
        // Clear any existing timer
        if (persistButtonTimer) {
          clearTimeout(persistButtonTimer);
        }

        persistButtonLayerId = currentTemporaryLayerId;
        persistButtonPosition = pendingPersistPosition;
        showPersistButton = true;
        pendingPersistPosition = null;

        // Auto-hide after 3 seconds
        persistButtonTimer = setTimeout(() => {
          showPersistButton = false;
          persistButtonLayerId = null;
        }, 3000);
      }

      stageProps.activeLayer = MapLayerType.None;
      stageProps.annotations.activeLayer = null;
      currentTemporaryLayerId = null;
      resetLayerTimer = null;
    }, 3000);
  }

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
        resetToNoneAfterDelay();
        break;

      case 'fog-clear':
        devLog('playfield', 'Fog action: Clear fog');
        if (stage?.fogOfWar) {
          stage.fogOfWar.clear();
        }
        resetToNoneAfterDelay();
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

        // Check if we have an active temporary layer with the same color
        const existingLayer = currentTemporaryLayerId
          ? stageProps.annotations.layers.find((l) => l.id === currentTemporaryLayerId && l.color === selectedColor)
          : null;

        if (existingLayer) {
          // Reuse existing layer, just reset the timer
          devLog('playfield', `Continuing draw on existing layer with color: ${selectedColor}`);
          stageProps.annotations.activeLayer = currentTemporaryLayerId;
          stageProps.activeLayer = MapLayerType.Annotation;
          resetToNoneAfterDelay();
        } else {
          // Create a new temporary layer for drawing
          devLog('playfield', `Starting new draw with color: ${selectedColor}`);
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
          const manager = getPartyDataManager();
          if (manager && currentTemporaryLayerId) {
            const tempYjsLayer = createTemporaryLayer(currentTemporaryLayerId, user.id, tempLayer.color, '', 10000);
            broadcastTemporaryLayer(manager, tempYjsLayer);
            temporaryLayers = getTemporaryLayers(manager);
          }

          resetToNoneAfterDelay();
        }
        break;
      }

      case 'draw-delete-all-confirm': {
        devLog('playfield', 'Deleting all annotation layers');

        (async () => {
          try {
            // Get persisted annotation IDs from SSR data
            const persistedAnnotationIds = data.activeSceneAnnotations?.map((a) => a.id) || [];

            // Delete persisted annotations from database
            for (const annotationId of persistedAnnotationIds) {
              await deleteAnnotationMutation.mutateAsync({ annotationId });
              devLog('playfield', `Deleted annotation from database: ${annotationId}`);
            }

            // Clear all annotation layers from stageProps
            stageProps.annotations.layers = [];
            stageProps.annotations.activeLayer = null;
            ssrAnnotationLayers = [];

            // Clear temporary layers from Y.js awareness
            const manager = getPartyDataManager();
            if (manager) {
              for (const tempLayer of temporaryLayers) {
                removeTemporaryLayer(manager, tempLayer.id);
              }
              temporaryLayers = [];

              // Broadcast the updated stageProps to sync with editor
              if (data.activeScene?.id) {
                manager.updateSceneStageProps(data.activeScene.id, stageProps);
                devLog('playfield', 'Broadcasted annotation deletion to Y.js');
              }
            }

            // Clear current temporary layer ID
            currentTemporaryLayerId = null;

            // Reset to none
            stageProps.activeLayer = MapLayerType.None;

            devLog('playfield', 'All annotation layers deleted');
          } catch (error) {
            devError('playfield', 'Error deleting annotation layers:', error);
          }
        })();
        break;
      }

      case 'draw-delete-all-cancel':
        // User cancelled, do nothing
        devLog('playfield', 'Delete all cancelled');
        break;

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

      case 'measure-cone-30':
      case 'measure-cone-60':
      case 'measure-cone-90': {
        const coneAngle = parseInt(itemId.replace('measure-cone-', ''), 10);
        devLog('playfield', `Starting cone measurement with angle: ${coneAngle}°`);
        stageProps.activeLayer = MapLayerType.Measurement;
        stageProps.measurement.type = MeasurementType.Cone;
        stageProps.measurement.coneAngle = coneAngle;
        break;
      }

      case 'measure-beam-5':
      case 'measure-beam-10':
      case 'measure-beam-15':
      case 'measure-beam-20': {
        const beamWidth = parseInt(itemId.replace('measure-beam-', ''), 10);
        devLog('playfield', `Starting beam measurement with width: ${beamWidth} ft`);
        stageProps.activeLayer = MapLayerType.Measurement;
        stageProps.measurement.type = MeasurementType.Beam;
        stageProps.measurement.beamWidth = beamWidth;
        break;
      }

      default:
        // Check if it's a scene selection
        if (itemId.startsWith('scene-')) {
          const sceneId = itemId.replace('scene-', '');
          devLog('playfield', 'Player initiated scene switch to:', sceneId);
          const manager = getPartyDataManager();
          if (manager) {
            // Log connection status before making any changes
            const connectionStatus = manager.getConnectionStatus();
            devLog('playfield', 'Scene switch - Y.js connection status:', {
              sceneId,
              connectionStatus,
              managerGameSessionId: manager.gameSessionId,
              currentGameSessionId
            });

            // Update database first to ensure persistence across hard refreshes
            (async () => {
              try {
                await updatePartyMutation.mutateAsync({
                  partyId: party.id,
                  partyData: { activeSceneId: sceneId }
                });

                devLog('playfield', 'Database updated with new active scene');

                // Note: switchActiveScene is called AFTER invalidateAll() completes
                // to ensure we use a connected manager (the old one may be destroyed during invalidation)

                // Manually trigger page reload for the local client
                devLog('playfield', 'Manually triggering page reload for locally-initiated scene change');
                lastProcessedSceneId = sceneId;
                isProcessingSceneChange = true;
                isInvalidating = true;
                sceneIsChanging = true;

                // Clear Y.js scene data to allow SSR data to be used for new scene
                yjsSceneData = null;
                lastYjsUpdateTimestamp = 0;

                // Invalidate with retry to handle stale SSR data
                const success = await invalidateWithRetry(sceneId);

                if (success) {
                  devLog('playfield', 'Page reload complete after locally-initiated scene change');

                  // Check if game session changed (cross-session scene switch)
                  const newGameSessionId = data.activeGameSession?.id;
                  if (newGameSessionId && newGameSessionId !== currentGameSessionId) {
                    devLog('playfield', 'Game session changed during radial menu scene switch, reinitializing Y.js:', {
                      from: currentGameSessionId,
                      to: newGameSessionId
                    });

                    currentGameSessionId = newGameSessionId;
                    destroyPartyDataManager();

                    const partySlug = page.params.party;
                    if (partySlug) {
                      initializePartyDataManager(partySlug, user.id, newGameSessionId, data.partykitHost);
                      partyData = usePartyData();

                      // Call switchActiveScene with the NEW manager to broadcast to other clients
                      // Wait a moment for the party connection to establish
                      const newManager = getPartyDataManager();
                      if (newManager) {
                        // Wait for party connection before broadcasting
                        const waitForConnection = () => {
                          return new Promise<void>((resolve) => {
                            const checkConnection = () => {
                              const status = newManager.getConnectionStatus();
                              if (status.party === 'connected') {
                                resolve();
                              } else {
                                setTimeout(checkConnection, 50);
                              }
                            };
                            // Start checking immediately
                            checkConnection();
                            // Also resolve after a reasonable timeout (1 second)
                            setTimeout(resolve, 1000);
                          });
                        };

                        waitForConnection().then(() => {
                          devLog('playfield', 'Broadcasting scene change via new Y.js manager:', {
                            sceneId,
                            connectionStatus: newManager.getConnectionStatus()
                          });
                          switchActiveScene(newManager, sceneId);
                        });
                      }

                      partyData.subscribe(() => {
                        if (isUnmounting || isInvalidating) return;
                        const updatedPartyState = partyData!.getPartyState();
                        yjsPartyState = {
                          isPaused: updatedPartyState.isPaused,
                          activeSceneId: updatedPartyState.activeSceneId
                        };
                        if (updatedPartyState.activeSceneId) {
                          const sceneData = partyData!.getSceneData(updatedPartyState.activeSceneId);
                          if (sceneData?.stageProps) {
                            yjsSceneData = sceneData;
                          }
                        }
                      });
                    }
                  } else {
                    // Same game session - ensure Y.js is updated with current manager
                    const currentManager = getPartyDataManager();
                    if (currentManager) {
                      const status = currentManager.getConnectionStatus();
                      if (status.party === 'connected') {
                        devLog('playfield', 'Broadcasting scene change via existing Y.js manager (same session):', {
                          sceneId,
                          connectionStatus: status
                        });
                        switchActiveScene(currentManager, sceneId);
                      }
                    }
                  }

                  // Update yjsPartyState from SSR data to ensure correct state
                  yjsPartyState = {
                    isPaused: party.gameSessionIsPaused,
                    activeSceneId: data.activeScene?.id
                  };
                  hasActiveScene = !!data.activeScene?.id;
                } else {
                  devWarn('playfield', 'Scene change may not have loaded correctly, SSR returned stale data');
                }

                isInvalidating = false;
                isProcessingSceneChange = false;
                sceneIsChanging = false;
              } catch (error) {
                devError('playfield', 'Error updating scene:', error);
                isInvalidating = false;
                isProcessingSceneChange = false;
                sceneIsChanging = false;
              }
            })();
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

  // Helper to invalidate with retry when SSR returns stale data
  const invalidateWithRetry = async (expectedSceneId: string, maxRetries = 3, retryDelay = 300): Promise<boolean> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await invalidateAll();

      // Check if SSR returned the expected scene
      if (data.activeScene?.id === expectedSceneId) {
        devLog('playfield', `invalidateWithRetry succeeded on attempt ${attempt + 1}`);
        return true;
      }

      devLog('playfield', `invalidateWithRetry: SSR returned wrong scene`, {
        expected: expectedSceneId,
        got: data.activeScene?.id,
        attempt: attempt + 1,
        maxRetries
      });

      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    devWarn('playfield', `invalidateWithRetry: Max retries reached, SSR still returning wrong scene`, {
      expected: expectedSceneId,
      got: data.activeScene?.id
    });
    return false;
  };

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
        // Convert base64 to Uint8Array and apply to the annotation layer
        const bytes = base64ToUint8Array(data.maskData);
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

      // Preserve local state that shouldn't be overwritten by Y.js
      const currentActiveLayer = stageProps.activeLayer;
      const currentAnnotationsActiveLayer = stageProps.annotations?.activeLayer;

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
        // Preserve active layer if playfield has set one (e.g., for drawing/fog)
        activeLayer: currentActiveLayer,
        // Filter markers to remove DM-only ones, and protect markers being moved
        marker: {
          ...yjsSceneData.stageProps.marker,
          markers: (() => {
            // First filter out DM-only markers
            const incomingMarkers = (yjsSceneData.stageProps.marker?.markers || []).filter(
              (m: Marker) => m.visibility !== 1
            ); // 1 = MarkerVisibility.DM

            // Then apply protection logic using the utility
            return mergeMarkersWithProtection(
              stageProps.marker.markers,
              incomingMarkers,
              markersBeingMoved,
              new Set<string>(), // No edited markers in play route
              new Set<string>() // No deleted markers tracking in play route
            );
          })()
        },
        // Merge Y.js annotations (permanent) with temporary layers from Y.js awareness
        annotations: (() => {
          const yjsLayers = yjsSceneData.stageProps.annotations?.layers || [];
          const localLayers = stageProps.annotations?.layers || [];

          // Create a map of Y.js layer IDs for quick lookup
          const yjsLayerIds = new Set(yjsLayers.map((l: AnnotationLayerData) => l.id));

          // Y.js is the source of truth for permanent annotations.
          // Only use SSR layers if Y.js has NO annotation data at all (initial sync not complete).
          // Once Y.js has any data, trust it completely (even if it has fewer layers than SSR).
          const yjsHasAnnotationData = yjsSceneData.stageProps.annotations !== undefined;

          // Update ssrAnnotationLayers to match Y.js (remove any that Y.js doesn't have)
          // This prevents re-adding deleted annotations when we sync back to Y.js
          if (yjsHasAnnotationData && yjsLayers.length > 0) {
            ssrAnnotationLayers = ssrAnnotationLayers.filter((layer) => yjsLayerIds.has(layer.id));
          }

          // Build merged layers with deduplication using Map
          const layersMap = new Map<string, AnnotationLayerData>();

          // First, add Y.js annotation layers (filter out DM-only permanent annotations)
          for (const layer of yjsLayers) {
            if ((layer as AnnotationLayerData).visibility === 1) {
              // 1 = StageMode.Player
              layersMap.set(layer.id, layer as AnnotationLayerData);
            }
          }

          // Only add SSR layers if Y.js hasn't synced annotation data yet
          if (!yjsHasAnnotationData) {
            for (const layer of ssrAnnotationLayers) {
              // Keep if it's player-visible and not already in Y.js
              if (layer.visibility === 1 && !layersMap.has(layer.id)) {
                layersMap.set(layer.id, layer);
              }
            }
          }

          // Add temporary layers from playfield drawing
          for (const layer of localLayers) {
            // Skip if already added
            if (layersMap.has(layer.id)) {
              continue;
            }
            // Skip if in SSR layers
            if (ssrAnnotationLayers.find((l) => l.id === layer.id)) {
              continue;
            }

            // Check if this is a temporary layer from playfield drawing
            const isTemporary = temporaryLayers.find((t) => t.id === layer.id);
            if (isTemporary) {
              // Keep temporary layers if current or not expired
              if (layer.id === currentTemporaryLayerId || isTemporary.expiresAt > Date.now()) {
                layersMap.set(layer.id, layer);
              }
            }
          }

          const mergedLayers = Array.from(layersMap.values());

          return {
            ...(yjsSceneData.stageProps.annotations || {}),
            layers: mergedLayers,
            activeLayer: currentAnnotationsActiveLayer || null // Preserve active layer
          };
        })()
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
        const builtProps = buildSceneProps(
          data.activeScene,
          data.activeSceneMarkers,
          'client',
          data.activeSceneAnnotations,
          data.bucketUrl
        );
        stageProps = builtProps;
        // Store SSR annotation layers to preserve them during Y.js merging
        ssrAnnotationLayers = builtProps.annotations?.layers || [];
        devLog('playfield', 'Stored SSR annotation layers:', {
          count: ssrAnnotationLayers.length,
          ids: ssrAnnotationLayers.map((l) => l.id)
        });
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

      // Load annotation masks from SSR data if available (after invalidateAll completes)
      // This ensures masks are loaded when switching to a scene that already has annotations
      devLog('playfield', 'Scene changed, loading annotation masks from SSR data');
      loadAnnotationMasksFromSsr().catch((error) => {
        console.error('Error loading annotation masks from SSR after scene change:', error);
      });

      // Also fetch annotation masks for any layers that have a maskVersion
      // This handles cases where Y.js has newer versions than SSR
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
      const builtProps = buildSceneProps(
        data.activeScene,
        data.activeSceneMarkers,
        'client',
        data.activeSceneAnnotations,
        data.bucketUrl
      );
      stageProps = builtProps;
      // Store SSR annotation layers to preserve them during Y.js merging
      ssrAnnotationLayers = builtProps.annotations?.layers || [];
      devLog('playfield', 'Initial SSR annotation layers stored:', {
        count: ssrAnnotationLayers.length,
        ids: ssrAnnotationLayers.map((l) => l.id)
      });
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
    } catch (error) {
      devError('playfield', 'Error updating fog mask:', error);
    }
  };

  const onFogUpdate = async () => {
    // Store a flag that we need to process fog update
    pendingFogBlob = new Blob();

    // Reset the layer timeout since user is actively drawing
    resetToNoneAfterDelay();

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
      const measurementProps = extractMeasurementProps(stageProps.measurement);
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
      const measurementProps = extractMeasurementProps(stageProps.measurement);
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
    }
    // Note: If no SSR data, the Y.js sync effect at line ~663 will handle
    // fetching the mask when Y.js provides a maskVersion. We intentionally
    // don't set lastFogMaskVersion here to ensure the effect triggers.
  }

  function onStageLoading() {
    stageIsLoading = true;
  }

  /**
   * Load annotation masks from SSR data
   * Called on initial stage load and when active scene changes
   */
  async function loadAnnotationMasksFromSsr() {
    devLog('playfield', 'loadAnnotationMasksFromSsr called:', {
      hasMaskData: !!data.activeSceneAnnotationMasks,
      hasStage: !!stage,
      hasLoadMask: !!stage?.annotations?.loadMask,
      maskCount: data.activeSceneAnnotationMasks ? Object.keys(data.activeSceneAnnotationMasks).length : 0,
      layerCount: stageProps.annotations?.layers?.length || 0,
      layerIds: stageProps.annotations?.layers?.map((l) => l.id) || []
    });

    if (data.activeSceneAnnotationMasks && stage?.annotations?.loadMask) {
      try {
        for (const [annotationId, maskData] of Object.entries(data.activeSceneAnnotationMasks)) {
          if (maskData) {
            // Check if the annotation layer exists in stageProps
            const layerExists = stageProps.annotations.layers.some((layer) => layer.id === annotationId);
            if (!layerExists) {
              devLog(
                'playfield',
                `Skipping mask load for annotation ${annotationId} - layer not found in stageProps. Available layers:`,
                {
                  availableLayerIds: stageProps.annotations.layers.map((l) => l.id),
                  searchingFor: annotationId
                }
              );
              continue;
            }

            devLog('playfield', `Loading annotation mask from SSR data for layer ${annotationId}`);
            // Convert base64 to Uint8Array and apply to the annotation layer
            const bytes = base64ToUint8Array(maskData);
            await stage.annotations.loadMask(annotationId, bytes);
            devLog('playfield', `Successfully loaded annotation mask for layer ${annotationId}`);
          }
        }
      } catch (error) {
        console.error('Error loading annotation masks:', error);
      }
    } else {
      devLog('playfield', 'Skipping annotation mask loading - requirements not met:', {
        hasMaskData: !!data.activeSceneAnnotationMasks,
        hasStage: !!stage,
        hasLoadMask: !!stage?.annotations?.loadMask
      });
    }
  }

  async function onStageInitialized() {
    stageIsLoading = false;

    // Load fog mask from SSR data if available
    await loadFogMask();

    // Load annotation masks from SSR data if available
    await loadAnnotationMasksFromSsr();

    // Immediately fit when stage is ready
    if (stage?.scene?.fit) {
      stage.scene.fit();
    }

    // Show touch hint on first load for touch devices
    if (typeof window !== 'undefined' && 'ontouchstart' in window) {
      isTouchDevice = true;
      showTouchHint = true;
      setTimeout(() => {
        showTouchHint = false;
      }, 3000);
    }
  }

  async function onAnnotationUpdate(layerId: string, blob: Promise<Blob>, endPosition?: { x: number; y: number }) {
    // Reset the layer timeout since user is actively drawing
    resetToNoneAfterDelay();

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
              const base64 = uint8ArrayToBase64(rleData);

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

              // Store end position for persist button (shown after drawing window closes)
              if (endPosition) {
                pendingPersistPosition = endPosition;
              }
            }
          }
        } catch (error) {
          devError('playfield', 'Error broadcasting temporary layer:', error);
        }

        // Reset timer - user has 3 more seconds to continue drawing on the same layer
        devLog('playfield', 'Drawing stroke complete, resetting 3-second buffer timer');
        resetToNoneAfterDelay();
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

  // Handle persist button click - save temporary drawing to database
  async function handlePersistDrawing() {
    // Capture the layer ID immediately before any async operations
    // (the timeout might clear persistButtonLayerId during awaits)
    const layerIdToSave = persistButtonLayerId;

    if (!layerIdToSave || !data.activeScene) {
      devWarn('playfield', 'Cannot persist drawing: missing layer ID or active scene');
      handleDismissPersistButton();
      return;
    }

    const manager = getPartyDataManager();
    if (!manager) {
      devWarn('playfield', 'Cannot persist drawing: no party data manager');
      handleDismissPersistButton();
      return;
    }

    // Find the temporary layer data using the captured ID
    const tempLayer = temporaryLayers.find((l) => l.id === layerIdToSave);
    if (!tempLayer) {
      devWarn('playfield', 'Cannot persist drawing: temporary layer not found');
      handleDismissPersistButton();
      return;
    }

    // Dismiss the button immediately to prevent double-clicks
    handleDismissPersistButton();

    try {
      devLog('playfield', 'Persisting temporary drawing:', layerIdToSave);

      // Create the annotation in the database
      const newAnnotation = await upsertAnnotationMutation.mutateAsync({
        sceneId: data.activeScene.id,
        name: 'Player drawing',
        color: tempLayer.color,
        opacity: 1.0,
        visibility: StageMode.Player
      });

      if (!newAnnotation) {
        throw new Error('Failed to create annotation');
      }

      // Convert base64 mask data to Uint8Array and save it
      const binaryString = atob(tempLayer.maskData);
      const maskData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        maskData[i] = binaryString.charCodeAt(i);
      }

      await updateAnnotationMaskMutation.mutateAsync({
        annotationId: newAnnotation.id,
        partyId: party.id,
        maskData
      });

      devLog('playfield', 'Drawing persisted successfully:', newAnnotation.id);

      // Create the new annotation layer data for Y.js sync
      const newAnnotationLayer: AnnotationLayerData = {
        id: newAnnotation.id,
        name: newAnnotation.name,
        color: newAnnotation.color,
        opacity: newAnnotation.opacity,
        visibility: StageMode.Player,
        url: null,
        maskVersion: Date.now() // Set mask version to signal other clients
      };

      // Remove the temporary layer AND any layer that might have the same ID as the new annotation
      // (deduplication to prevent any race conditions)
      const filteredLayers = stageProps.annotations.layers.filter(
        (l) => l.id !== layerIdToSave && l.id !== newAnnotation.id
      );

      // Create deduplicated layers array with new annotation at the front
      // Use a Map to ensure uniqueness by ID
      const layersMap = new Map<string, AnnotationLayerData>();
      layersMap.set(newAnnotationLayer.id, newAnnotationLayer);
      for (const layer of filteredLayers) {
        if (!layersMap.has(layer.id)) {
          layersMap.set(layer.id, layer);
        }
      }
      const deduplicatedLayers = Array.from(layersMap.values());

      // Add the new permanent annotation layer
      stageProps.annotations.layers = deduplicatedLayers;

      // Sync to Y.js for real-time collaboration with editors
      const activeSceneId = yjsPartyState.activeSceneId || data.activeScene.id;
      manager.updateSceneStageProps(activeSceneId, cleanStagePropsForYjs(stageProps));

      // Remove the temporary layer from awareness and tracking
      removeTemporaryLayer(manager, layerIdToSave);
      temporaryLayers = getTemporaryLayers(manager);
      knownTemporaryLayerIds.delete(layerIdToSave);

      // Also add to SSR layers so it survives Y.js merging
      ssrAnnotationLayers = [newAnnotationLayer, ...ssrAnnotationLayers.filter((l) => l.id !== layerIdToSave)];

      // Note: We intentionally DON'T call invalidateAll() here.
      // The Y.js sync is the source of truth, and invalidateAll() can cause race conditions
      // where SSR data merges with Y.js data and creates duplicates.
    } catch (error) {
      devError('playfield', 'Error persisting drawing:', error);
    }
    // Button was already dismissed at the start of the function
  }

  // Handle persist button dismiss
  function handleDismissPersistButton() {
    if (persistButtonTimer) {
      clearTimeout(persistButtonTimer);
      persistButtonTimer = null;
    }
    showPersistButton = false;
    persistButtonLayerId = null;
  }

  // Track the latest measurement to pass to Stage
  $effect(() => {
    const newest = getLatestMeasurement(measurements);
    if (newest) {
      devLog('playfield', 'Latest measurement to pass to Stage:', newest);
    }
    latestMeasurement = newest;
  });

  // Fade-out logic is now handled in CursorLayer component via opacity calculation

  // Track which temporary layer masks have been loaded to prevent repeated attempts
  const loadedTemporaryMasks = new Set<string>();

  // Helper function to load mask with retry
  const loadTemporaryMaskWithRetry = async (layerId: string, maskData: string, retries = 3, delay = 100) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
      try {
        if (stage?.annotations?.loadMask) {
          const binaryString = atob(maskData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          await stage.annotations.loadMask(layerId, bytes);
          loadedTemporaryMasks.add(layerId);
          return true;
        }
      } catch {
        // Silently retry - component may not be ready yet
        if (attempt === retries - 1) {
          devWarn('playfield', `Failed to load temporary layer ${layerId} after ${retries} attempts`);
        }
      }
    }
    return false;
  };

  // Effect to convert temporary layers to annotation layers for display
  // This effect reacts to temporaryLayers changes and updates stageProps
  $effect(() => {
    if (!stage?.annotations) return;

    // Only react to temporaryLayers changes - use untrack for stageProps reads
    // to prevent infinite loop (we read and write stageProps.annotations.layers)
    const tempLayersCopy = [...temporaryLayers]; // Create dependency on temporaryLayers

    untrack(() => {
      // Convert temporary layers to annotation layer data
      const tempAnnotationLayers: AnnotationLayerData[] = tempLayersCopy.map((tempLayer) => ({
        id: tempLayer.id,
        name: tempLayer.name,
        color: tempLayer.color,
        opacity: tempLayer.opacity,
        url: null,
        maskVersion: undefined,
        visibility: StageMode.Player
      }));

      // Track which IDs are temporary
      tempLayersCopy.forEach((t) => knownTemporaryLayerIds.add(t.id));

      // Add temporary layers to annotations (without replacing existing ones)
      const existingLayerIds = new Set(stageProps.annotations.layers.map((l) => l.id));
      const newLayers = tempAnnotationLayers.filter((l) => !existingLayerIds.has(l.id));

      if (newLayers.length > 0) {
        stageProps.annotations.layers = [...stageProps.annotations.layers, ...newLayers];

        // Load RLE data for each new temporary layer after components render
        // Use setTimeout to give Three.js/Threlte time to create components
        setTimeout(() => {
          newLayers.forEach((layer) => {
            // Skip if already loaded
            if (loadedTemporaryMasks.has(layer.id)) return;

            const tempLayer = tempLayersCopy.find((t) => t.id === layer.id);
            if (tempLayer && tempLayer.maskData) {
              loadTemporaryMaskWithRetry(layer.id, tempLayer.maskData);
            }
          });
        }, 50);
      }

      // Remove expired temporary layers from annotations
      const now = Date.now();
      const activeTemporaryIds = new Set(tempLayersCopy.map((t) => t.id));

      const filteredLayers = stageProps.annotations.layers.filter((l) => {
        // If this is a known temporary layer ID
        if (knownTemporaryLayerIds.has(l.id)) {
          // Check if it's still in the active temporary layers
          if (activeTemporaryIds.has(l.id)) {
            // Keep if currently being drawn or not expired
            const tempLayer = tempLayersCopy.find((t) => t.id === l.id);
            if (l.id === currentTemporaryLayerId) {
              return true;
            }
            return tempLayer && tempLayer.expiresAt > now;
          }
          // It was temporary but is no longer in the list - remove it
          // Also clean up the loaded masks tracking
          loadedTemporaryMasks.delete(l.id);
          return false;
        }

        // Not a temporary layer - always keep (it's a permanent annotation)
        return true;
      });

      if (filteredLayers.length !== stageProps.annotations.layers.length) {
        stageProps.annotations.layers = filteredLayers;
      }
    });
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

        // Invalidate the page to load the new scene data with retry logic
        // This is necessary because:
        // 1. The new scene might be in a different game session requiring new Y.js connection
        // 2. We need fresh SSR data for the new scene
        // 3. The playfield needs to reinitialize with the correct scene context
        const expectedSceneId = yjsPartyState.activeSceneId;
        (async () => {
          try {
            const success = await invalidateWithRetry(expectedSceneId);

            devLog('playfield', 'invalidateAll() completed:', {
              newActiveSceneId: data.activeScene?.id,
              newGameSessionId: data.activeGameSession?.id,
              success,
              timestamp: Date.now()
            });

            if (success) {
              devLog('playfield', 'Page invalidation complete after active scene change');
            } else {
              devWarn('playfield', 'Scene change may not have loaded correctly, SSR returned stale data');
            }

            // Check if game session changed (cross-session scene switch)
            const newGameSessionId = data.activeGameSession?.id;
            if (newGameSessionId && newGameSessionId !== currentGameSessionId) {
              devLog('playfield', 'Game session changed during scene switch, reinitializing Y.js:', {
                from: currentGameSessionId,
                to: newGameSessionId
              });

              // Update tracked game session ID
              currentGameSessionId = newGameSessionId;

              // Destroy old Y.js connection
              destroyPartyDataManager();

              // Reinitialize with new game session
              const partySlug = page.params.party;
              if (partySlug) {
                initializePartyDataManager(partySlug, user.id, newGameSessionId, data.partykitHost);
                partyData = usePartyData();

                // Resubscribe to Y.js changes
                partyData.subscribe(() => {
                  if (isUnmounting || isInvalidating) return;

                  const updatedPartyState = partyData!.getPartyState();
                  yjsPartyState = {
                    isPaused: updatedPartyState.isPaused,
                    activeSceneId: updatedPartyState.activeSceneId
                  };

                  // Update scene data
                  if (updatedPartyState.activeSceneId) {
                    const sceneData = partyData!.getSceneData(updatedPartyState.activeSceneId);
                    if (sceneData?.stageProps) {
                      yjsSceneData = sceneData;
                    }
                  }
                });

                devLog('playfield', 'Y.js reinitialized for new game session');
              }
            }

            // Update yjsPartyState from SSR data to ensure correct state
            // Y.js may not have synced yet, so use SSR as source of truth
            yjsPartyState = {
              isPaused: party.gameSessionIsPaused,
              activeSceneId: data.activeScene?.id
            };
            hasActiveScene = !!data.activeScene?.id;

            devLog('playfield', 'Updated yjsPartyState from SSR after scene change:', {
              activeSceneId: data.activeScene?.id,
              hasActiveScene
            });

            // Reset flags after invalidation completes
            isInvalidating = false;
            isProcessingSceneChange = false;
            // Clear scene changing state after invalidation
            sceneIsChanging = false;
          } catch (error) {
            devLog('playfield', 'invalidateAll() failed:', error);
            devError('playfield', 'Error invalidating page after active scene change:', error);
            // Reset flags even on error
            isInvalidating = false;
            isProcessingSceneChange = false;
            sceneIsChanging = false;
          }
        })();

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

<!-- Touch hint overlay -->
{#if isTouchDevice && showTouchHint && !gameIsPaused}
  <div class="touchHint" class:touchHint--hidden={!showTouchHint}>
    <span>Press and hold with two fingers to bring up menu</span>
  </div>
{/if}

<!-- Radial menu for player interactions -->
<RadialMenu
  visible={menuVisible}
  position={menuPosition}
  items={menuItems}
  backIcon={IconArrowBackUp}
  onItemSelect={handleMenuItemSelect}
  onClose={handleMenuClose}
  onReposition={(pos) => {
    menuPosition = pos;
  }}
/>

<!-- Persist button for saving temporary drawings -->
<PersistButton
  visible={showPersistButton}
  position={persistButtonPosition}
  onPersist={handlePersistDrawing}
  onDismiss={handleDismissPersistButton}
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

  .touchHint {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.7);
    color: var(--fg);
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    font-size: 1.25rem;
    z-index: 100;
    pointer-events: none;
    opacity: 1;
    transition: opacity 0.5s ease-out;
  }

  .touchHint--hidden {
    opacity: 0;
  }
</style>
