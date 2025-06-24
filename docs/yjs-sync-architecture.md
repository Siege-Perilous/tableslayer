# Y.js Real-time Synchronization Architecture

This document explains how Table Slayer's real-time collaboration system works, including data loading, synchronization, throttling, batching, and save mechanisms.

## Table of Contents

1. [Overview](#overview)
2. [Data Loading Flow](#data-loading-flow)
3. [Y.js Update Flow](#yjs-update-flow)
4. [Throttling and Batching System](#throttling-and-batching-system)
5. [Local-Only Properties](#local-only-properties)
6. [Stale Data Detection](#stale-data-detection)
7. [Save System](#save-system)
8. [Adding New Properties to StageProps](#adding-new-properties-to-stageprops)

## Overview

Table Slayer uses Y.js for real-time collaboration, allowing multiple users to edit scenes simultaneously. The system is built on several key components:

- **Y.js Documents**: Shared data structures that automatically sync between clients
- **Property Update Broadcaster**: Throttles and batches updates before sending to Y.js
- **Auto-save System**: Periodically saves Y.js state to the database
- **Drift Detection**: Ensures Y.js data doesn't diverge from the database

## Data Loading Flow

### 1. Initial Server-Side Load

When a user navigates to a scene, data is loaded server-side:

```typescript
// +page.server.ts
export const load: PageServerLoad = async (event) => {
  const scenes = await getScenesByGameSessionId(gameSessionId);
  const markers = await getSceneMarkers(selectedScene.id);
  // Returns SSR data to the page
  return { scenes, markers, selectedScene };
};
```

### 2. Client-Side Initialization

On mount, the client initializes Y.js with SSR data:

```typescript
// +page.svelte
onMount(() => {
  // Initialize Y.js party data manager
  const partyData = initializePartyDataManager(partySlug, user.id, gameSession.id);

  // Initialize scene data with SSR content
  const stageProps = buildSceneProps(selectedScene, markers, 'editor');
  partyData.initializeSceneData(selectedScene.id, stageProps, markers);

  // Subscribe to Y.js updates
  unsubscribe = partyData.subscribe(() => {
    const sceneData = partyData.getSceneData(selectedScene.id);
    if (sceneData) {
      // Apply Y.js updates to local state
      applyYjsUpdates(sceneData);
    }
  });
});
```

### 3. Building StageProps

The `buildSceneProps` function transforms database data into the UI structure:

```typescript
// buildSceneProps.ts
export function buildSceneProps(scene: Scene, markers: Marker[], view: 'editor' | 'player'): StageProps {
  return {
    map: {
      url: generateR2Url(scene.mapLocation),
      offset: { x: 0, y: 0 },
      zoom: 1,
      rotation: 0
    },
    marker: {
      visible: true,
      markers: markers.map((m) => ({
        ...m,
        // Transform database marker to UI marker
        visibility: view === 'player' && m.visibility === MarkerVisibility.DM ? MarkerVisibility.Player : m.visibility
      }))
    }
    // ... other properties
  };
}
```

### 4. Scene Change Handling

When users switch between scenes, the system preserves Y.js synchronization while updating the view:

**Editor View**: When changing scenes, marker protections are cleared and new stage props are built from the selected scene data. Viewport state (zoom, offset, rotation) can be preserved across scene changes.

**Player View**: Players automatically follow the DM's active scene. When Y.js broadcasts a scene change, the player view detects the mismatch between their current scene and the active scene, then calls `invalidateAll()` to reload with the new scene data. This ensures players always see what the DM intends, even across different game sessions.

**Game Session Switching**: When the active scene belongs to a different game session, the Y.js connection is destroyed and reinitialized with the new session ID. This allows seamless transitions between campaigns while maintaining real-time synchronization.

### 5. Y.js Connection Management

The PartyDataManager handles two separate Y.js documents:

1. **Game Session Document**: Contains scene data, markers, and cursors for a specific game session
2. **Party Document**: Contains party-wide state like active scene ID and pause status

This separation allows the active scene to be tracked across game sessions while keeping scene data isolated.

## Y.js Update Flow

### 1. User Makes a Change

When a user modifies a control (e.g., adjusts map opacity slider):

```svelte
<!-- In a component template -->
<InputSlider
  value={stageProps.map.opacity}
  min={0}
  max={1}
  step={0.1}
  oninput={(value) => handleMapOpacityChange(value)}
/>
```

### 2. Component Handles the Change

The component updates the value and queues it for sync:

```typescript
// +page.svelte or component
function handleMapOpacityChange(value: number) {
  // Update happens through queuePropertyUpdate
  queuePropertyUpdate(
    stageProps, // The stage props object
    ['map', 'opacity'], // Path to the property
    value, // New value
    'control' // Update type for throttling
  );
}
```

### 3. Property Update is Queued and Processed

The `queuePropertyUpdate` function handles the update:

```typescript
// propertyUpdateBroadcaster.ts
export function queuePropertyUpdate(
  stageProps: StageProps,
  propertyPath: PropertyPath,
  value: any,
  updateType: 'marker' | 'control' | 'scene' = 'control'
) {
  // Step 1: Apply update locally for immediate UI feedback
  applyUpdate(stageProps, propertyPath, value);
  // This updates stageProps.map.opacity = value immediately

  // Step 2: Check if immediate sync is enabled
  if (immediateYjsSyncEnabled && partyDataManager && currentSceneId) {
    // Sync to Y.js immediately (bypasses batching)
    partyDataManager.updateSceneStageProps(currentSceneId, stageProps);
  }

  // Step 3: Queue for batched update (for database save)
  const pathKey = propertyPath.join('.'); // "map.opacity"
  pendingUpdates[pathKey] = { path: propertyPath, value };

  // Step 4: Schedule batch update if not already scheduled
  if (!updateScheduled) {
    updateScheduled = true;
    const delay = UI_CONTROL_DELAY; // 100ms for 'control' type

    setTimeout(() => {
      // After delay, broadcast all pending updates
      broadcastPropertyUpdatesViaYjs(pendingUpdates, currentSceneId);
      pendingUpdates = {};
      updateScheduled = false;
    }, delay);
  }

  // Step 5: Trigger auto-save callback
  if (onUserChangeCallback) {
    onUserChangeCallback(); // Starts the 5-second save timer
  }
}
```

### 4. Updates Sync via Y.js

Other connected clients receive the update:

```typescript
// In receiving client's subscription
partyData.subscribe(() => {
  const sceneData = partyData.getSceneData(selectedScene.id);
  if (sceneData && sceneData.stageProps) {
    // Y.js update received - apply to local state
    const yjsStageProps = sceneData.stageProps;

    // Update local opacity value
    stageProps.map.opacity = yjsStageProps.map.opacity;

    // Svelte reactivity handles UI update
  }
});
```

## Throttling and Batching System

The property update broadcaster implements intelligent throttling:

```typescript
// propertyUpdateBroadcaster.ts
const MARKER_UPDATE_DELAY = 50; // Fast sync for markers
const UI_CONTROL_DELAY = 100; // Medium for UI controls
const SCENE_UPDATE_DELAY = 200; // Slower for scene properties

export function queuePropertyUpdate(
  stageProps: StageProps,
  propertyPath: PropertyPath,
  value: any,
  updateType: 'marker' | 'control' | 'scene' = 'control'
) {
  // Apply update locally immediately
  applyUpdate(stageProps, propertyPath, value);

  // Store in pending updates
  pendingUpdates[propertyPath.join('.')] = { path: propertyPath, value };

  // Schedule batch update
  if (!updateScheduled) {
    updateScheduled = true;
    const delay =
      updateType === 'marker' ? MARKER_UPDATE_DELAY : updateType === 'scene' ? SCENE_UPDATE_DELAY : UI_CONTROL_DELAY;

    setTimeout(() => {
      broadcastPropertyUpdatesViaYjs(pendingUpdates, currentSceneId);
      pendingUpdates = {};
      updateScheduled = false;
    }, delay);
  }
}
```

### Immediate Sync Mode

For critical updates, immediate sync can be enabled:

```typescript
enableImmediateYjsSync(); // Bypass batching
// Updates now sync immediately to Y.js
disableImmediateYjsSync(); // Return to batched mode
```

## Marker Protection Mechanism

To prevent marker position conflicts during real-time collaboration, the system uses protection sets:

### Protection Sets

```typescript
// Track markers being actively edited
let markersBeingMoved = new Set<string>(); // Markers currently being dragged
let markersBeingEdited = new Set<string>(); // Markers being added/edited
```

### How Protection Works

1. **During Marker Operations**:

   ```typescript
   // When a marker is being moved
   markersBeingMoved.add(marker.id);

   // When a marker is being edited
   markersBeingEdited.add(marker.id);
   ```

2. **Protection Merge Logic**:

   ```typescript
   // mergeMarkersWithProtection function
   if (beingMoved.has(localMarker.id)) {
     // Only preserve position from local state
     resultMap.set(localMarker.id, {
       ...incomingMarker,
       position: localMarker.position
     });
   }
   ```

3. **Automatic Cleanup**:
   - **On save completion**: Markers removed from protection
   - **On window blur**: All protections cleared to prevent deadlocks
   - **Safety timeout**: 10 seconds for moving, 5 seconds for editing
   - **Periodic cleanup**: Every 15 seconds removes stale protections

### Focus Change Handling

```typescript
onblur={() => {
  // Clear all marker protections when losing focus
  markersBeingMoved.clear();
  markersBeingEdited.clear();

  // Clear save timer
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
});
```

This prevents the common issue where switching browser tabs mid-edit would leave markers permanently protected, blocking Y.js synchronization.

## Local-Only Properties

Some properties don't sync between users:

```typescript
// propertyUpdateBroadcaster.ts
const LOCAL_ONLY_PROPERTIES = new Set([
  'scene.offset.x',      // Each user has their own viewport
  'scene.offset.y',
  'scene.rotation',      // Individual rotation preference
  'activeLayer'          // Tool selection is per-user
]);

function queuePropertyUpdate(...) {
  if (isLocalOnlyProperty(propertyPath)) {
    applyUpdate(stageProps, propertyPath, value);
    return; // Skip Y.js sync
  }
  // ... continue with sync
}
```

## Stale Data Detection

The system detects when Y.js data is out of sync with the database:

```typescript
// PartyDataManager.ts
checkSceneDrift(sceneId: string, dbTimestamp: number): boolean {
  const sceneData = this.yScenes.get(sceneId);
  if (!sceneData) return false;

  const yjsTimestamp = sceneData.lastUpdated;
  return dbTimestamp > yjsTimestamp;
}

// Periodic drift detection
async detectDrift(fetchSceneTimestamps: () => Promise<Record<string, number>>) {
  const dbTimestamps = await fetchSceneTimestamps();
  const driftedScenes = [];

  for (const [sceneId, dbTimestamp] of Object.entries(dbTimestamps)) {
    if (this.checkSceneDrift(sceneId, dbTimestamp)) {
      driftedScenes.push(sceneId);
    }
  }

  return driftedScenes;
}
```

## Save System

The auto-save system prevents data loss:

### 1. Save Trigger

User changes trigger the auto-save timer:

```typescript
// +page.svelte
const startAutoSaveTimer = () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);

  autoSaveTimer = setTimeout(() => {
    if (!isSaving && hasUnsavedChanges) {
      performSave();
    }
  }, 5000); // 5 second delay
};
```

### 2. Save Coordination

Only one user saves at a time to prevent conflicts:

```typescript
const performSave = async () => {
  // Try to become the active saver
  const canSave = partyData.becomeActiveSaver(selectedScene.id);
  if (!canSave) return;

  try {
    isSaving = true;

    // Get current Y.js state
    const sceneData = partyData.getSceneData(selectedScene.id);
    const stagePropsToSave = sceneData.stageProps;

    // Convert to database format
    const sceneUpdate = convertStagePropsToSceneData(stagePropsToSave, selectedScene);
    const markersToSave = convertStagePropsToMarkerData(stagePropsToSave);

    // Save to database
    await updateScene({ sceneId: selectedScene.id, sceneData: sceneUpdate });
    await upsertMarkers({ markers: markersToSave, sceneId: selectedScene.id });

    // Update Y.js with save timestamp
    partyData.updateSceneLastUpdated(selectedScene.id, Date.now());
  } finally {
    partyData.releaseActiveSaver(selectedScene.id, true);
    isSaving = false;
  }
};
```

### 3. Conversion Functions

Converting between UI and database formats:

```typescript
// convertStagePropsToSceneData.ts
export function convertStagePropsToSceneData(stageProps: StageProps, scene: Scene) {
  return {
    mapLocation: extractLocationFromUrl(stageProps.map.url),
    mapRotation: stageProps.map.rotation,
    mapZoom: stageProps.map.zoom,
    mapOffsetX: stageProps.map.offset.x,
    mapOffsetY: stageProps.map.offset.y
    // ... other properties
  };
}

// convertStagePropsToMarkerData.ts
export function convertStagePropsToMarkerData(stageProps: StageProps): DbMarker[] {
  return stageProps.marker.markers.map((marker) => ({
    id: marker.id,
    title: marker.title,
    positionX: marker.position.x,
    positionY: marker.position.y,
    note: marker.note ? JSON.stringify(marker.note) : null
    // ... other properties
  }));
}
```

## Adding New Properties to StageProps

Let's walk through adding a new "grid overlay" feature with opacity and color settings:

### 1. Update Type Definitions

```typescript
// types.ts (in UI package)
export interface StageProps {
  // ... existing properties
  gridOverlay: {
    visible: boolean;
    opacity: number;
    color: string;
    size: number;
  };
}
```

### 2. Update Database Schema

```typescript
// schema.ts
export const sceneTable = sqliteTable('scene', {
  // ... existing columns
  gridOverlayVisible: integer('grid_overlay_visible', { mode: 'boolean' }).notNull().default(false),
  gridOverlayOpacity: real('grid_overlay_opacity').notNull().default(0.5),
  gridOverlayColor: text('grid_overlay_color').notNull().default('#000000'),
  gridOverlaySize: integer('grid_overlay_size').notNull().default(50)
});
```

### 3. Update buildSceneProps

```typescript
// buildSceneProps.ts
export function buildSceneProps(scene: Scene, markers: Marker[], view: string): StageProps {
  return {
    // ... existing properties
    gridOverlay: {
      visible: scene.gridOverlayVisible ?? false,
      opacity: scene.gridOverlayOpacity ?? 0.5,
      color: scene.gridOverlayColor ?? '#000000',
      size: scene.gridOverlaySize ?? 50
    }
  };
}
```

### 4. Update Conversion Functions

```typescript
// convertStagePropsToSceneData.ts
export function convertStagePropsToSceneData(stageProps: StageProps, scene: Scene) {
  return {
    // ... existing properties
    gridOverlayVisible: stageProps.gridOverlay.visible,
    gridOverlayOpacity: stageProps.gridOverlay.opacity,
    gridOverlayColor: stageProps.gridOverlay.color,
    gridOverlaySize: stageProps.gridOverlay.size
  };
}
```

### 5. Create UI Controls

```svelte
<!-- GridOverlayControls.svelte -->
<script>
  import { InputSlider, ColorPicker, RadioButton, FormControl } from '@tableslayer/ui';
  import { queuePropertyUpdate } from '$lib/utils';

  export let stageProps;

  function updateGridOpacity(value) {
    queuePropertyUpdate(stageProps, ['gridOverlay', 'opacity'], value, 'control');
  }

  function updateGridColor(colorData) {
    queuePropertyUpdate(stageProps, ['gridOverlay', 'color'], colorData.hex, 'control');
  }

  function toggleGrid(value) {
    queuePropertyUpdate(stageProps, ['gridOverlay', 'visible'], value === 'true', 'control');
  }
</script>

<FormControl label="Show Grid" name="gridVisible">
  {#snippet input({ inputProps })}
    <RadioButton
      {...inputProps}
      selected={stageProps.gridOverlay.visible.toString()}
      options={[
        { label: 'on', value: 'true' },
        { label: 'off', value: 'false' }
      ]}
      onSelectedChange={toggleGrid}
    />
  {/snippet}
</FormControl>

{#if stageProps.gridOverlay.visible}
  <FormControl label="Grid Opacity" name="gridOpacity">
    {#snippet input({ inputProps })}
      <InputSlider
        {...inputProps}
        value={stageProps.gridOverlay.opacity}
        min={0}
        max={1}
        step={0.1}
        oninput={updateGridOpacity}
      />
    {/snippet}
  </FormControl>

  <FormControl label="Grid Color" name="gridColor">
    {#snippet input({ inputProps })}
      <ColorPicker {...inputProps} hex={stageProps.gridOverlay.color} onUpdate={updateGridColor} />
    {/snippet}
  </FormControl>
{/if}
```

### 6. Make Properties Local-Only (Optional)

If you want grid visibility to be per-user (not synced):

```typescript
// propertyUpdateBroadcaster.ts
const LOCAL_ONLY_PROPERTIES = new Set([
  // ... existing properties
  'gridOverlay.visible' // Each user can toggle their own grid
]);
```

### 7. Handle the Property in Your Stage Component

```typescript
// Stage component effect
$effect(() => {
  if (stageProps.gridOverlay.visible) {
    // Draw grid with current settings
    drawGrid(stageProps.gridOverlay.color, stageProps.gridOverlay.opacity, stageProps.gridOverlay.size);
  }
});
```

## Player View Considerations

The player view (`/party/play`) has specific requirements and limitations:

### 1. Read-Only Mode

Players cannot modify scene data:

```typescript
// +page@.svelte (player view)
onMount(() => {
  // Initialize Y.js but don't enable property updates
  const partyData = initializePartyDataManager(partySlug, user.id);

  // Subscribe to updates only
  partyData.subscribe(() => {
    const partyState = partyData.getPartyState();
    const activeSceneId = partyState.activeSceneId;

    if (activeSceneId) {
      const sceneData = partyData.getSceneData(activeSceneId);
      if (sceneData) {
        // Apply updates from DM
        stageProps = sceneData.stageProps;
      }
    }
  });
});
```

### 2. Filtered Marker Visibility

Players see different marker states:

```typescript
// buildSceneProps.ts
export function buildSceneProps(scene: Scene, markers: Marker[], view: 'editor' | 'player'): StageProps {
  return {
    marker: {
      markers: markers.map((m) => ({
        ...m,
        // DM-only markers show without details to players
        visibility: view === 'player' && m.visibility === MarkerVisibility.DM ? MarkerVisibility.Player : m.visibility,
        // Hide DM notes from players
        note: view === 'player' && m.visibility === MarkerVisibility.DM ? null : m.note
      }))
    }
  };
}
```

### 3. Active Scene Tracking

Players automatically follow the DM's active scene:

```typescript
// Player view effect
$effect(() => {
  if (yjsPartyState?.activeSceneId && yjsPartyState.activeSceneId !== currentSceneId) {
    // Auto-navigate to DM's active scene
    goto(`/${party.slug}/play#${yjsPartyState.activeSceneId}`);
  }
});
```

### 4. Pause Screen

When DM pauses, players see pause screen:

```typescript
// Player view template
{#if yjsPartyState?.isPaused}
  <PauseScreen imageUrl={party.pauseScreenUrl} />
{:else}
  <Stage {stageProps} interactive={false} />
{/if}
```

### 5. Limited Controls

Player controls are restricted:

```typescript
// Player stage props
const playerStageProps = {
  ...stageProps,
  // Players can't use drawing tools
  activeLayer: MapLayerType.None,
  // Players can't edit markers
  marker: {
    ...stageProps.marker,
    editable: false
  },
  // Players can pan but not save positions
  controls: {
    enablePan: true,
    enableZoom: true,
    enableRotate: false,
    enableMarkerEdit: false,
    enableFogEdit: false
  }
};
```

### 6. No Save Operations

Players never trigger saves:

```typescript
// Player view - no save callbacks
setUserChangeCallback(null); // Disable auto-save
disableImmediateYjsSync(); // No immediate updates needed
```

### 7. Performance Optimizations

Player view can skip certain subscriptions:

```typescript
// Only subscribe to essential data
const unsubscribe = partyData.subscribe(() => {
  // Only listen for:
  // - Active scene changes
  // - Pause state
  // - Current scene data
  // Skip:
  // - Scene list changes
  // - Other scenes' data
  // - Save coordination
});
```

## Additional Context for Development

### Common Pitfalls and Solutions

1. **Marker Position During Drag**
   - Problem: Marker jumps when dragged due to Y.js updates from other clients
   - Solution: Use `markersBeingMoved` Set to protect markers during drag operations
   - Code location: `+page.svelte` lines 56-100 (mergeMarkersWithProtection function)

2. **Editor Content Not Updating**
   - Problem: TipTap doesn't react to external content changes
   - Solution: Use $effect to watch content prop and update editor
   - Code location: `Editor.svelte` lines 110-121

3. **Save Conflicts**
   - Problem: Multiple users trying to save simultaneously
   - Solution: Use `becomeActiveSaver` coordination
   - Code location: See performSave function in `+page.svelte`

4. **Sync Failure on Focus Change**
   - Problem: Y.js sync stops working when switching browser tabs before a save completes
   - Root Cause: Markers remain in protection sets (`markersBeingMoved`, `markersBeingEdited`) indefinitely
   - Solution: Clear protection sets on window blur and implement timeout-based cleanup
   - Code locations:
     - Window blur handler clears all protections
     - 10-second safety timeout for moving markers
     - 15-second periodic cleanup timer
     - See `onblur` handler and protection cleanup logic in `+page.svelte`

### Key Files and Their Roles

```
/apps/web/src/lib/utils/yjs/
├── partyDataManager.ts      # Core Y.js document management
├── stores.ts                # Svelte stores for Y.js integration
└── propertyUpdateBroadcaster.ts # Throttling and batching logic

/apps/web/src/routes/(app)/[party]/[gameSession]/[[selectedScene]]/
├── +page.svelte            # Main editor view with Y.js integration
├── +page.server.ts         # SSR data loading
└── +layout.svelte          # Party connection initialization

/packages/ui/src/lib/components/
├── Stage/                  # Canvas rendering components
├── Editor/Editor.svelte    # TipTap rich text editor
└── types/                  # Shared TypeScript interfaces
```

### State Management Patterns

1. **Immediate Local Updates**: Always update local state first, then sync
2. **Protected State**: During operations (drag, edit), protect local state from Y.js updates
3. **Optimistic Updates**: Apply changes locally before confirmation
4. **Drift Recovery**: Periodic checks ensure Y.js doesn't diverge from database

### Testing Considerations

- Open multiple browser tabs to test real-time sync
- Test with network throttling to ensure graceful degradation
- Verify save indicator shows correct state
- Test marker drag across multiple clients
- Ensure player view filters correctly

### Key Configuration Constants

The timing constants that control synchronization behavior are defined in:

- **Throttle delays** - `/apps/web/src/lib/utils/propertyUpdateBroadcaster.ts`
  - `MARKER_UPDATE_DELAY` - Fast sync for marker operations
  - `UI_CONTROL_DELAY` - Standard UI control updates
  - `SCENE_UPDATE_DELAY` - Less frequent scene property updates

- **Auto-save delay** - `/apps/web/src/routes/(app)/[party]/[gameSession]/[[selectedScene]]/+page.svelte`
  - Currently set to 3000ms (3 seconds) in the `startAutoSaveTimer` function

- **Protection timeouts** - `/apps/web/src/routes/(app)/[party]/[gameSession]/[[selectedScene]]/+page.svelte`
  - Marker move protection timeout: 10 seconds
  - Marker edit protection timeout: 5 seconds
  - Periodic cleanup interval: 15 seconds

## Best Practices

1. **Always update locally first** for immediate UI feedback
2. **Use appropriate throttle delays** based on update frequency
3. **Mark properties as local-only** when they shouldn't sync
4. **Test with multiple browsers** to ensure sync works correctly
5. **Monitor for drift** between Y.js and database state
6. **Handle save conflicts** gracefully with the coordinator system
7. **Test player view separately** to ensure proper filtering
8. **Validate permissions** before allowing updates
9. **Protect state during operations** (drag, edit) from external updates
10. **Use dev logging** to debug sync issues (check for dev mode console logs)
11. **Clear protections on focus loss** to prevent sync deadlocks
12. **Implement timeout-based cleanup** for protection sets to handle edge cases

## Debugging

Enable debug logging:

```typescript
// In browser console
localStorage.setItem('debug', 'y-*');
```

Monitor Y.js updates:

```typescript
partyData.subscribe(() => {
  console.log('Y.js update received', {
    sceneData: partyData.getSceneData(sceneId),
    timestamp: Date.now()
  });
});
```
