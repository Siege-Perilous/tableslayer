# WebSocket & Data Layer Rewrite Plan

**Status:** Phase 2 Complete - Scene List Synchronization  
**Last Updated:** 2025-06-17

## Overall Architecture Summary

- **Y.js for real-time collaboration** with automatic conflict resolution
- **Replace socket.io directly** with Y.js WebSocket provider
- **Centralized update function** pattern replacing `bind:stageProps`
- **60 FPS global throttling** with shorter throttle for sliders
- **Scene isolation** through Y.js document structure
- **Active editor save coordination** using focus detection
- **UUID-based marker IDs** (no temp ID complexity)

---

## Phase 1: Y.js Foundation (Commit 1) - ✅ COMPLETED

**Goal**: Integrate Y.js with existing Socket.IO infrastructure and prove it works

### Implementation Status

1. **✅ Install Y.js dependencies**

   ```bash
   pnpm add yjs y-socket.io y-protocols lib0
   ```

2. **✅ Socket.IO + Y.js server integration**

   - Integrated Y.js into existing Socket.IO server using `y-socket.io/dist/server`
   - Added `YSocketIO` initialization to existing `initializeSocketIO` function
   - Works alongside existing Socket.IO party namespaces
   - **Avoided WebSocket conflicts**: No `vite-sveltekit-node-ws` issues

3. **✅ Client-side Y.js manager**

   ```javascript
   // Final structure implemented
   PartyDataManager {
     - SocketIOProvider from y-socket.io (not WebSocket)
     - Y.js document with shared data structures (yScenes, yParty, yCursors)
     - Connection status tracking through Socket.IO
     - Real-time document synchronization via Y.js CRDT
   }
   ```

4. **✅ Test integration in playfield**

   - Connection status indicator (green/red badge) working
   - Parallel operation with existing socket.io maintained
   - Y.js document synchronization active
   - Console logging confirms successful connection

5. **📝 Lessons learned**
   - **Socket.IO approach much more stable** than direct WebSocket
   - `y-websocket/bin/utils` import issues avoided entirely
   - `vite-sveltekit-node-ws` conflicts completely resolved
   - `y-socket.io` provides seamless integration with existing infrastructure

### Testing Checklist

- [x] Y.js connects via Socket.IO (connection indicator green)
- [x] Server logs show Socket.IO + Y.js initialization
- [x] Y.js document synchronization working
- [x] No server-side errors in console
- [x] Ready to implement Phase 2 features

### Key Architecture Decision

**Chose Socket.IO + Y.js over direct Y.js WebSocket** due to:

- Compatibility with existing infrastructure
- No WebSocket server conflicts
- Proven stability with SvelteKit development
- Easier to debug and maintain

### Success Criteria ✅

- Green Y.js connection indicator in playfield
- Server console shows "Socket.IO server with Y.js initialized"
- Y.js document foundation ready for real-time features
- **READY FOR COMMIT 1** - Foundation proven and stable

---

## Phase 2: Scene List Synchronization (Commit 2) - ✅ COMPLETED

**Goal**: Replace invalidateAll() with Y.js scene list updates

### Implementation Status

1. **✅ Scene list Y.js integration**

   - Enhanced PartyDataManager with scene operations (addScene, updateScene, removeScene, reorderScenes)
   - YArray for scenes list with atomic transactions
   - Real-time sync of scene metadata including thumbnails
   - Game session isolation (room: `gameSession-${gameSessionId}`)

2. **✅ Remove invalidateAll() dependencies**

   - Replaced all invalidateAll() calls in SceneSelector with Y.js operations
   - Scene creation, duplication, deletion, renaming, reordering all use Y.js
   - Map image changes sync through Y.js with fresh thumbnails
   - SSR initial load preserved, Y.js becomes source of truth

3. **✅ Scene metadata sync events implemented**

   - Scene renaming → `partyData.updateScene()` with Y.js sync
   - Scene reordering → `partyData.reorderScenes()` with complete list replacement
   - Thumbnail changes → Y.js update with cache-busting
   - Scene add/delete → Proper order management and Y.js sync
   - Scene duplication → Insertion with proper order shifting

4. **✅ Advanced fixes implemented**

   - Fixed duplicate key errors from Y.js accumulation
   - Smart initialization to prevent cross-tab data conflicts
   - Proper scene deletion with sequential reordering (1,2,3,4 instead of 1,2,4,5)
   - Scene duplication with correct insertion order (not appending to end)
   - Map image changes with real-time thumbnail updates

