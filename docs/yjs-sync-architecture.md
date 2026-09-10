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
  Dirty-tracking observers are attached **per doc instance**, not once per room: y-partykit
  destroys the doc when the last socket closes, and the next connection gets a fresh one.
- **Persist**: a doc observer collects dirty scene parts (origin-filtered so hydration never
  echoes back). y-partykit's debounced callback (2s idle / 10s max) posts only dirty scenes to
  `/api/internal/persistSession` (replace-rows semantics per collection). Failures merge the
  dirty set back and retry via an in-instance timer — PartyKit alarms cannot read `room.id`, so
  alarms are not used.
- **Resync**: `POST {"type":"resync"}` (internal-token guarded) rebuilds a live room from the DB
  after direct DB writes (import, admin tools). `{"type":"debug"}` on the game session room
  exposes persister stats. The app calls these via `requestPartyRoomResync` /
  `requestGameSessionRoomResync` in `$lib/server/realtime`.
- **Activity reporting**: each room batches `connect`/`close` events (1 s, via
  `partykit/roomActivity.ts`) to `/api/internal/roomActivity`, which writes `realtime_activity`
  rows (party, session, kind, user, socket count after the event). Best-effort: it never
  throws, never retries, and never blocks `onConnect`. `onClose(conn)` now receives the
  connection; the last close awaits the activity flush together with the persist so the final
  row lands before eviction. The persist endpoints add one `edit` / `party_state` row per call.
  Durable Objects bill wall-clock time while a room holds any socket, so this log is what
  `/admin/usage` rolls up (`$lib/server/realtime/activityRollup.ts`, pure).
