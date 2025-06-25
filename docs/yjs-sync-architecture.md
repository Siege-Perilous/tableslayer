# Y.js Real-time Synchronization Architecture with PartyKit

This document explains how Table Slayer's real-time collaboration system works using PartyKit, Y.js, and the YPartyKitProvider for real-time synchronization.

## Table of Contents

1. [Overview](#overview)
2. [PartyKit Architecture](#partykit-architecture)
3. [Y.js Document Architecture](#yjs-document-architecture)
4. [Data Loading Flow](#data-loading-flow)
5. [Y.js Update Flow](#yjs-update-flow)
6. [Cursor Handling](#cursor-handling)
7. [Throttling and Batching System](#throttling-and-batching-system)
8. [Local-Only Properties](#local-only-properties)
9. [Stale Data Detection](#stale-data-detection)
10. [Save System](#save-system)
11. [Deployment Strategy](#deployment-strategy)
12. [Cost Optimization](#cost-optimization)
13. [Adding New Properties to StageProps](#adding-new-properties-to-stageprops)

## Overview

Table Slayer uses PartyKit as its WebSocket infrastructure for real-time collaboration, with Y.js for conflict-free replicated data types (CRDTs). The system supports multiple users editing scenes simultaneously with automatic conflict resolution.

### Key Components

- **PartyKit**: WebSocket server infrastructure deployed to Cloudflare Workers
- **Y.js Documents**: Shared CRDT data structures that automatically sync between clients
- **YPartyKitProvider**: Y.js provider that connects to PartyKit servers
- **Property Update Broadcaster**: Throttles and batches updates before sending to Y.js
- **Auto-save System**: Periodically saves Y.js state to the database
- **Drift Detection**: Ensures Y.js data doesn't diverge from the database

## PartyKit Architecture

### Server Implementation

PartyKit servers are implemented as Cloudflare Workers that handle WebSocket connections and Y.js synchronization:

```typescript
// partykit/gameSession.ts
import { onConnect } from 'y-partykit';
import type * as Party from 'partykit/server';

export default class GameSessionServer implements Party.Server {
  constructor(public party: Party.Party) {}

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Get userId from query params for awareness
    const userId = new URL(ctx.request.url).searchParams.get('userId');

    return await onConnect(conn, this.party, {
      // Use snapshot persistence mode
      persist: { mode: 'snapshot' },

      // Optional: Load initial state from database
      load: async () => {
        // Could implement loading from SQLite/R2 here
        return null;
      },

      // Optional: Save Y.js state periodically
      callback: {
        handler: async (yDoc) => {
          // Could implement saving to database here
          console.log('Document updated for session:', this.party.id);
        },
        debounceWait: 10000, // Save 10 seconds after last change
        debounceMaxWait: 30000 // Force save after 30 seconds
      }
    });
  }
}
```

### PartyKit Configuration

```json
// partykit.json
{
  "name": "tableslayer",
  "main": "partykit/gameSession.ts",
  "compatibilityDate": "2025-06-24",
  "parties": {
    "game_session": "partykit/gameSession.ts",
    "party": "partykit/party.ts"
  }
}
```

Important: Party names must use underscores or hyphens, not camelCase.

### Cloud-prem Deployment

PartyKit is deployed to the user's own Cloudflare account for better pricing:

```bash
# Deploy to custom domain
npx partykit deploy --name tableslayer --domain partykit.tableslayer.com

# Required environment variables
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-workers-api-token
```

This requires a Cloudflare Workers paid plan ($5/month) for Durable Objects support.

## Y.js Document Architecture

The system uses two separate Y.js documents for different scopes:

### 1. Game Session Document

Manages scene-specific data for a game session:

```typescript
// Room naming: gameSession ID directly
const gameSessionRoom = gameSessionId || `party-${partyId}`;

// Contains:
- yScenes: Map of scene data
- yScenesList: Ordered array of scenes
- yGameSessionMeta: Metadata like initialization flags
- yCursors: Map for cursor data (deprecated, now uses awareness)
```

### 2. Party Document

Manages party-wide state across game sessions:

```typescript
// Room naming: party ID directly
const partyRoom = partyId;

// Contains:
- yPartyState: Active scene ID, pause status
```

This separation allows seamless switching between game sessions while maintaining party-level state.

## Data Loading Flow

### 1. Initial Server-Side Load

When a user navigates to a scene, data is loaded server-side:

```typescript
// +page.server.ts
export const load: PageServerLoad = async (event) => {
  const partykitHost = process.env.PUBLIC_PARTYKIT_HOST || 'localhost:1999';
  const scenes = await getScenes(gameSession.id);
  const markers = await getMarkersForScene(selectedScene.id);

  return {
    scenes,
    markers,
    selectedScene,
    partykitHost // Pass host to client
  };
};
```

### 2. Client-Side PartyKit Connection

On mount, the client initializes Y.js with PartyKit providers:

```typescript
// PartyDataManager.ts
export class PartyDataManager {
  private gameSessionProvider: YPartyKitProvider;
  private partyProvider: YPartyKitProvider;
  private doc: Y.Doc;
  private partyDoc: Y.Doc;

  constructor(partyId: string, userId: string, gameSessionId?: string, partykitHost: string = 'localhost:1999') {
    this.doc = new Y.Doc();
    this.partyDoc = new Y.Doc();

    // Use provided host (passed from server)
    const host = partykitHost;

    // Game session connection
    const gameSessionRoom = gameSessionId || `party-${partyId}`;
    this.gameSessionProvider = new YPartyKitProvider(host, gameSessionRoom, this.doc, {
      party: 'game_session',
      params: { userId }
    });

    // Party connection
    this.partyProvider = new YPartyKitProvider(host, partyId, this.partyDoc, {
      party: 'party',
      params: { userId }
    });

    // Initialize Y.js structures
    this.yScenes = this.doc.getMap('scenes');
    this.yScenesList = this.doc.getArray('scenesList');
    this.yGameSessionMeta = this.doc.getMap('gameSessionMeta');
    this.yPartyState = this.partyDoc.getMap('partyState');
  }
}
```

### 3. Connection Status

YPartyKitProvider manages WebSocket connections automatically:

```typescript
// Monitor connection status
getConnectionStatus(): {
  gameSession: 'disconnected' | 'connecting' | 'connected';
  party: 'disconnected' | 'connecting' | 'connected';
  overall: boolean;
} {
  const gameSessionStatus = this.gameSessionProvider.shouldConnect
    ? this.gameSessionProvider.wsconnected
      ? 'connected'
      : 'connecting'
    : 'disconnected';

  const partyStatus = this.partyProvider.shouldConnect
    ? this.partyProvider.wsconnected
      ? 'connected'
      : 'connecting'
    : 'disconnected';

  return {
    gameSession: gameSessionStatus,
    party: partyStatus,
    overall: this.isConnected
  };
}
```

## Y.js Update Flow

Updates flow through the Property Update Broadcaster to Y.js via PartyKit:

### 1. User Makes a Change

```svelte
<InputSlider
  value={stageProps.map.opacity}
  min={0}
  max={1}
  step={0.1}
  oninput={(value) => handleMapOpacityChange(value)}
/>
```

### 2. Update is Queued and Broadcast

```typescript
function handleMapOpacityChange(value: number) {
  queuePropertyUpdate(stageProps, ['map', 'opacity'], value, 'control');
}
```

### 3. PartyKit Synchronizes

The YPartyKitProvider handles WebSocket communication with the PartyKit server, which broadcasts Y.js updates to all connected clients.

### 4. Other Clients Receive Updates

```typescript
partyData.subscribe(() => {
  const sceneData = partyData.getSceneData(selectedScene.id);
  if (sceneData && sceneData.stageProps) {
    stageProps = sceneData.stageProps;
  }
});
```

## Cursor Handling

Cursor tracking uses Y.js awareness protocol via YPartyKitProvider:

### Sending Cursor Updates

```typescript
updateCursor(position: { x: number; y: number }, normalizedPosition: { x: number; y: number }) {
  if (this.isConnected && this.gameSessionProvider.awareness) {
    this.gameSessionProvider.awareness.setLocalStateField('cursor', {
      userId: this.userId,
      position,
      normalizedPosition,
      lastMoveTime: Date.now()
    });
  }
}
```

### Receiving Cursor Updates

```typescript
getCursors(): Record<string, CursorData> {
  const cursors: Record<string, CursorData> = {};

  if (this.gameSessionProvider.awareness) {
    this.gameSessionProvider.awareness.getStates().forEach((state, clientId) => {
      if (state.cursor && clientId !== this.gameSessionProvider.awareness.clientID) {
        cursors[state.cursor.userId] = state.cursor;
      }
    });
  }

  return cursors;
}
```

### Cost Optimization: Cursor Throttling

To reduce PartyKit request costs, cursor updates are throttled to 30 FPS:

```typescript
// Create throttled cursor update function
throttledCursorUpdate = throttle((position: { x: number; y: number }, normalizedPosition: { x: number; y: number }) => {
  partyData!.updateCursor(position, normalizedPosition);
}, 33); // 33ms = ~30 FPS
```

This reduces cursor update frequency from ~60+ updates/second to 30 updates/second, cutting cursor-related costs by ~50%.

### Important: Cursors are Ephemeral

Cursors use Y.js awareness, which means:

- They are NOT stored in Y.js documents
- They are NOT persisted between sessions
- They disappear when a user disconnects
- They still count as PartyKit requests (hence throttling)

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

  // Check if immediate sync is enabled
  if (immediateYjsSyncEnabled && partyDataManager && currentSceneId) {
    partyDataManager.updateSceneStageProps(currentSceneId, stageProps);
  }

  // Queue for batched update
  const pathKey = propertyPath.join('.');
  pendingUpdates[pathKey] = { path: propertyPath, value };

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

## Local-Only Properties

Some properties don't sync between users:

```typescript
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
  const yjsTimestamp = this.getSceneLastUpdated(sceneId);
  if (!yjsTimestamp) return false;
  return dbTimestamp > yjsTimestamp;
}

async detectDrift(fetchSceneTimestamps: () => Promise<Record<string, number>>): Promise<string[]> {
  const dbTimestamps = await fetchSceneTimestamps();
  const driftedScenes: string[] = [];

  for (const [sceneId, dbTimestamp] of Object.entries(dbTimestamps)) {
    if (this.checkSceneDrift(sceneId, dbTimestamp)) {
      driftedScenes.push(sceneId);
    }
  }

  return driftedScenes;
}
```

## Save System

The auto-save system prevents data loss by periodically saving Y.js state to the database:

### Save Coordination

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

## Deployment Strategy

### Production Deployment (Cloud-prem)

PartyKit servers are deployed to the user's own Cloudflare account:

```bash
# Deploy to custom domain
npx partykit deploy --name tableslayer --domain partykit.tableslayer.com

# Environment variables required:
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-workers-api-token # Needs Workers permissions
```

GitHub Actions workflow:

```yaml
- name: Deploy PartyKit servers
  if: github.ref == 'refs/heads/main'
  working-directory: apps/web
  run: npx partykit deploy --name tableslayer --domain partykit.tableslayer.com
  env:
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_WORKERS_KEY }}
```

### Per-PR Deployments

Each pull request gets its own PartyKit deployment for isolated testing:

```yaml
# .github/workflows/ci.yml
- name: Deploy PartyKit for PR
  working-directory: apps/web
  run: |
    echo "Deploying PartyKit for PR #${{ github.event.pull_request.number }}"
    npx partykit deploy --name pr-${{ github.event.pull_request.number }}-tableslayer
  env:
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_WORKERS_KEY }}

# Set the host in the generated .env
PUBLIC_PARTYKIT_HOST=pr-${{ github.event.pull_request.number }}-tableslayer.partykit.dev
```

### Cleanup on PR Close

```yaml
# .github/workflows/destroydb.yml
- name: Delete PartyKit deployment
  working-directory: apps/web
  run: |
    echo "Deleting PartyKit deployment for PR #${{ github.event.pull_request.number }}"
    npx partykit delete --name pr-${{ github.event.pull_request.number }}-tableslayer --yes
  env:
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_WORKERS_KEY }}
```

## Cost Optimization

### Pricing Models

1. **PartyKit Managed** (original approach): $19/month for 1M requests/day
2. **Cloudflare Workers** (cloud-prem): $5/month + usage-based pricing
   - 10M requests/month included
   - $0.50 per additional million requests
   - Much more cost-effective at scale

### Optimization Techniques

1. **Cursor Throttling**: Reduce cursor updates from 60+ FPS to 30 FPS
   - Before: ~20 users × 60 updates/sec = 1,200 requests/sec
   - After: ~20 users × 30 updates/sec = 600 requests/sec
   - 50% reduction in cursor-related costs

2. **Batched Updates**: Group property changes within time windows
   - UI controls: 100ms batching window
   - Scene updates: 200ms batching window
   - Reduces request count by 80-90% for rapid changes

3. **Local-Only Properties**: Don't sync viewport state
   - Offset, rotation, zoom are per-user
   - Eliminates thousands of unnecessary syncs

4. **Smart Save Coordination**: Only one user saves at a time
   - Prevents duplicate save operations
   - Reduces database write load

### Cost Estimation

With optimizations on Cloudflare Workers:

- 20 concurrent users
- 30 cursor updates/second/user
- 10 property updates/minute/user
- Total: ~40,000 requests/hour
- Monthly: ~29M requests
- Cost: $5 base + $9.50 for additional 19M requests = **$14.50/month**

(Compared to $19/month for PartyKit managed or ~$1000/month for Redis)

## Adding New Properties to StageProps

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
</script>

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
```

## Key Architecture Benefits

1. **Simplified Infrastructure**: No Socket.IO complexity, native WebSocket support
2. **Global Edge Deployment**: PartyKit runs on Cloudflare's edge network
3. **Cost Effective**: ~$15/month vs $1000+/month for Redis
4. **First-Class Y.js Support**: Built specifically for CRDT applications
5. **Per-PR Testing**: Isolated environments for each pull request
6. **Automatic Scaling**: Cloudflare Workers scale automatically
7. **Native Apple Silicon Support**: No compatibility issues with development
8. **Cloud-prem Option**: Deploy to your own Cloudflare account for better pricing

## Debugging

Enable debug logging:

```typescript
// In browser console
localStorage.setItem('debug', 'y-*');
```

Monitor PartyKit connection:

```typescript
devLog('yjs', `PartyDataManager connecting to PartyKit: ${host}, room: ${gameSessionRoomName}`);
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

## Best Practices

1. **Always update locally first** for immediate UI feedback
2. **Use appropriate throttle delays** based on update frequency
3. **Mark properties as local-only** when they shouldn't sync
4. **Test with multiple browsers** to ensure sync works correctly
5. **Monitor for drift** between Y.js and database state
6. **Handle save conflicts** gracefully with the coordinator system
7. **Use cursor throttling** to reduce PartyKit costs
8. **Deploy per-PR** for isolated testing environments
9. **Use cloud-prem deployment** for production cost savings
10. **Clear protections on focus loss** to prevent sync deadlocks
11. **Use underscore party names** in partykit.json configuration
