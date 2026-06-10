<script lang="ts">
  import { goto } from '$app/navigation';
  import { navigating, page } from '$app/state';
  import {
    AnnotationManager,
    Checklist,
    ChecklistHelpButton,
    Head,
    Hints,
    LightManager,
    MarkerManager,
    SceneControls,
    SceneSelector,
    SceneZoom,
    Shortcuts,
    type ChecklistItemId
  } from '$lib/components';
  import { useUpdateChecklistProgressMutation, useUploadSceneThumbnailMutation } from '$lib/queries';
  import { buildRenderProps, reuseUnchanged, type AnnotationRow, type MarkerRow } from '$lib/realtime';
  import {
    bindPropertyUpdatesToDoc,
    buildSceneProps,
    convertMarkerToDbFormat,
    extractLocationFromUrl,
    handleKeyCommands,
    handleStageZoom,
    queuePropertyUpdate,
    resetGridOrigin,
    setChecklistContext,
    unbindPropertyUpdates
  } from '$lib/utils';
  import { getPreference, setPreference, type PaneConfig } from '$lib/utils/gameSessionPreferences';
  import { getLatestMeasurement } from '$lib/utils/measurements';
  import { throttle } from '$lib/utils/throttle';
  import {
    AnnotationEffect,
    DrawingSliders,
    MapLayerType,
    MarkerVisibility,
    PerformanceDebugger,
    PointerInputManager,
    Stage,
    StageMode,
    ToolType,
    type AnnotationLayerData,
    type HoveredMarker,
    type Light,
    type Marker,
    type StageExports,
    type StageProps
  } from '@tableslayer/stage';
  import { addToast, FogSliders, Icon } from '@tableslayer/ui';
  import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp } from '@tabler/icons-svelte';
  import { Pane, PaneGroup, PaneResizer, type PaneAPI } from 'paneforge';
  import { onMount, untrack } from 'svelte';
  import { EditorSession } from './useEditorSession.svelte';

  let { data } = $props();
  const { gameSession, party, user, isStripeEnabled, checklistState } = $derived(data);

  const selectedSceneId = $derived(page.params.selectedScene ?? data.selectedScene.id);

  // ---------------------------------------------------------------------------
  // Realtime session (connection identity captured once at mount)
  // ---------------------------------------------------------------------------

  const createThumbnailMutation = useUploadSceneThumbnailMutation();
  const updateChecklistMutation = useUpdateChecklistProgressMutation();

  const session = untrack(
    () =>
      new EditorSession({
        partyId: data.party.id,
        gameSessionId: data.gameSession.id,
        userId: data.user.id,
        partykitHost: data.partykitHost,
        selectedSceneId: () => selectedSceneId,
        getStage: () => stage,
        uploadThumbnail: async (blob, sceneId, currentUrl) => {
          try {
            return await createThumbnailMutation.mutateAsync({ blob, sceneId, currentUrl });
          } catch {
            return null; // thumbnails are best-effort
          }
        }
      })
  );

  // Panel property updates write through to the selected scene's doc subtree
  $effect(() => {
    if (session.client && selectedSceneId) {
      bindPropertyUpdatesToDoc(session.client, selectedSceneId);
    }
  });

  const scenes = $derived(session.ready && session.client ? session.client.scenes() : data.scenes);
  const partyState = $derived(
    session.ready && session.client
      ? session.client.partyState()
      : { activeSceneId: data.activeScene?.id ?? null, isPaused: data.party.gameSessionIsPaused }
  );
  const activeSceneId = $derived(partyState.activeSceneId ?? undefined);
  const currentParty = $derived({ ...party, gameSessionIsPaused: partyState.isPaused });

  // "Connected" now means "your edits are durable" — the server persists doc
  // changes. Toast only the transitions worth telling the user about: a drop
  // after being live, and the subsequent recovery. First connect is silent.
  const connectionLive = $derived(
    session.client?.status.gameSession === 'connected' && session.client?.status.party === 'connected'
  );
  let wasLive = false;
  $effect(() => {
    const live = session.ready && connectionLive;
    if (wasLive && !live) {
      addToast({ data: { title: 'Connection lost — edits will sync when back online', type: 'danger' } });
    } else if (!wasLive && live && wasEverLive) {
      addToast({ data: { title: 'Reconnected', type: 'success' } });
    }
    if (live) wasEverLive = true;
    wasLive = live;
  });
  let wasEverLive = false;

  // Doc settings stand in for the SelectScene row that the control panels expect
  const selectedSceneForControls = $derived.by(() => {
    const snapshot = session.ready && session.client ? session.client.scene(selectedSceneId) : null;
    return snapshot ? (snapshot.settings as unknown as typeof data.selectedScene) : data.selectedScene;
  });

  // If the selected scene disappears (deleted by another editor), fall back
  $effect(() => {
    if (!session.ready || scenes.length === 0 || navigating.to) return;
    if (!scenes.some((scene) => scene.id === selectedSceneId)) {
      goto(`/${page.params.party}/${page.params.gameSession}/${scenes[0].id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // Stage props: doc snapshot + local view -> StageProps
  // Children mutate stageProps for instant feedback; shared values write through
  // to the doc (queuePropertyUpdate / direct writes) and the rebuild below keeps
  // stageProps identical to the doc. Local-only view state is carried over.
  // ---------------------------------------------------------------------------

  const getMinBrushSize = (gridSpacing: number, displayWidth: number) => {
    if (gridSpacing && displayWidth && displayWidth > 0) {
      return Math.max(0.5, (gridSpacing / displayWidth) * 100);
    }
    return 2;
  };

  const clampFogBrush = (value: number, props: StageProps) =>
    Math.max(getMinBrushSize(props.grid.spacing, props.display.size.x), Math.min(20, value));

  // SSR strips masks from annotation rows (serialization) and ships them as a
  // separate record; merge them back so the seed props paint layers immediately
  const ssrAnnotations = () =>
    data.selectedSceneAnnotations.map((annotation) => ({
      ...annotation,
      mask: data.selectedSceneAnnotationMasks?.[annotation.id] ?? null
    }));

  const initialStageProps = untrack(() => {
    const props = buildSceneProps(
      data.selectedScene,
      data.selectedSceneMarkers,
      'editor',
      ssrAnnotations(),
      data.selectedSceneLights,
      data.bucketUrl
    );
    props.fogOfWar.tool.size = clampFogBrush(getPreference('brushSizePercent') || 10.0, props);
    props.annotations.lineWidth = Math.max(0.01, Math.min(5.0, getPreference('annotationLineWidthPercent') || 2.0));
    props.annotations.smoothingEnabled = getPreference('annotationSmoothing') ?? true;
    return props;
  });

  let stageProps: StageProps = $state(initialStageProps);
  let dragPositions = $state<Record<string, { x: number; y: number }>>({});
  let lastBuiltSceneId: string | undefined = untrack(() => data.selectedScene.id);

  $effect(() => {
    const snapshot = session.ready && session.client ? session.client.scene(selectedSceneId) : null;
    const drags = dragPositions;
    const ssrScene = data.selectedScene;

    if (!snapshot) {
      // Realtime not ready (or scene missing from the doc): scene navigation must
      // still work from SSR data — degraded mode, not a frozen editor.
      if (ssrScene.id === selectedSceneId && ssrScene.id !== lastBuiltSceneId) {
        lastBuiltSceneId = ssrScene.id;
        untrack(() => {
          const props = buildSceneProps(
            ssrScene,
            data.selectedSceneMarkers,
            'editor',
            ssrAnnotations(),
            data.selectedSceneLights,
            data.bucketUrl
          );
          props.fogOfWar.tool.size = clampFogBrush(getPreference('brushSizePercent') || 10.0, props);
          props.annotations.lineWidth = Math.max(
            0.01,
            Math.min(5.0, getPreference('annotationLineWidthPercent') || 2.0)
          );
          props.annotations.smoothingEnabled = getPreference('annotationSmoothing') ?? true;
          stageProps = props;
          activeControl = 'none';
          selectedMarkerId = undefined;
          selectedLightId = undefined;
          selectedAnnotationId = undefined;
          resetGridOrigin();
          sceneMasksApplied = false;
        });
      }
      return;
    }

    const isSceneSwitch = snapshot.id !== lastBuiltSceneId;
    lastBuiltSceneId = snapshot.id;

    untrack(() => {
      const prev = stageProps;
      const next = buildRenderProps(
        snapshot,
        {
          mode: 'editor',
          activeLayer: isSceneSwitch ? MapLayerType.None : prev.activeLayer,
          viewport: isSceneSwitch
            ? {
                offset: { x: snapshot.settings.sceneOffsetX, y: snapshot.settings.sceneOffsetY },
                rotation: snapshot.settings.sceneRotation,
                zoom: 1
              }
            : { offset: prev.scene.offset, zoom: prev.scene.zoom, rotation: prev.scene.rotation },
          markerPositions: drags,
          fogTool: isSceneSwitch
            ? { size: clampFogBrush(getPreference('brushSizePercent') || 10.0, prev) }
            : { type: prev.fogOfWar.tool.type, size: prev.fogOfWar.tool.size, mode: prev.fogOfWar.tool.mode },
          annotations: isSceneSwitch
            ? {
                activeLayer: null,
                lineWidth: Math.max(0.01, Math.min(5.0, getPreference('annotationLineWidthPercent') || 2.0)),
                smoothingEnabled: getPreference('annotationSmoothing') ?? true
              }
            : {
                activeLayer: prev.annotations.activeLayer,
                lineWidth: prev.annotations.lineWidth,
                smoothingEnabled: prev.annotations.smoothingEnabled
              },
          measurement: isSceneSwitch
            ? undefined
            : {
                type: prev.measurement.type,
                coneAngle: prev.measurement.coneAngle,
                beamWidth: prev.measurement.beamWidth
              }
        },
        data.bucketUrl
      );
      // Structural sharing: unchanged subtrees keep their identity so stage-internal
      // effects (measurement reset, material/texture updates) don't re-fire
      stageProps = reuseUnchanged(prev, next);

      if (isSceneSwitch) {
        activeControl = 'none';
        selectedMarkerId = undefined;
        selectedLightId = undefined;
        selectedAnnotationId = undefined;
        resetGridOrigin();
        sceneMasksApplied = false;
      }
    });
  });

  // Apply doc masks when the displayed scene changes (and once the stage exists)
  let sceneMasksApplied = $state(false);
  $effect(() => {
    if (stageIsLoading || sceneMasksApplied || !session.ready) return;
    if (lastBuiltSceneId !== selectedSceneId) return;
    sceneMasksApplied = true;
    session.applyMasks(selectedSceneId);
  });

  // ---------------------------------------------------------------------------
  // UI state
  // ---------------------------------------------------------------------------

  let stage: StageExports = $state(null)!;
  let stageElement: HTMLDivElement | undefined = $state();
  let stageIsLoading = $state(true);
  let isCursorInScene = $state(false);
  let activeControl = $state('none');
  let keyboardPopoverId = $state<string | null>(null);
  let selectedMarkerId: string | undefined = $state();
  let selectedLightId: string | undefined = $state();
  let selectedAnnotationId: string | undefined = $state();
  let activeElement: HTMLElement | null = $state(null);
  let innerWidth: number = $state(1000);
  let hoveredMarker: HoveredMarker | null = $state(null);

  const isMobile = $derived(innerWidth < 768);
  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.0005;

  const pinnedMarkerIds = $derived(stageProps.marker.markers.filter((m) => m.pinnedTooltip).map((m) => m.id));
  const activeAnnotation = $derived(
    stageProps?.annotations.layers.find((layer) => layer.id === stageProps.annotations.activeLayer)
  );
  const isHoveringMarker = $derived(stage?.markers?.isHoveringMarker ?? false);
  const isDraggingMarker = $derived(stage?.markers?.isDraggingMarker ?? false);

  const stageClasses = $derived(
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

  // Measurements received from other clients (playfield -> editor)
  const measurements = $derived(session.presence?.measurements ?? {});
  const latestMeasurement = $derived(getLatestMeasurement(measurements));

  // ---------------------------------------------------------------------------
  // Checklist
  // ---------------------------------------------------------------------------

  let checklistCompletedItems = $state<string[]>(untrack(() => checklistState?.completedItems ?? []));
  let checklistDismissed = $state(untrack(() => checklistState?.isDismissed ?? false));
  let forceShowChecklist = $state(false);
  const panelRequiringControls = ['annotation', 'light', 'marker'];
  const showChecklist = $derived(
    !panelRequiringControls.includes(activeControl) &&
      !selectedMarkerId &&
      (forceShowChecklist || (checklistState?.isEligibleForAutoShow && !checklistDismissed))
  );

  const trackChecklistItemLocal = (itemId: string) => {
    if (!checklistCompletedItems.includes(itemId)) {
      checklistCompletedItems = [...checklistCompletedItems, itemId];
      updateChecklistMutation.mutate({ completedItems: checklistCompletedItems, dismissed: checklistDismissed });
    }
  };

  setChecklistContext({
    trackItem: trackChecklistItemLocal,
    isItemCompleted: (itemId) => checklistCompletedItems.includes(itemId)
  });

  const handleChecklistItemComplete = (itemId: ChecklistItemId) => {
    checklistCompletedItems = checklistCompletedItems.includes(itemId)
      ? checklistCompletedItems.filter((id) => id !== itemId)
      : [...checklistCompletedItems, itemId];
    updateChecklistMutation.mutate({ completedItems: checklistCompletedItems, dismissed: checklistDismissed });
  };

  const handleChecklistDismiss = () => {
    checklistDismissed = true;
    forceShowChecklist = false;
    updateChecklistMutation.mutate({ completedItems: checklistCompletedItems, dismissed: true });
  };

  const handleShowChecklist = () => {
    forceShowChecklist = true;
    activeControl = 'none';
    selectedMarkerId = undefined;
    queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
    if (isMarkersCollapsed) {
      markersPane.expand();
    }
  };

  // ---------------------------------------------------------------------------
  // Pane layout
  // ---------------------------------------------------------------------------

  let scenesPane: PaneAPI = $state(undefined)!;
  let markersPane: PaneAPI = $state(undefined)!;
  let lightsPane: PaneAPI = $state(undefined)!;
  let isScenesCollapsed = $state(false);
  let isMarkersCollapsed = $state(true);

  const getInitialLayout = (key: 'paneLayoutDesktop' | 'paneLayoutMobile', serverValue: PaneConfig[] | undefined) => {
    if (typeof window !== 'undefined') {
      const saved = getPreference(key);
      if (saved) return saved;
    }
    return (
      serverValue ||
      (key === 'paneLayoutDesktop'
        ? [{ size: 20, isCollapsed: false }, { size: 50 }, { size: 30, isCollapsed: true }]
        : [{ size: 25, isCollapsed: false }, { size: 50 }, { size: 25, isCollapsed: true }])
    );
  };

  let clientPaneLayoutDesktop = $state<PaneConfig[]>(
    untrack(() => getInitialLayout('paneLayoutDesktop', data.paneLayoutDesktop))
  );
  let clientPaneLayoutMobile = $state<PaneConfig[]>(
    untrack(() => getInitialLayout('paneLayoutMobile', data.paneLayoutMobile))
  );
  const paneLayout = $derived(isMobile ? clientPaneLayoutMobile : clientPaneLayoutDesktop);

  $effect(() => {
    if (paneLayout && Array.isArray(paneLayout)) {
      isScenesCollapsed = paneLayout[0]?.isCollapsed ?? false;
      isMarkersCollapsed = paneLayout[2]?.isCollapsed ?? true;
    }
  });

  const startPaneMinSize = $derived(isMobile ? 10 : Math.min(50, Math.ceil((250 / innerWidth) * 100)));
  const endPaneMinSize = $derived(isMobile ? 10 : Math.min(50, Math.ceil((300 / innerWidth) * 100)));

  const onLayoutChange = (sizes: number[]) => {
    const roundedSizes = sizes.map((size) => Math.round(size));
    const newLayout: PaneConfig[] = [
      { size: roundedSizes[0], isCollapsed: isScenesCollapsed },
      { size: roundedSizes[1] },
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

  const saveCollapseState = () => {
    if (!paneLayout || !Array.isArray(paneLayout)) return;
    onLayoutChange(paneLayout.map((p) => p.size));
  };

  const handleToggleScenes = () => (isScenesCollapsed ? scenesPane.expand() : scenesPane.collapse());
  const handleToggleMarkers = () => (isMarkersCollapsed ? markersPane.expand() : markersPane.collapse());
  const handleToggleAnnotationPanel = () => {
    if (isMarkersCollapsed) {
      markersPane.expand();
      if (activeControl !== 'annotation') activeControl = 'annotation';
    } else {
      markersPane.collapse();
    }
  };

  const getCollapseIcon = () => {
    if (isMobile) return isScenesCollapsed ? IconChevronDown : IconChevronUp;
    return isScenesCollapsed ? IconChevronRight : IconChevronLeft;
  };
  const getMarkerCollapseIcon = () => {
    if (isMobile) return isMarkersCollapsed ? IconChevronUp : IconChevronDown;
    return isMarkersCollapsed ? IconChevronLeft : IconChevronRight;
  };

  // ---------------------------------------------------------------------------
  // Tool selection
  // ---------------------------------------------------------------------------

  const handleSelectActiveControl = (control: string, openPopover?: string | null): string | null => {
    if (activeControl === 'light') selectedLightId = undefined;

    if (control === activeControl) {
      activeControl = 'none';
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      if (control === 'annotation') {
        queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
      }
      return null;
    }

    activeControl = control;
    if (control === 'annotation' || control === 'light' || control === 'marker') {
      forceShowChecklist = false;
    }

    if (control === 'marker') {
      selectedMarkerId = undefined;
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Marker, 'control');
      queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
      markersPane?.expand();
    } else if (control === 'light') {
      selectedLightId = undefined;
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Light, 'control');
      queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
      lightsPane?.expand();
    } else if (control === 'annotation') {
      selectedAnnotationId = undefined;
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Annotation, 'control');
    } else if (control === 'measurement') {
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Measurement, 'control');
      queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
      trackChecklistItemLocal('measurement');
    } else if (control === 'erase') {
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.FogOfWar, 'control');
      queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
    } else {
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
    }

    return openPopover !== undefined ? openPopover : control;
  };

  // Auto-manage annotation layer activation (create-on-first-use)
  let lastActiveLayer = $state<MapLayerType | null>(null);
  let lastActiveAnnotationLayer = $state<string | null>(null);
  $effect(() => {
    const activeLayerValue = stageProps.activeLayer;
    const activeAnnotationLayer = stageProps.annotations.activeLayer;
    if (activeLayerValue === lastActiveLayer && activeAnnotationLayer === lastActiveAnnotationLayer) return;
    lastActiveLayer = activeLayerValue;
    lastActiveAnnotationLayer = activeAnnotationLayer;

    untrack(() => {
      if (activeLayerValue === MapLayerType.Annotation) {
        if (activeControl !== 'annotation') activeControl = 'annotation';
        if (!activeAnnotationLayer) {
          if (stageProps.annotations.layers.length === 0) {
            onAnnotationCreated();
          } else {
            queuePropertyUpdate(
              stageProps,
              ['annotations', 'activeLayer'],
              stageProps.annotations.layers[0].id,
              'control'
            );
          }
        }
      } else if (activeAnnotationLayer) {
        queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], null, 'control');
      }
    });
  });

  $effect(() => {
    if (stageProps.activeLayer === MapLayerType.Marker && activeControl !== 'marker') {
      activeControl = 'marker';
      markersPane.expand();
    }
  });

  // ---------------------------------------------------------------------------
  // Stage callbacks: every shared edit writes the doc; nothing here saves to the DB
  // ---------------------------------------------------------------------------

  const handleSceneFit = () => stage.scene.fit();
  const handleMapFill = () => stage.map.fit();
  const handleMapFit = () => stage.map.fit();

  const onMapUpdate = (offset: { x: number; y: number }, zoom: number) => {
    queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], offset.x, 'control');
    queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], offset.y, 'control');
    queuePropertyUpdate(stageProps, ['map', 'zoom'], zoom, 'control');
  };

  const onSceneUpdate = (offset: { x: number; y: number }, zoom: number) => {
    stageProps.scene.offset.x = offset.x;
    stageProps.scene.offset.y = offset.y;
    stageProps.scene.zoom = zoom;
  };

  const onStageLoading = () => {
    stageIsLoading = true;
  };

  const onStageInitialized = async () => {
    stageIsLoading = false;

    // SSR fog mask gives a fast first paint; the doc re-applies once ready.
    // (Annotation masks are declarative layer props — no application needed.)
    if (data.selectedSceneFogMask && stage?.fogOfWar?.fromRLE) {
      try {
        const bytes = Uint8Array.from(atob(data.selectedSceneFogMask), (c) => c.charCodeAt(0));
        await stage.fogOfWar.fromRLE(bytes, 1024, 1024);
      } catch {
        // doc apply will retry
      }
    }
  };

  // Markers ------------------------------------------------------------------

  const upsertMarkerRow = (marker: Marker) => {
    if (!session.client) return;
    const row = convertMarkerToDbFormat(marker, selectedSceneId);
    session.client.write.setMarkerFields(selectedSceneId, marker.id, {
      ...row,
      sceneId: selectedSceneId
    } as Partial<MarkerRow>);
  };

  const onMarkerAdded = (marker: Marker) => {
    stageProps.marker.markers = [...stageProps.marker.markers, marker];
    selectedMarkerId = marker.id;
    upsertMarkerRow(marker);
    trackChecklistItemLocal('place-marker');
  };

  const writeMarkerPosition = throttle((markerId: string, position: { x: number; y: number }) => {
    session.client?.write.setMarkerFields(selectedSceneId, markerId, { positionX: position.x, positionY: position.y });
  }, 50);
  const dragClearTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const onMarkerMoved = (marker: Marker, position: { x: number; y: number }) => {
    const index = stageProps.marker.markers.findIndex((m: Marker) => m.id === marker.id);
    if (index === -1) return;
    stageProps.marker.markers[index] = { ...marker, position: { x: position.x, y: position.y } };
    dragPositions[marker.id] = position;
    writeMarkerPosition(marker.id, position);

    clearTimeout(dragClearTimers.get(marker.id));
    dragClearTimers.set(
      marker.id,
      setTimeout(() => {
        session.client?.write.setMarkerFields(selectedSceneId, marker.id, {
          positionX: position.x,
          positionY: position.y
        });
        delete dragPositions[marker.id];
        dragClearTimers.delete(marker.id);
      }, 300)
    );
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

  const onMarkerDeleted = (markerId: string) => {
    stageProps.marker.markers = stageProps.marker.markers.filter((m) => m.id !== markerId);
    session.client?.write.deleteMarker(selectedSceneId, markerId);
  };

  const updateMarkerAndSave = (markerId: string, updateFn: (marker: Marker) => void) => {
    const markerIndex = stageProps.marker.markers.findIndex((m: Marker) => m.id === markerId);
    if (markerIndex === -1) return;
    updateFn(stageProps.marker.markers[markerIndex]);
    stageProps.marker.markers = [...stageProps.marker.markers];
    upsertMarkerRow(stageProps.marker.markers[markerIndex]);
  };

  const onPinToggle = (markerId: string, pinned: boolean) => {
    if (stageProps.mode !== StageMode.DM) return;
    const markerIndex = stageProps.marker.markers.findIndex((m) => m.id === markerId);
    if (markerIndex === -1) return;
    stageProps.marker.markers[markerIndex].pinnedTooltip = pinned;
    session.client?.write.setMarkerFields(selectedSceneId, markerId, { pinnedTooltip: pinned });
  };

  const onMarkerHover = (marker: Marker | null) => {
    if (stageProps.mode !== StageMode.DM) return;
    if (marker && marker.visibility === MarkerVisibility.Hover) {
      hoveredMarker = {
        id: marker.id,
        position: { x: marker.position.x, y: marker.position.y, z: 0 },
        tooltip: {
          title: marker.title,
          content: marker.note ? JSON.stringify(marker.note) : '',
          imageUrl: marker.imageUrl || undefined
        }
      };
      session.presence?.updateHoveredMarker(hoveredMarker);
    } else {
      hoveredMarker = null;
      session.presence?.updateHoveredMarker(null);
    }
  };

  // Lights ---------------------------------------------------------------------

  const writeLightRow = (light: Light) => {
    session.client?.write.setLightFields(selectedSceneId, light.id, {
      id: light.id,
      sceneId: selectedSceneId,
      positionX: light.position.x,
      positionY: light.position.y,
      radius: light.radius,
      color: light.color,
      style: light.style,
      pulse: light.pulse,
      opacity: light.opacity ?? 1
    });
  };

  const onLightAdded = (light: Light) => {
    stageProps.light.lights = [...stageProps.light.lights, light];
    selectedLightId = light.id;
    trackChecklistItemLocal('add-light');
    writeLightRow(light);
  };

  const onLightMoved = (light: Light, position: { x: number; y: number }) => {
    const index = stageProps.light.lights.findIndex((l: Light) => l.id === light.id);
    if (index === -1) return;
    stageProps.light.lights[index] = { ...light, position: { x: position.x, y: position.y } };
    writeLightRow(stageProps.light.lights[index]);
  };

  const onLightSelected = (light: Light | null) => {
    selectedLightId = light?.id || undefined;
  };

  const onLightDeleted = (lightId: string) => {
    stageProps.light.lights = stageProps.light.lights.filter((l) => l.id !== lightId);
    session.client?.write.deleteLight(selectedSceneId, lightId);
  };

  const updateLightAndSave = (lightId: string, updateFn: (light: Light) => void) => {
    const lightIndex = stageProps.light.lights.findIndex((l: Light) => l.id === lightId);
    if (lightIndex === -1) return;
    updateFn(stageProps.light.lights[lightIndex]);
    stageProps.light.lights = [...stageProps.light.lights];
    writeLightRow(stageProps.light.lights[lightIndex]);
  };

  // Annotations ------------------------------------------------------------------

  const annotationColors = [
    '#d73e2e',
    '#ffa500',
    '#ffd93d',
    '#6bcf7f',
    '#2e86ab',
    '#b197fc',
    '#f06595',
    '#20c997',
    '#845ef7',
    '#4c6ef5',
    '#15803d',
    '#dc2626',
    '#06b6d4',
    '#ec4899',
    '#8b5cf6',
    '#059669'
  ];

  const annotationRowFromLayer = (layer: AnnotationLayerData, order: number): AnnotationRow => ({
    id: layer.id,
    sceneId: selectedSceneId,
    name: layer.name || 'New Annotation',
    opacity: typeof layer.opacity === 'number' ? layer.opacity : 1.0,
    color: layer.color || '#FF0000',
    url: layer.url?.startsWith('https://') ? (extractLocationFromUrl(layer.url) ?? layer.url) : (layer.url ?? null),
    visibility: layer.visibility,
    order,
    effectType: layer.effect?.type ?? null
  });

  const onAnnotationCreated = () => {
    const newAnnotation: AnnotationLayerData = {
      id: crypto.randomUUID(),
      name: `Drawing ${stageProps.annotations.layers.length + 1}`,
      color: annotationColors[Math.floor(Math.random() * annotationColors.length)],
      opacity: 1.0,
      visibility: StageMode.Player,
      url: null
    };

    stageProps.annotations.layers = [newAnnotation, ...stageProps.annotations.layers];
    queuePropertyUpdate(stageProps, ['annotations', 'activeLayer'], newAnnotation.id, 'control');
    queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Annotation, 'control');
    selectedAnnotationId = newAnnotation.id;
    if (activeControl !== 'annotation') handleSelectActiveControl('annotation');

    if (session.client) {
      const snapshot = session.client.scene(selectedSceneId);
      const minOrder = Math.min(1, ...(snapshot?.annotations.map((a) => a.order) ?? []));
      session.client.write.upsertAnnotation(selectedSceneId, annotationRowFromLayer(newAnnotation, minOrder - 1));
    }
  };

  const onAnnotationUpdated = (annotation: AnnotationLayerData) => {
    const index = stageProps.annotations.layers.findIndex((a) => a.id === annotation.id);
    session.client?.write.upsertAnnotation(selectedSceneId, annotationRowFromLayer(annotation, Math.max(index, 0)));
  };

  const onAnnotationDeleted = (annotationId: string) => {
    const remainingLayers = stageProps.annotations.layers.filter((layer) => layer.id !== annotationId);
    stageProps.annotations.layers = remainingLayers;
    if (remainingLayers.length > 0) {
      stageProps.annotations.activeLayer = remainingLayers[0].id;
    } else {
      stageProps.annotations.activeLayer = null;
      stageProps.activeLayer = MapLayerType.None;
    }
    session.client?.write.deleteAnnotation(selectedSceneId, annotationId);
  };

  // Annotation mask strokes -> doc, debounced per layer
  const annotationMaskTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const commitAnnotationMask = async (layerId: string) => {
    if (!session.client || !stage?.annotations) return;
    if (stage.annotations.isDrawing()) return;

    // toRLE reads the active layer; point it at the target temporarily
    const originalActiveLayer = stageProps.annotations.activeLayer;
    stageProps.annotations.activeLayer = layerId;
    try {
      const rle = await stage.annotations.toRLE();
      if (rle && rle.length > 0) {
        session.client.write.setAnnotationMask(selectedSceneId, layerId, rle);
      }
    } finally {
      stageProps.annotations.activeLayer = originalActiveLayer;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onAnnotationUpdate = (layerId: string, _blob: Promise<Blob>) => {
    const existing = annotationMaskTimers.get(layerId);
    if (existing) clearTimeout(existing);
    annotationMaskTimers.set(
      layerId,
      setTimeout(() => {
        annotationMaskTimers.delete(layerId);
        commitAnnotationMask(layerId);
      }, 500)
    );
  };

  // Fog of war -------------------------------------------------------------------

  let fogCommitTimer: ReturnType<typeof setTimeout> | null = null;

  const commitFogMask = async () => {
    if (!session.client || !stage?.fogOfWar) return;
    if (stage.fogOfWar.isDrawing()) return; // next stroke end re-arms
    const rle = await stage.fogOfWar.toRLE();
    if (rle && !stage.fogOfWar.isDrawing()) {
      session.client.write.setFogMask(selectedSceneId, rle);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onFogUpdate = (_blob: Promise<Blob>) => {
    trackChecklistItemLocal('fog-erase');
    if (fogCommitTimer) clearTimeout(fogCommitTimer);
    fogCommitTimer = setTimeout(() => {
      fogCommitTimer = null;
      commitFogMask();
    }, 500);
  };

  // Measurements (broadcast only when editing the active scene) -------------------

  const isOnActiveScene = () => selectedSceneId === partyState.activeSceneId;

  const measurementStyle = () => ({
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
  });

  const onMeasurementStart = (startPoint: { x: number; y: number }, type: number) => {
    if (!isOnActiveScene()) return;
    session.presence?.updateMeasurement(startPoint, startPoint, type, measurementStyle());
  };

  const onMeasurementUpdate = (
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    type: number
  ) => {
    if (!isOnActiveScene()) return;
    session.presence?.updateMeasurement(startPoint, endPoint, type, measurementStyle());
  };

  const onMeasurementEnd = () => {
    if (!isOnActiveScene()) return;
    session.presence?.updateMeasurement(null, null, 0);
  };

  // Cursor + viewport interaction ---------------------------------------------------

  const userColor = untrack(
    () =>
      `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0')}`
  );
  const throttledCursorUpdate = throttle((worldPosition: { x: number; y: number; z: number }) => {
    session.presence?.updateCursor(worldPosition, userColor, user.email);
  }, 33);

  const handleCursorMove = (worldPosition: { x: number; y: number; z: number }) => {
    if (isOnActiveScene()) throttledCursorUpdate(worldPosition);
  };

  const throttledZoomHandler = throttle((e: WheelEvent, props: StageProps) => {
    handleStageZoom(e, props);
  }, 50);

  const onMouseMove = (e: MouseEvent) => {
    const rotation = stageProps.scene.rotation;
    const canvasBounds = stageElement?.getBoundingClientRect();
    if (!canvasBounds) return;

    const cursorX = e.clientX - canvasBounds.left;
    const cursorY = e.clientY - canvasBounds.top;
    const displayWidth = stageProps.display.resolution.x * stageProps.scene.zoom;
    const displayHeight = stageProps.display.resolution.y * stageProps.scene.zoom;
    const rotatedWidth = rotation % 180 === 0 ? displayWidth : displayHeight;
    const rotatedHeight = rotation % 180 === 0 ? displayHeight : displayWidth;
    const horizontalMargin = (canvasBounds.width - rotatedWidth) / 2;
    const verticalMargin = (canvasBounds.height - rotatedHeight) / 2;
    const relativeX = cursorX - horizontalMargin;
    const relativeY = cursorY - verticalMargin;
    isCursorInScene = relativeX >= 0 && relativeX <= rotatedWidth && relativeY >= 0 && relativeY <= rotatedHeight;

    if (e.buttons === 1 || e.buttons === 2) {
      const radians = (Math.PI / 180) * rotation;
      const rotatedMovementX = e.movementX * Math.cos(radians) + e.movementY * Math.sin(radians);
      const rotatedMovementY = -e.movementX * Math.sin(radians) + e.movementY * Math.cos(radians);

      if (e.shiftKey) {
        const movementFactor = 1 / stageProps.scene.zoom;
        queuePropertyUpdate(
          stageProps,
          ['map', 'offset', 'x'],
          stageProps.map.offset.x + rotatedMovementX * movementFactor,
          'control'
        );
        queuePropertyUpdate(
          stageProps,
          ['map', 'offset', 'y'],
          stageProps.map.offset.y - rotatedMovementY * movementFactor,
          'control'
        );
      } else if (e.ctrlKey) {
        stageProps.scene.offset.x += rotatedMovementX;
        stageProps.scene.offset.y -= rotatedMovementY;
      }
    }
  };

  function onMapPan(dx: number, dy: number) {
    queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], stageProps.map.offset.x + dx, 'control');
    queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], stageProps.map.offset.y + dy, 'control');
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

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) e.preventDefault();

    if (stageProps.activeLayer === MapLayerType.Annotation && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      const scrollDelta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.05;
      const currentLineWidth = stageProps.annotations.lineWidth || 2.0;
      const newLineWidth = Math.max(0.01, Math.min(currentLineWidth - scrollDelta * 0.01, 5.0));
      stageProps.annotations.lineWidth = newLineWidth;
      setPreference('annotationLineWidthPercent', newLineWidth);
      return;
    }

    if (stageProps.activeLayer === MapLayerType.FogOfWar && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      const scrollDelta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.1;
      const currentSize = stageProps.fogOfWar.tool.size || 10.0;
      const newSize = clampFogBrush(currentSize - scrollDelta * 0.1, stageProps);
      stageProps.fogOfWar.tool.size = newSize;
      setPreference('brushSizePercent', newSize);
      return;
    }

    throttledZoomHandler(e, stageProps);
  };

  // Keyboard -------------------------------------------------------------------

  const handleKeydown = (event: KeyboardEvent) => {
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable)
    ) {
      return;
    }

    const previousControl = activeControl;
    const newActiveControl = handleKeyCommands(event, stageProps, activeControl, stage, handleSelectActiveControl);
    activeControl = newActiveControl;

    if (
      previousControl !== newActiveControl ||
      ['erase', 'marker', 'annotation', 'measurement', 'none'].includes(newActiveControl)
    ) {
      keyboardPopoverId = null;
    }
  };

  // Drawing slider handlers - bound from AnnotationManager
  let handleOpacityChange: ((value: number) => void) | undefined = $state();
  let handleBrushSizeChange: ((value: number) => void) | undefined = $state();
  let handleColorChange: ((color: string, opacity: number) => void) | undefined = $state();
  let handleEffectChange: ((effect: AnnotationEffect) => void) | undefined = $state();

  onMount(() => {
    if (stageElement) {
      stageElement.addEventListener('mousemove', onMouseMove);
      stageElement.addEventListener('mouseleave', () => {
        isCursorInScene = false;
      });
      stageElement.addEventListener('wheel', onWheel, { passive: false });
      stageElement.addEventListener('contextmenu', (e) => e.preventDefault(), false);
    }

    return () => {
      if (fogCommitTimer) clearTimeout(fogCommitTimer);
      annotationMaskTimers.forEach((timer) => clearTimeout(timer));
      annotationMaskTimers.clear();
      dragClearTimers.forEach((timer) => clearTimeout(timer));
      dragClearTimers.clear();
      unbindPropertyUpdates();
      session.destroy();
    };
  });
