# WebSocket & Data Layer Rewrite Plan

**Status:** Phase 1 - Y.js Foundation  
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

## Phase 2: Scene List Synchronization (Commit 2) - 📋 PLANNED

**Goal**: Replace invalidateAll() with Y.js scene list updates

### Implementation

1. **Scene list Y.js integration**

   - Populate `scenesList` YArray from SSR data
   - Real-time sync of scene metadata changes
   - Update `SceneSelector.svelte` to subscribe to Y.js

2. **Remove invalidateAll() dependencies**

   - Replace scene list invalidation with Y.js updates
   - Sync scene name, order, thumbnail changes
   - Keep SSR for initial page load

3. **Scene metadata sync events**
   - Scene renaming → Y.js update
   - Scene reordering → Y.js update
   - Thumbnail changes → Y.js update
   - Scene add/delete → Y.js update

### Testing Checklist

- [ ] Scene list updates without page flash
- [ ] Real-time scene renaming across editors
- [ ] Scene reordering reflects immediately
- [ ] Thumbnail updates propagate
- [ ] No invalidateAll() calls needed

### Success Criteria

- No more scene list flashing
- Smooth scene metadata updates across all editors
- SSR initial load still functional

---

## Phase 3: Party State Synchronization (Commit 3) - 📋 PLANNED

**Goal**: Sync pause state and active session through Y.js

### Implementation

1. **Party state Y.js integration**

   - Add `party` YMap with isPaused, activeGameSessionId
   - Sync pause state changes across all clients
   - Update active session propagation

2. **UI reactivity updates**

   - Editor pause state UI (buttons, overlays)
   - Playfield pause screen display
   - Session switching indication

3. **Active scene coordination**
   - Track `activeSceneId` in Y.js
   - Playfield switches scenes automatically
   - Editor awareness of active scene changes

### Testing Checklist

- [ ] Pause state syncs immediately
- [ ] Active session changes propagate
- [ ] Playfield pause screen works correctly
- [ ] Editor UI responds to pause changes
- [ ] Session switching is seamless

### Success Criteria

- Global pause state synchronization
- Session changes reflect in all clients
- UI reactivity functions correctly

---

## Phase 4: StageProps Synchronization (Commit 4) - 📋 PLANNED

**Goal**: Replace manual StageProps sync with Y.js

### Implementation

1. **StageProps Y.js integration**

   - Add complete StageProps to Y.js scenes
   - Implement selective sync (shared vs local viewport)
   - 60 FPS throttling for all Y.js updates

2. **Component API changes**

   - Replace `bind:stageProps` with read-only `{stageProps}`
   - Add `{updateProperty}` prop to all child components
   - Update components to use `updateProperty(['path'], value)`

3. **Selective synchronization**

   - **Shared**: All StageProps except scene offset/zoom
   - **Local**: Scene viewport (offset/zoom) per user
   - **Playfield**: Always uses auto-fit, ignores local viewport

4. **Input field throttling strategy**

   - Text/number inputs: 60 FPS throttle
   - Sliders: 30 FPS for real-time feel
   - onBlur for text inputs where appropriate

5. **Component updates needed**

   ```javascript
   // Before:
   stageProps.fog.opacity = newValue;
   socketUpdate();

   // After:
   updateProperty(['fog', 'opacity'], newValue);
   ```

### Testing Checklist

- [ ] StageProps sync across editors
- [ ] Scene isolation (no cross-scene pollution)
- [ ] Playfield auto-fit vs editor viewport
- [ ] Input responsiveness maintained
- [ ] Performance at 60 FPS

### Success Criteria

- Smooth StageProps synchronization
- Local viewport state preserved per editor
- Playfield always shows full scene
- No performance degradation

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
