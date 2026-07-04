# Debugging Guide for Table Slayer

> Last verified 2026-07-04 against the realtime-v2 architecture. For how sync works (and why there is no save pipeline), read [Y.js Sync Architecture](./yjs-sync-architecture.md) first.

## Quick reference: symptom → tool

| Symptom                                           | Tool                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| Edits not persisting / not reaching other players | PartyKit room `debug` endpoint (persister state), then `resync`           |
| Slow page loads, slow scene switches              | `/diagnostics` page (DB / R2 / PartyKit latency checks)                   |
| Stage FPS drops, GPU memory growth                | F9 performance overlay ([stage perf guide](./stage-performance-guide.md)) |
| Doc out of sync after a direct DB write           | `requestGameSessionRoomResync` / room `resync` command                    |
| Production exceptions                             | Sentry (enabled when `ENV_NAME=production` and `SENTRY_DSN` set)          |
| Flaky or failing e2e tests                        | [Playwright testing guide](./playwright-testing-guide.md)                 |

## Development logging

`apps/web/src/lib/utils/debug.ts` provides `devLog`, `devWarn`, and `devError`. They log **only when `dev` is true** — they are silent in preview and production builds, so they are safe to commit.

```typescript
import { devLog, devWarn, devError } from '$lib/utils/debug';

devLog('yjs', 'Connected to PartyKit', { room: gameSessionId });
// Output: [yjs] Connected to PartyKit { room: 'abc123' }
```

A first argument that is a single lowercase word is treated as a `[prefix]`. Prefixes in current use: `yjs`, `scene`, `markers`, `fog`, `annotation`, `save`, `query`. Match the subsystem you're debugging and pass structured objects, not interpolated strings.

Never commit raw `console.log` for debugging — use `devLog` so it strips itself out of production.

> **Dead code note:** `debug.ts` also exports `prodLog` and `timingLog` (URL `?debug=` + sessionStorage gated production logging). They currently have **zero callers** — the fog-timing pipeline they instrumented was removed in realtime-v2. Wire them up intentionally or delete them; don't assume `?debug=` does anything today.

## The /diagnostics page

`/diagnostics` (optionally `/diagnostics/<gameSessionId>`) is an authed, in-app latency dashboard defined in `apps/web/src/routes/(app)/diagnostics/[[sessionId]]/`. It runs timed checks and reports pass/warn/fail per step:

- **DB**: user parties query, raw scenes query, full scene load, markers/lights/annotations, fog and annotation mask loads
- **R2**: thumbnail and large-image resize round-trips
- **PartyKit**: websocket server round-trip (`ping` → `pong`)

It also shows the serving region and the database mode (embedded replica vs remote). Use **Copy as JSON** to attach results to an issue. This is the first stop for "the app feels slow" reports, because it separates DB, storage, and realtime latency in one view.

## Realtime / sync debugging

The PartyKit room is the authoritative persister; when data seems stuck, ask it directly. `partykit/gameSession.ts` `onRequest` accepts internal POST commands guarded by the `x-internal-token` header (`INTERNAL_API_TOKEN`, `dev-internal-token` in dev):

```bash
# Inspect persister state: observed/persisting flags, dirty scenes+parts, deletions, flush stats
curl -X POST "https://<PARTYKIT_HOST>/parties/game_session/<gameSessionId>" \
  -H "x-internal-token: $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"debug"}'

# Liveness check
curl ... -d '{"type":"ping","timestamp":123}'

# Rebuild the live doc from the database (drops stale dirty state)
curl ... -d '{"type":"resync"}'
```

Reading the `debug` payload:

- `dirty` non-empty and shrinking → normal debounced persistence (2s debounce, 10s max wait).
- `dirty` non-empty and stuck with `persisting: false` → the persist call is failing; check the app's `/api/internal/persistSession` logs. A 15s retry timer should be re-attempting.
- Doc content doesn't match the DB after an import or admin write → someone wrote to the DB directly without a resync. From server code use `requestGameSessionRoomResync(gameSessionId)` / `requestPartyRoomResync(partyId)` (`src/lib/server/realtime/`); manual writes can use the curl above.

Client-side, `SessionDocClient` is only `ready` once both providers have synced and both docs are server-hydrated — a page stuck "loading" usually means hydration never completed (check the PartyKit dev terminal, `npx partykit dev` output runs alongside `vite dev` in `pnpm run dev`).

## Stage rendering performance

Press **F9** on any Stage to toggle the performance overlay (FPS, frame time, draw calls, GPU memory estimates). The full workflow — including `disabledLayers` bisection, `logMetricsToConsole`, and the metrics helpers exported from `@tableslayer/stage` — is in the [stage performance guide](./stage-performance-guide.md). Key files live under `packages/stage/src/lib/components/Stage/helpers/` (`performanceMetrics.svelte.ts`, `debugState.svelte.ts`).

For layer-by-layer experimentation, the docs playground (`pnpm --filter docs dev`, `/stage` route) exposes every StageProp via tweakpane panels.

## Production errors

Sentry initializes only when `ENV_NAME === 'production'` and `SENTRY_DSN` is set (`src/hooks.server.ts`). Inside `apiFactory`, thrown `AppError`s and plain `Error`s become 400s and are **not** reported; only unexpected errors reach Sentry as 500s. If you're not seeing an error in Sentry, check whether the code path intentionally classifies it as expected.

## Related documentation

- [Y.js Sync Architecture](./yjs-sync-architecture.md) — the sync/persistence model
- [Undo/Redo Architecture](./undo-redo-architecture.md) — per-scene Y.UndoManager scoping
- [Stage Performance Guide](./stage-performance-guide.md) — rendering profiling workflow
- [Playwright Testing Guide](./playwright-testing-guide.md) — e2e tests, CI GPU setup
