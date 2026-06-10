<script lang="ts">
  import { Head } from '$lib/components';
  import { buildRenderProps, reuseUnchanged } from '$lib/realtime';
  import { buildSceneProps, devLog, throttle } from '$lib/utils';
  import { transformCursorsToArray } from '$lib/utils/cursors';
  import { StageDefaultProps } from '$lib/utils/defaultMapState';
  import { createUnifiedGestureDetector } from '$lib/utils/gestureDetection';
  import { extractMeasurementProps, getLatestMeasurement } from '$lib/utils/measurements';
  import { createConditionalActivityTimer } from '$lib/utils/yjs/activityTimer';
  import {
    MapLayerType,
    PerformanceDebugger,
    RadialMenu,
    Stage,
    StageMode,
    type Marker,
    type StageExports,
    type StageProps
  } from '@tableslayer/stage';
  import { PersistButton } from '@tableslayer/ui';
  import { IconArrowBackUp } from '@tabler/icons-svelte';
  import { onMount, untrack } from 'svelte';
  import PauseOverlay from './PauseOverlay.svelte';
  import { PlaySession } from './usePlaySession.svelte';
  import { PlayTools } from './usePlayTools.svelte';

  let { data } = $props();
  const { user, party } = $derived(data);

  let stage: StageExports | undefined = $state();
  let stageElement: HTMLDivElement | undefined = $state();
  let stageIsLoading = $state(true);

  // Connection identity and SSR seeds are intentionally captured once at mount
  const session = untrack(
    () =>
      new PlaySession({
        partyId: data.party.id,
        userId: data.user.id,
        partykitHost: data.partykitHost,
        initialGameSessionId: data.activeGameSession?.id,
        initialActiveSceneId: data.activeScene?.id ?? null,
        initialIsPaused: data.party.gameSessionIsPaused,
        bucketUrl: data.bucketUrl,
        routes: () => data.gameSessionsWithScenes,
        getStage: () => stage
      })
  );

  const tools = untrack(
    () =>
      new PlayTools({
        session,
        userId: data.user.id,
        getStage: () => stage,
        routes: () => data.gameSessionsWithScenes,
        defaultSessionFilter: () => session.gameSessionId
      })
  );

  // ---------------------------------------------------------------------------
  // Render props: doc snapshot + local view -> StageProps (one-directional).
  // SSR fallback shows the active map immediately while the doc connects; once
  // a snapshot exists, renderedProps always derives from it.
  // ---------------------------------------------------------------------------

  // Plain variable on purpose: zoom comes back from the Stage's autofit, and a
  // reactive read here would rebuild renderedProps -> refit -> zoom -> loop.
  let sceneZoom = 1;
  let dragPositions = $state<Record<string, { x: number; y: number }>>({});

  const fallbackProps: StageProps = untrack(() =>
    data.activeScene
      ? buildSceneProps(data.activeScene, [], 'client', [], [], data.bucketUrl)
      : { ...StageDefaultProps, mode: StageMode.Player, activeLayer: MapLayerType.None }
  );

  let renderedProps = $state<StageProps>(fallbackProps);
  let renderedSceneId = $state<string | null>(untrack(() => data.activeScene?.id ?? null));

  $effect(() => {
    const snapshot = session.activeScene;
    if (!snapshot) return;
    const props = buildRenderProps(
      snapshot,
      {
        mode: 'client',
        activeLayer: tools.activeLayer,
        viewport: { offset: { x: 0, y: 0 }, zoom: sceneZoom },
        markerPositions: dragPositions,
        fogTool: { mode: tools.fogTool.mode, size: tools.fogTool.size },
        annotations: {
          activeLayer: tools.annotationsActiveLayer,
          lineWidth: tools.lineWidth,
          smoothingEnabled: false
        },
        measurement: tools.measurement
      },
      data.bucketUrl
    );
    props.annotations.layers = [...tools.tempAnnotationLayers, ...props.annotations.layers];
    // Structural sharing: unchanged subtrees keep their identity so stage-internal
    // effects (measurement reset, material/texture updates) don't re-fire
    renderedProps = untrack(() => reuseUnchanged(renderedProps, props));
    renderedSceneId = snapshot.id;
  });

  const sceneIsChanging = $derived(session.activeSceneId !== null && session.activeSceneId !== renderedSceneId);
  const gameIsPaused = $derived(session.isPaused || !session.activeSceneId);
  const stageClasses = $derived([
    'stage',
    (stageIsLoading || sceneIsChanging) && 'stage--loading',
    gameIsPaused && 'stage--hidden'
  ]);

  // Presence-driven overlays
  const cursorArray = $derived(
    transformCursorsToArray(
      Object.fromEntries(
        Object.entries(session.presence?.cursors ?? {}).map(([id, cursor]) => [id, { ...cursor, fadedOut: false }])
      )
    )
  );
  const hoveredMarkerId = $derived(session.presence?.hoveredMarker?.id ?? null);
  const latestMeasurement = $derived(getLatestMeasurement(session.presence?.measurements ?? {}));
  $effect(() => {
    if (latestMeasurement) devLog('play', `measurement received (type ${latestMeasurement.type})`);
  });
  $effect(() => {
    devLog(
      'play',
      `state: client=${!!session.client} ready=${session.ready} ` +
        `conn=${session.client?.status.gameSession}/${session.client?.status.party} ` +
        `room=${session.gameSessionId?.slice(0, 8)} active=${session.activeSceneId?.slice(0, 8)} ` +
        `snapshot=${!!session.activeScene} rendered=${renderedSceneId?.slice(0, 8)}`
    );
  });
  const pinnedMarkerIds = $derived(renderedProps.marker.markers.filter((m) => m.pinnedTooltip).map((m) => m.id));

  // Apply masks + refit when the rendered scene changes. Gated on session.ready
  // so it re-runs once the doc is hydrated — applying before that finds no masks.
  let lastPreparedSceneId: string | null = null;
  $effect(() => {
    if (stageIsLoading || !renderedSceneId || !session.ready) return;
    if (renderedSceneId === lastPreparedSceneId) return;
    lastPreparedSceneId = renderedSceneId;
    devLog('play', `applying masks for scene ${renderedSceneId.slice(0, 8)}`);
    session.applyMasks();
    requestAnimationFrame(() => stage?.scene?.fit());
  });

  // ---------------------------------------------------------------------------
  // Stage callbacks
  // ---------------------------------------------------------------------------

  // Marker drags: instant local override + throttled doc writes; the gesture's
  // final position is committed and the override dropped shortly after the last
  // move event.
  const writeMarkerPosition = throttle((sceneId: string, markerId: string, position: { x: number; y: number }) => {
    session.client?.write.setMarkerFields(sceneId, markerId, { positionX: position.x, positionY: position.y });
  }, 50);
  const dragClearTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function onMarkerMoved(marker: Marker, position: { x: number; y: number }) {
    const sceneId = session.activeSceneId;
    if (!sceneId) return;
    dragPositions[marker.id] = position;
    writeMarkerPosition(sceneId, marker.id, position);

    clearTimeout(dragClearTimers.get(marker.id));
    dragClearTimers.set(
      marker.id,
      setTimeout(() => {
        session.client?.write.setMarkerFields(sceneId, marker.id, { positionX: position.x, positionY: position.y });
        delete dragPositions[marker.id];
        dragClearTimers.delete(marker.id);
      }, 300)
    );
  }

  function onSceneUpdate(_offset: { x: number; y: number }, zoom: number) {
    if (zoom > 0 && sceneZoom !== zoom) {
      sceneZoom = zoom;
      // Mutate in place; a full renderedProps rebuild here would loop with autofit
      renderedProps.scene.zoom = zoom;
    }
  }

  function onMeasurementStart(startPoint: { x: number; y: number }, type: number) {
    session.presence?.updateMeasurement(
      startPoint,
      startPoint,
      type,
      extractMeasurementProps(renderedProps.measurement)
    );
  }

  function onMeasurementUpdate(startPoint: { x: number; y: number }, endPoint: { x: number; y: number }, type: number) {
    session.presence?.updateMeasurement(startPoint, endPoint, type, extractMeasurementProps(renderedProps.measurement));
  }

  function onMeasurementEnd() {
    session.presence?.updateMeasurement(null, null, 0);
    tools.activeLayer = MapLayerType.None;
  }

  function onMarkerContextMenu(marker: Marker, event: MouseEvent | TouchEvent) {
    if (event instanceof MouseEvent) {
      alert('You clicked on marker: ' + marker.title + ' at ' + event.pageX + ',' + event.pageY);
    } else {
      alert('You clicked on marker: ' + marker.title + ' at ' + event.touches[0].pageX + ',' + event.touches[0].pageY);
    }
  }

  function onStageLoading() {
    stageIsLoading = true;
  }

  async function onStageInitialized() {
    stageIsLoading = false;
    await session.applyMasks();
    stage?.scene?.fit();

    if (typeof window !== 'undefined' && 'ontouchstart' in window) {
      isTouchDevice = true;
      showTouchHint = true;
      setTimeout(() => (showTouchHint = false), 3000);
    }
  }

  // ---------------------------------------------------------------------------
  // Radial menu + touch affordances
  // ---------------------------------------------------------------------------

  let menuVisible = $state(false);
  let menuPosition = $state({ x: 0, y: 0 });
  let showTouchHint = $state(false);
  let isTouchDevice = $state(false);

  onMount(() => {
    const gestureDetector = stageElement
      ? createUnifiedGestureDetector((position) => {
          menuVisible = true;
          menuPosition = position;
        }, stageElement)
      : null;

    // Drop back to no tool after 5s of inactivity while a tool is active
    const activityTimer = stageElement
      ? createConditionalActivityTimer(
          5000,
          () => tools.clearActiveTool(),
          () => tools.activeLayer !== MapLayerType.None,
          ['mousedown', 'mousemove', 'touchstart', 'touchmove'],
          stageElement
        )
      : null;

    return () => {
      gestureDetector?.destroy();
      activityTimer?.destroy();
      for (const timer of dragClearTimers.values()) clearTimeout(timer);
      tools.destroy();
      session.destroy();
    };
  });
