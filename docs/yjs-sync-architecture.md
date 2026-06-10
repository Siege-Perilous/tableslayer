# Realtime sync architecture (v2)

How Table Slayer's real-time collaboration works: one authoritative Y.js document per game
session, owned by the PartyKit server; every client (editor or play) commits edits to the
document immediately; the database is a snapshot the server maintains. Design rationale lives in
`spec/realtime-sync-v2.md`; implementation notes in `spec/realtime-sync-v2-progress.md`.

## Ownership model

| State                                                       | Owner                     | Transport          | Persisted by                      |
| ----------------------------------------------------------- | ------------------------- | ------------------ | --------------------------------- |
| Scene content (settings, markers, lights, annotations, fog) | Y doc (game session room) | y-partykit sync    | PartyKit server → DB (debounced)  |
| Active scene, paused                                        | Y doc (party room)        | y-partykit sync    | PartyKit server → DB              |
| Viewport, active tool, brush size, selections               | plain component `$state`  | never shared       | preference cookies where relevant |
| Presence (cursors, measurements, temp drawings)             | awareness                 | awareness protocol | never                             |
| Account/party/session metadata, auth                        | DB                        | SSR `load`         | normal API                        |

No state is ever merged from two sources, and clients never write scene data to the database.

## Document schema (`apps/web/src/lib/realtime/docSchema.ts`)

Granular per-field Y.Maps so concurrent edits merge last-writer-wins per field:

```
gameSession doc (room id = gameSessionId, party "game_session")
├─ meta: Y.Map        { schemaVersion, hydratedAt }
└─ scenes: Y.Map<sceneId, Y.Map>
    ├─ settings: Y.Map<field, primitive>     // the scene table columns, flat keys
    ├─ markers: Y.Map<markerId, Y.Map<field, primitive>>
    ├─ lights: Y.Map<lightId, Y.Map<field, primitive>>
    ├─ annotations: Y.Map<annotationId, Y.Map<field | 'mask', primitive | Uint8Array>>
    └─ fogMask: Uint8Array (RLE)

party doc (room id = party.id (uuid), party "party")
├─ meta: Y.Map        { schemaVersion, hydratedAt }
└─ state: Y.Map       { activeSceneId, isPaused }
```

Key properties:

- Doc rows are **DB-shaped** (mirroring the drizzle `Select*` types) so the persister copies
  fields straight into upserts and `buildSceneProps` consumes snapshots directly.
- **Masks live in the doc** as `Uint8Array` — no mask API fetches, no version counters. RLE
  masks commit on stroke end (500ms debounce) and remote clients apply them via
  `stage.fogOfWar.fromRLE` / `stage.annotations.loadMask`.
- Scene ordering uses **fractional `order` values** (`orderBetween`); a reorder is one field
  write. SQLite stores fractional values in the integer column without complaint.
- **Own-update detection is transaction identity, not timing**: local writes are tagged with the
  client's origin, and `classifySceneEvents` reports `remote = !transaction.local`. There are no
  echo windows or protection timers anywhere in the system.

## Server (PartyKit, `apps/web/partykit/`)

`gameSession.ts` and `party.ts` are the only writers of realtime-owned state to the database.

- **Hydrate**: on first use a room fetches `/api/internal/sessionSnapshot` (or `partySnapshot`)
  and builds the doc. `meta.schemaVersion` makes hydration idempotent; y-partykit snapshot
  persistence covers room eviction between DB writes.
- **Persist**: a doc observer collects dirty scene parts (origin-filtered so hydration never
  echoes back). y-partykit's debounced callback (2s idle / 10s max) posts only dirty scenes to
  `/api/internal/persistSession` (replace-rows semantics per collection). Failures merge the
  dirty set back and retry via an in-instance timer — PartyKit alarms cannot read `room.id`, so
  alarms are not used.
- **Resync**: `POST {"type":"resync"}` (internal-token guarded) rebuilds a live room from the DB
  after direct DB writes (import, admin tools). `{"type":"debug"}` on the game session room
  exposes persister stats. The app calls these via `requestPartyRoomResync` /
  `requestGameSessionRoomResync` in `$lib/server/realtime`.
- Internal endpoints authenticate via the `INTERNAL_API_TOKEN` shared secret
  (`x-internal-token`); dev falls back to `dev-internal-token` on both sides. The PartyKit env
  also needs `APP_API_URL` (defaults to `http://localhost:5174`, the web app's pinned dev port).

## Clients (`apps/web/src/lib/realtime/`)

`SessionDocClient` owns both Y docs, their providers, and the presence channel. It exposes:

- **Reactive snapshot reads** — `scenes()`, `scene(id)`, `partyState()` — backed by per-scene
  revision counters bumped from doc observers, with memoized snapshots.
- **Origin-tagged writers** — `write.setSceneSettings/upsertMarker/setFogMask/...` and
  `party.setActiveScene/setPaused`. Writers warn loudly when a target scene is missing rather
  than silently no-oping.
- **`ready`** — true once both rooms are synced _and_ hydrated. Pages render SSR-seeded props
  until then.
- **`onChanges`** — classified change stream (`{sceneId, part, keys, childId, remote}`) used for
  imperative work like applying remote masks to the GPU canvas.

### Render data flow (both routes)

```
renderProps = buildRenderProps(docSnapshot, localView) → structural sharing → Stage
```

- `buildRenderProps` is pure: snapshot + local view (viewport, tools, in-flight drag overrides)
  → `StageProps`. Interaction callbacks write to the doc or to local state, never to the result.
- `reuseUnchanged` (structural sharing) keeps identity for unchanged subtrees so stage-internal
  fine-grained effects don't re-fire on every doc change.
- Gestures use **gesture-bounded overrides**: during a marker drag the local position overrides
  the snapshot while writes throttle to the doc at 50ms; the override clears shortly after the
  gesture ends. No wall-clock protection windows.
- The editor's control panels still call `queuePropertyUpdate(stageProps, path, value)`; the
  broadcaster (`$lib/utils/propertyUpdateBroadcaster.ts`) applies the value locally and flushes
  shared paths to the doc in the same microtask. Local-only paths (viewport, tools, measurement
  config) never touch the doc.

### Editor vs play

Both routes are peers on the same doc; the difference is capability and chrome
(`$lib/realtime/capabilities.ts`), not architecture. The play route follows
`party.state.activeSceneId` (reconnecting rooms for cross-session switches), preloads sibling
scene maps, and exposes touch tools (fog, drawing, measurement, scene switching) that write
through the same doc APIs as the editor. Scene URLs in the editor address scenes **by id**;
legacy ordinal URLs 301-redirect.

### Presence (`presence.svelte.ts`)

Cursors (33ms throttle), measurements, hovered/pinned markers, and temporary player drawings ride
the awareness protocol with a 15s heartbeat. Temporary drawings expire after 10s unless persisted
into the doc as annotations.

## Thumbnails

The editor regenerates a scene's thumbnail 10 seconds after edits go idle (Three.js capture →
R2 upload → `setSceneSettings({ mapThumbLocation })`). Failures are silent by design — thumbnails
are best-effort and never interact with data durability.

## Debugging

- Filter the editor console by `[editor]` and play by `[play]`.
- Room debug/resync commands and the local scratch probes are documented in
  `spec/realtime-sync-v2-progress.md`.
- "Connected" means "edits are durable" — the editor toasts on connection loss/recovery; there
  is intentionally no "saved" toast because saving is not a client-side event.
