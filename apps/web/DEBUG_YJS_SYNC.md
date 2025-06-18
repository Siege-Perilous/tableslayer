# Y.js Property Update Sync Debug Analysis

## Issue

Grid controls and fog controls are not syncing between editors via Y.js. This is a regression from Phase 5 work.

## Root Cause Analysis

### Call Flow

1. UI Controls (GridControls.svelte, FogControls.svelte) → `queuePropertyUpdate()`
2. `queuePropertyUpdate()` → applies locally, then queues for Y.js broadcast
3. After delay → `broadcastPropertyUpdatesViaYjs()`
4. `broadcastPropertyUpdatesViaYjs()` → calls `getPartyDataManager()`
5. If PartyDataManager exists → `updateSceneStageProps()` → Y.js sync

### Potential Issues Found

1. **Timing Issue**: The PartyDataManager is initialized in `onMount()`, but controls might be used before it's ready.

   - In `broadcastPropertyUpdatesViaYjs()` (line 98-102):

   ```typescript
   const partyDataManager = getPartyDataManager();
   if (!partyDataManager) {
     console.warn('PartyDataManager not available for property updates');
     return;
   }
   ```

2. **Scene Data Initialization**: The scene might not be initialized in Y.js when property updates are attempted.

   - In `broadcastPropertyUpdatesViaYjs()` (line 108-112):

   ```typescript
   const currentSceneData = partyDataManager.getSceneData(sceneId);
   if (!currentSceneData) {
     console.warn(`No scene data found for scene: ${sceneId}`);
     return;
   }
   ```

3. **Property Update Flow**: The update flow seems correct:
   - GridControls calls `queuePropertyUpdate()` for grid properties
   - FogControls calls `queuePropertyUpdate()` for fog properties
   - Both use the 'control' update type (250ms delay)

## Debug Logging Added

I've added comprehensive logging to help diagnose the issue:

1. **In propertyUpdateBroadcaster.ts:**

   - Early warning if PartyDataManager is not available when queueing updates
   - Detailed logging of property paths being updated
   - Warnings showing which updates will be lost

2. **In yjs/stores.ts:**

   - Logging when PartyDataManager is initialized

3. **In PartyDataManager.ts:**
   - Logging when scene data is initialized
   - Logging when scene data is retrieved
   - Logging when stageProps are updated
   - List of available scenes when scene is not found

## Debug Steps to Verify

1. Open browser console and look for these messages:

   - "Initializing PartyDataManager for party: ..."
   - "Initializing scene data for scene: ..."
   - "PartyDataManager not available when queueing property update: ..."
   - "No scene data found for scene: ..."
   - "Broadcasting X property updates via Y.js for scene: ..."

2. Try changing grid or fog settings and watch the console

3. Check the sequence of events:
   - Is PartyDataManager initialized before property updates?
   - Is scene data initialized before property updates?
   - Are the scene IDs matching?

## Potential Fixes

Based on the issue, here are potential solutions:

### Fix 1: Ensure PartyDataManager is Ready

```typescript
// In the page component, disable controls until ready
let isYjsReady = $state(false);

onMount(() => {
  // ... initialize PartyDataManager ...
  isYjsReady = true;
});

// Pass isYjsReady to controls to disable them until ready
```

### Fix 2: Initialize Scene Data Earlier

Move scene data initialization to happen immediately after PartyDataManager is created, not in an effect.

### Fix 3: Add Retry Logic

If PartyDataManager is not available, queue the updates and retry when it becomes available.

### Fix 4: Check Scene ID Consistency

Ensure the scene ID used in `registerSceneForPropertyUpdates()` matches the one used in `initializeSceneData()`.