- Internal endpoints authenticate via the `INTERNAL_API_TOKEN` shared secret
  (`x-internal-token`); dev falls back to `dev-internal-token` on both sides. The PartyKit env
  also needs `BASE_URL` (the app's URL — passed via `--var` at deploy; defaults to
  `http://localhost:5174`, the web app's pinned dev port; `APP_API_URL` overrides if set).

## Clients (`apps/web/src/lib/realtime/`)

`SessionDocClient` owns both Y docs, their providers, and the presence channel. It exposes:

- **Reactive snapshot reads** — `scenes()`, `scene(id)`, `partyState()` — backed by per-scene
  revision counters bumped from doc observers, with memoized snapshots. Local writes bump revs
  synchronously; **remote** bumps coalesce through a `setTimeout(0)` macrotask, so a backlog of
  incoming messages drains into a single snapshot rebuild from the latest doc state instead of
  one per message. Never move this (or any realtime scheduling) onto `requestAnimationFrame` —
  rAF cadence is per-window (focus/occlusion/GPU contention) and chains receive latency to that
  window's rendering health.
- **Origin-tagged writers** — `write.setSceneSettings/upsertMarker/setFogMask/...` and
  `party.setActiveScene/setPaused`. Writers warn loudly when a target scene is missing rather
  than silently no-oping.
- **`ready`** — true once both rooms are synced _and_ hydrated. Pages render SSR-seeded props
  until then. It latches: pages keep rendering the last doc state while the client sleeps.
- **`status` / `synced` / `sleeping`** — `status` reports each provider's real state
  (`connecting | connected | disconnected`); `synced` is true only while both rooms are synced
  (false from disconnect until sync step 2 after reconnect); `sleeping` is true between
  `disconnect()` and `connect()` and flips synchronously first, so status observers can tell a
  deliberate pause from a fault (the editor skips its "connection lost" toast for sleep).
- **`connect()` / `disconnect()`** — deliberate sleep/wake. Disconnect suspends presence first
  (so cleared awareness goes out on the open socket), then closes both providers. Local edits
  made while asleep merge by CRDT on reconnect. Never call these by hand from a page; use
  `SleepController`.
- **`onChanges`** — classified change stream (`{sceneId, part, keys, childId, remote}`) used for
  imperative work like applying remote masks to the GPU canvas.
- **`onRemoteActivity`** — fires on remote scene changes, remote party-state changes, and
  awareness changes that add/update peers (removals are excluded so a network blip does not
  count as activity). Feeds the idle policy.

### Idle sleep (`idlePolicy.ts`, `SleepController.svelte.ts`)

Durable Objects bill while a room holds any socket; an abandoned tab costs about as much as a
month of games. Both routes therefore drop their connections when nothing is happening:

- `idlePolicy.ts` is a pure reducer (`input | remote | visibility | focus | tick | wake` →
  `sleep | wake | ping` effects). Decisions are made from event timestamps, never from timer
  cadence, so a late timer in a throttled or frozen tab cannot sleep a tab that just became
  visible. `nextDeadline` tells the adapter when to look again.
- `SleepController` is the browser adapter: document capture listeners (one dispatch per
  second), `visibilitychange`, `focus`/`pageshow`, one re-armed `setTimeout`, and `canSleep()`
  so a sleep never starts mid-gesture (a blocked tick re-checks in 30 s). `bindClient` returns
  an unbind because the play route swaps clients on cross-session switches.
- Thresholds: hidden 5 min (both), idle 60 min editor / 30 min play. Wake sources: input,
  visibility, focus, and (play only) a poll.
  In dev, append `?hiddenSleep=5&idleSleep=10&ping=5` (seconds) to either route's URL to shorten
  them for testing (`idlePolicyFromSearch`; ignored in production builds).
- **Editor ping**: while active with input, the editor POSTs `/api/party/editorActivity` at most
  every 2 min (and immediately on wake), writing an `editor_active` row.
- **Play poll**: while asleep the playfield polls `/api/party/liveState` every 20 s
  (`createPartyLiveStateQuery`, DB only, no room time) and wakes when the active scene or
  pause state differs from the first poll after it slept (DB-to-DB, immune to doc/DB drift) or a
  newer wake-kind activity row exists
  (`connect`/`edit`/`party_state`/`editor_active`; never `close`, or its own disconnect would
  wake it). Latency for "GM moves mouse → TV wakes": the ping is immediate when the editor's last
  ping is over 2 min old (always the case once the TV has slept in normal use), then poll ≤ 20 s,
  then production embedded-replica sync ≤ 30 s, so under a minute in practice. Worst case, when
  the editor pinged within the last 2 min, is about 2 min 20 s plus replica sync. Doc changes
  (edits, scene switch, pause) skip the ping and wake within one poll of the persist.
- A sleeping playfield shows `SleepOverlay` ("Still playing?") over the still-rendered last
  scene; the editor shows an info toast on sleep and a loading toast until both rooms are
  synced again.

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
  broadcaster (`$lib/utils/propertyUpdateBroadcaster.ts`) applies the value locally right away
  and flushes shared paths to the doc throttled: an 8ms leading-edge gate sits below typical
  input-event spacing, so during a gesture nearly every input event flushes immediately and the
  broadcast inherits the input stream's even rhythm; a trailing timer catches the gesture tail.
  (Not rAF — see above.) `flushQueuedPropertyUpdates()` forces a pending flush; rebinding or
  unbinding flushes automatically. Local-only paths (viewport, tools, measurement config) never
  touch the doc.
- Settings flushes are **field-level**: only fields mapped from the queued property paths are
  written (`sceneSettingsFieldsForPropPaths` in `convertStagePropsToSceneData.ts`), never a
  full settings snapshot. A full snapshot would write this client's stale copies of fields it
  never touched — with two live editors that reverts the other editor's in-flight changes
  (e.g. a receiver's `relockMapZoom` write rubber-banding the sender's pan).

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
into the doc as annotations. `suspend()` (called by `SessionDocClient.disconnect()`) stops the
heartbeat and clears every ephemeral field while keeping `stagePerformance` — never a null state,
since y-protocols ignores `setLocalStateField` on null — so a stale cursor cannot reappear when
the provider re-sends local state on reconnect; `resume()` restarts the heartbeat.

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