5. **✅ Game session isolation**
   - Changed Y.js rooms from `party-${partyId}` to `gameSession-${gameSessionId}`
   - Editor and playfield use separate Y.js documents per game session
   - No cross-contamination between different game sessions

### Testing Checklist

- [x] Scene list updates without page flash
- [x] Real-time scene renaming across editors
- [x] Scene reordering reflects immediately with proper sequential numbering
- [x] Thumbnail updates propagate with cache-busting
- [x] No invalidateAll() calls needed
- [x] Scene creation appears immediately with correct data
- [x] Scene duplication inserts at correct position (not appends)
- [x] Scene deletion maintains sequential order numbers
- [x] Map image changes sync immediately with new thumbnails
- [x] Game session isolation (different sessions don't interfere)

### Success Criteria ✅

- No more scene list flashing
- Smooth scene metadata updates across all editors within same game session
- SSR initial load still functional
- Real-time collaboration working perfectly
- Proper scene ordering maintained for all operations

---

## Phase 3: Party State Synchronization (Commit 3) - ✅ COMPLETED

**Goal**: Sync pause state and active scenes through Y.js + Remove active game session concept

### Implementation Status

1. **✅ Party state Y.js integration**

   - Added `party` YMap with isPaused, activeSceneId (removed activeGameSessionId)
   - Sync pause state changes across all clients
   - Migrated from game session-level to party-level active scenes

2. **✅ UI reactivity updates**

   - Editor pause state UI (buttons, overlays) working
   - Playfield pause screen display functioning
   - Removed "Set as active session" UI (no longer needed)

3. **✅ Active scene coordination**

   - Track `activeSceneId` in Y.js party state
   - Playfield switches scenes automatically when active scene changes
   - Cross-game-session active scene display fixed
   - Editors show correct active state regardless of which session contains the active scene

4. **✅ Major architectural improvement: Removed Active Game Session concept**

   - **Before**: "Set game session X as active, then broadcast its active scene"
   - **After**: "The session containing the active scene automatically broadcasts"
   - Broadcasting logic simplified: only broadcast when editing the active scene
   - Removed confusing "active session" UI and management
   - Server function `getActiveGameSessionForParty()` now finds session containing active scene

5. **✅ Scene deletion safety**
   - Server-side `deleteScene()` clears party's `activeSceneId` when deleting active scene
   - Y.js `removeScene()` and `reorderScenes()` handle clearing active scene state
   - Playfield gracefully handles null/undefined active scenes

### Testing Checklist

- [x] Pause state syncs immediately across all editors and playfield
- [x] Active scene changes propagate instantly via Y.js
- [x] Playfield pause screen works correctly
- [x] Editor UI responds to pause changes
- [x] Cross-game-session active scene display works correctly
- [x] Scene deletion properly clears active scene when needed
- [x] Broadcasting automatically happens from session containing active scene
- [x] No more confusing "active session" concept

### Success Criteria ✅

- Global pause state synchronization working
- Party-level active scene management implemented
- Simplified architecture: automatic broadcasting based on active scene location
- Cross-game-session active scene display fixed
- Safe scene deletion with active scene cleanup

---

## Phase 4: StageProps Synchronization (Commit 4) - 🔄 IN PROGRESS

**Goal**: Replace manual StageProps sync with Y.js + implement selective sync

### Implementation Status

1. **✅ Step 1: Component Migration to Centralized Updates**

   - Converted SceneZoom component to use `queuePropertyUpdate`
   - Converted MapControls component from bind patterns to centralized updates
   - Converted EdgeControls component to use `queuePropertyUpdate`
   - Converted SceneControls fog tool handling
   - Converted MarkerManager marker operations
   - Removed all `bind:stageProps` usage throughout component tree

2. **✅ Step 2: Y.js Integration with Selective Sync**

   - Modernized `propertyUpdateBroadcaster.ts` to use Y.js instead of Socket.IO
   - Added `updateSceneStageProps()` method to PartyDataManager
   - Implemented LOCAL_ONLY_PROPERTIES filtering (scene rotation, offset, zoom)
   - Added Y.js subscription in main editor for real-time StageProps sync
   - Fixed fog of war URL updates to use centralized system
   - Implemented scene isolation to prevent cross-scene data bleed
   - Added focus-based auto-saving (window/tab focus detection)

3. **✅ Step 3: Component Cleanup and Verification**

   - Converted all remaining bind:value patterns in WeatherControls, GridControls, EffectsControls
   - Fixed DualInputSlider in EdgeControls to use local state with reactive sync to queuePropertyUpdate
   - Verified all non-marker stageProps properties use centralized updates
   - MarkerManager updates deferred to Phase 5 (marker save coordination)
   - All component bind patterns converted except for legitimate local state and marker properties

4. **🔄 Step 4: Final Selective Sync Strategy (TODO)**

   - Review and optimize local vs shared property definitions
   - Performance testing at 60 FPS
   - Ensure playfield behavior is correct

### Testing Checklist

- [x] StageProps sync across editors (fog, grid, weather, etc.)
- [x] Scene isolation (no cross-scene pollution)
- [x] Scene rotation stays local (doesn't sync to other editors/playfield)
- [x] Fog of war changes sync to both editors and playfield
- [x] Grid changes sync to both editors and playfield
- [x] Focus-based auto-saving prevents conflicts
- [ ] Performance verification at 60 FPS
- [ ] All component input responsiveness maintained

### Current Status

**✅ Working:**

- Y.js real-time sync between editors
- Selective sync (scene rotation local, other props shared)
- Fog of war synchronization fixed
- Auto-save only from focused editor
- Scene data isolation between different scenes
- Hybrid system: Y.js for editor-to-editor + Socket.IO for playfield

**🔄 Next Steps:**

- Complete Step 4: Final selective sync optimization and testing
- Performance testing and optimization

### Success Criteria (Mostly Complete)

- ✅ Real-time StageProps synchronization between editors
- ✅ Local viewport state preserved per editor (scene rotation)
- ✅ Scene isolation prevents cross-scene contamination
- ✅ Focus-based saving prevents conflicts
- 🔄 Performance verification needed

---

## Phase 5: Save Coordination (Commit 5) - 📋 PLANNED

**Goal**: Implement unified save system with conflict prevention

### Implementation

1. **Unified `savePartyState` mutation**

   - Consolidate scene + marker + party saves
   - Handle marker create/update logic
   - Return comprehensive result with new IDs
   - Atomic transaction for all related data

2. **Active editor detection**

   - Window focus event tracking
   - Last-interaction-wins logic
   - `becomeActiveSaver()` / `releaseActiveSaver()`
   - Y.js coordination for save responsibility

3. **Save coordination in Y.js**

   ```javascript
   // Marker save state tracking
   marker: {
     id: "uuid-123",              // Permanent UUID from Stage
     dbSaved: boolean,            // Save status in Y.js
     savedBy: "user-id",          // Who saved it
     ...markerData
   }

   // Save conflict prevention
   scene: {
     saveInProgress: boolean,     // Prevent concurrent saves
     activeSaver: "user-id",      // Current saving user
     lastSavedAt: timestamp       // Last successful save
   }
   ```

4. **3-second idle save timer**

   - Only active editor starts save timers
   - Graceful handoff when focus changes
   - Clear pending timers on focus loss

5. **Marker ID resolution**

   - Stage component generates permanent UUIDs
   - Y.js tracks save state, not temp IDs
   - Much simpler than current temp ID system

6. **Map thumbnail generation and usage**
   - Fix scene save to generate `mapThumbLocation` properly
   - Update SceneSelector to use `mapThumbLocation` instead of full resolution images
   - Ensure map thumbnail sync works correctly in Y.js scene metadata

### Testing Checklist

- [ ] Only active editor performs saves
- [ ] No duplicate saves occur
- [ ] Marker creation works across editors
- [ ] Save conflicts handled gracefully
- [ ] 3-second idle timer functions correctly

### Success Criteria

- Single editor saves at a time
- Marker ID consistency across editors
- No save conflicts or duplicates
- Save behavior matches current system

---

## Phase 6: Legacy Cleanup (Commit 6) - 📋 PLANNED

**Goal**: Remove old websocket utilities and simplify components

### Implementation

1. **Remove legacy websocket code**

   - Old `broadcastStageUpdate` functions
   - Manual `socketUpdate()` calls
   - `propertyUpdateBroadcaster` utility
   - Complex throttling logic
   - Any remaining socket.io references

2. **Component simplification**

   - Remove `bind:stageProps` throughout
   - Clean up manual `$effect` usage
   - Simplify component props
   - Remove unused websocket utilities

3. **Type definition cleanup**

   - Update component prop types
   - Remove obsolete interfaces
   - Clean import statements

4. **Final optimization**
   - Remove dead code
   - Consolidate Y.js patterns
   - Performance verification

### Testing Checklist

- [ ] All functionality preserved
- [ ] Cleaner, more maintainable code
- [ ] No performance regressions
- [ ] All edge cases handled

### Success Criteria

- Significant code reduction
- Cleaner architecture
- Better developer experience
- All features working as before

---

## Implementation Strategy

### Phase 1 Approach

- **Complete socket.io replacement** in Phase 1
- **Prove Y.js WebSocket works** before proceeding
- **Git reset** if Y.js doesn't work reliably
- **No parallel systems** - cleaner implementation

### Rollback Strategy

- Each phase commits independently
- Git reset if Y.js proves problematic in Phase 1
- Thorough testing at each phase before proceeding
- Feature flags only within phases, not between systems

### Key Design Decisions Made

1. **Socket.IO + Y.js integration** (not direct replacement)
2. **y-socket.io provider** for seamless server communication
3. **UUID-based marker IDs** (no temp ID complexity)
4. **Centralized update functions** instead of bind patterns
5. **60 FPS global throttling** with slider exceptions
6. **Focus-based save coordination** for conflict prevention

---

## Progress Log

### 2025-06-17

- ✅ Completed architecture planning and requirements gathering
- ✅ Analyzed current codebase structure and patterns
- ✅ Defined 6-phase implementation approach
- ✅ Attempted Y.js WebSocket implementation but encountered conflicts
- ✅ Researched vite-sveltekit-node-ws compatibility issues
- ✅ **PIVOTED**: Chose Socket.IO + Y.js approach for stability
- ✅ Installed correct dependencies (yjs, y-socket.io, y-protocols, lib0)
- ✅ Integrated Y.js into existing Socket.IO server infrastructure
- ✅ Implemented PartyDataManager with SocketIOProvider
- ✅ Added Y.js connection status indicator to playfield
- ✅ **COMPLETED Phase 1**: Y.js foundation working through Socket.IO
- ✅ **READY FOR COMMIT 1**: Stable Y.js foundation established
- ✅ **STARTED Phase 2**: Scene list synchronization implementation
- ✅ Enhanced PartyDataManager with full scene CRUD operations
- ✅ Replaced all invalidateAll() calls with Y.js real-time sync
- ✅ Fixed duplicate key errors and Y.js data accumulation issues
- ✅ Implemented proper scene ordering for all operations (create, delete, duplicate, reorder)
- ✅ Added real-time map image updates with thumbnail sync
- ✅ Implemented game session isolation (gameSession-${id} rooms)
- ✅ **COMPLETED Phase 2**: Full scene list real-time collaboration working
- ✅ **READY FOR COMMIT 2**: Scene synchronization complete and stable
- ✅ **STARTED Phase 3**: Party state synchronization and architectural improvements
- ✅ Implemented Y.js party state tracking (isPaused, activeSceneId)
- ✅ Migrated from game session-level to party-level active scenes
- ✅ Fixed cross-game-session active scene display issues
- ✅ **MAJOR ARCHITECTURAL IMPROVEMENT**: Removed confusing "active game session" concept
- ✅ Simplified broadcasting: automatic based on which session contains active scene
- ✅ Implemented safe scene deletion with active scene cleanup
- ✅ Updated component interfaces from activeScene objects to activeSceneId strings
- ✅ **COMPLETED Phase 3**: Party state synchronization and architectural simplification
- ✅ **READY FOR COMMIT 3**: Major architectural improvements complete and stable
- ✅ **STARTED Phase 4**: StageProps synchronization and selective sync implementation
- ✅ **COMPLETED Phase 4 Step 1**: Component migration to centralized `queuePropertyUpdate` system
- ✅ Converted SceneZoom, MapControls, EdgeControls, SceneControls, MarkerManager to use centralized updates
- ✅ Removed all `bind:stageProps` usage throughout component tree
- ✅ **COMPLETED Phase 4 Step 2**: Y.js integration with selective synchronization
- ✅ Modernized propertyUpdateBroadcaster.ts to use Y.js instead of Socket.IO
- ✅ Implemented LOCAL_ONLY_PROPERTIES filtering (scene rotation, offset, zoom stay local)
- ✅ Added Y.js StageProps subscription for real-time editor-to-editor sync
- ✅ Fixed fog of war synchronization between editors and playfield
- ✅ Implemented scene isolation to prevent cross-scene data bleed
- ✅ Added focus-based auto-saving using window/tab visibility detection
- ✅ **Phase 4 Steps 1-2 COMPLETE**: Real-time StageProps sync working with selective local/shared properties
- 🔄 **Phase 4 Steps 3-4 TODO**: Final component cleanup and performance optimization