</script>

<Head title={party.name} description={`${party.name} on Table Slayer`} />

{#if !stageIsLoading && gameIsPaused}
  <PauseOverlay hasActiveScene={!!session.activeSceneId} pauseScreenUrl={party.pauseScreenThumb?.resizedUrl} />
{/if}

<div class={stageClasses} bind:this={stageElement} data-testid="playfieldStage">
  <Stage
    bind:this={stage}
    props={renderedProps}
    {hoveredMarkerId}
    {pinnedMarkerIds}
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
    callbacks={{
      onAnnotationUpdate: tools.onAnnotationUpdate,
      onFogUpdate: tools.onFogUpdate,
      onMapUpdate: () => {},
      onStageLoading,
      onStageInitialized,
      onSceneUpdate,
      onMarkerAdded: () => {},
      onMarkerMoved,
      onMarkerSelected: () => {},
      onMarkerContextMenu,
      onMarkerHover: () => {},
      onMeasurementStart,
      onMeasurementUpdate,
      onMeasurementEnd
    }}
    cursors={cursorArray}
    trackLocalCursor={false}
  />

  <PerformanceDebugger />
</div>

{#if isTouchDevice && showTouchHint && !gameIsPaused}
  <div class="touchHint" class:touchHint--hidden={!showTouchHint}>
    <span>Press and hold with two fingers to bring up menu</span>
  </div>
{/if}

<RadialMenu
  visible={menuVisible}
  position={menuPosition}
  items={tools.menuItems}
  backIcon={IconArrowBackUp}
  onItemSelect={(itemId) => tools.selectMenuItem(itemId)}
  onClose={() => (menuVisible = false)}
  onReposition={(pos) => {
    menuPosition = pos;
  }}
/>

<PersistButton
  visible={tools.showPersistButton}
  position={tools.persistButtonPosition}
  onPersist={() => tools.persistCurrentDrawing()}
  onDismiss={() => tools.dismissPersistButton()}
/>

<style>
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