</script>

<svelte:document onkeydown={handleKeydown} bind:activeElement />
<svelte:window bind:innerWidth />
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
        {selectedSceneId}
        {gameSession}
        {scenes}
        party={currentParty}
        {activeSceneId}
        client={session.client}
        {isStripeEnabled}
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
        {#if stageProps.activeLayer === MapLayerType.Annotation && activeAnnotation && handleOpacityChange && handleBrushSizeChange && handleColorChange}
          <DrawingSliders
            opacity={activeAnnotation.opacity}
            brushSize={stageProps.annotations.lineWidth || 2.0}
            color={activeAnnotation.color}
            currentEffect={activeAnnotation.effect?.type ?? AnnotationEffect.None}
            activeLayerIndex={stageProps.annotations.layers.findIndex(
              (l) => l.id === stageProps.annotations.activeLayer
            ) + 1}
            onOpacityChange={handleOpacityChange}
            onBrushSizeChange={handleBrushSizeChange}
            onColorChange={handleColorChange}
            onEffectChange={handleEffectChange}
            onLayersClick={handleToggleAnnotationPanel}
          />
        {/if}
        {#if stageProps.activeLayer === MapLayerType.FogOfWar && stageProps.fogOfWar.tool.type === ToolType.Brush}
          <FogSliders
            brushSize={stageProps.fogOfWar.tool.size || 10.0}
            gridSpacing={stageProps.grid.spacing}
            displayWidth={stageProps.display.size.x}
            onBrushSizeChange={(size) => {
              queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'size'], size, 'control');
              setPreference('brushSizePercent', size);
            }}
          />
        {/if}
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
              onLightAdded,
              onLightMoved,
              onLightSelected,
              onMeasurementStart,
              onMeasurementUpdate,
              onMeasurementEnd,
              onCursorMove: handleCursorMove
            }}
            trackLocalCursor={true}
            hoveredMarkerId={hoveredMarker?.id || null}
            {pinnedMarkerIds}
            {onPinToggle}
            receivedMeasurement={latestMeasurement
              ? {
                  startPoint: latestMeasurement.startPoint,
                  endPoint: latestMeasurement.endPoint,
                  type: latestMeasurement.type,
                  beamWidth: latestMeasurement.beamWidth,
                  coneAngle: latestMeasurement.coneAngle,
                  color: latestMeasurement.color,
                  thickness: latestMeasurement.thickness,
                  outlineColor: latestMeasurement.outlineColor,
                  outlineThickness: latestMeasurement.outlineThickness,
                  opacity: latestMeasurement.opacity,
                  markerSize: latestMeasurement.markerSize,
                  autoHideDelay: latestMeasurement.autoHideDelay,
                  fadeoutTime: latestMeasurement.fadeoutTime,
                  showDistance: latestMeasurement.showDistance,
                  snapToGrid: latestMeasurement.snapToGrid,
                  enableDMG252: latestMeasurement.enableDMG252
                }
              : null}
          />
          <PerformanceDebugger />
        </div>
        <SceneControls
          {stageProps}
          {stage}
          {handleMapFill}
          {handleMapFit}
          selectedScene={selectedSceneForControls}
          {activeSceneId}
          {handleSelectActiveControl}
          {activeControl}
          party={currentParty}
          {gameSession}
          client={session.client}
          {keyboardPopoverId}
        />
        <SceneZoom {handleSceneFit} {handleMapFill} {stageProps} />
        <Shortcuts />
        <ChecklistHelpButton onclick={handleShowChecklist} />
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
            bind:handleOpacityChange
            bind:handleBrushSizeChange
            bind:handleColorChange
            bind:handleEffectChange
            annotationMasks={data.selectedSceneAnnotationMasks}
            smoothingEnabled={stageProps.annotations.smoothingEnabled}
            onSmoothingChange={(enabled) => {
              stageProps.annotations.smoothingEnabled = enabled;
              setPreference('annotationSmoothing', enabled);
            }}
          />
        {/key}
      {:else if activeControl === 'light'}
        {#key selectedLightId}
          <LightManager
            partyId={party.id}
            sceneId={selectedSceneId}
            {stageProps}
            bind:selectedLightId
            {handleSelectActiveControl}
            {updateLightAndSave}
            {onLightDeleted}
          />
        {/key}
      {:else if showChecklist}
        <Checklist
          completedItems={checklistCompletedItems}
          onComplete={handleChecklistItemComplete}
          onDismiss={handleChecklistDismiss}
        />
      {:else}
        {#key selectedMarkerId}
          <MarkerManager
            partyId={party.id}
            {stageProps}
            bind:selectedMarkerId
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
