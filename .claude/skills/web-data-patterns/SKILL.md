---
name: web-data-patterns
description: Data-layer patterns for apps/web — apiFactory error semantics, mutationFactory/handleMutation, drizzle schema conventions, the Y.js/PartyKit realtime model (no save pipeline!), auth, R2 uploads, Stripe, email, env vars. Load when adding/changing API endpoints, queries/mutations, schema, realtime behavior, or server logic in apps/web.
---

# apps/web data & server patterns

> **Freshness**: last verified 2026-08-26.
> Authoritative deep-dives (verified current): `docs/yjs-sync-architecture.md`, `docs/undo-redo-architecture.md`, `docs/grid-system-architecture.md`, `docs/playwright-testing-guide.md`. Prefer them over re-deriving.
> Anchor files at the bottom — if one is missing/renamed, the code wins; update this skill.

## apiFactory (every /routes/api endpoint — CLAUDE.md C-5)

Defined in `apps/web/src/lib/factories/apiFactory.ts`. `apiFactory<Body>(handler, { validationSchema, …messages })` — zod-validates the JSON body, hands the handler `event & { body }`, JSON-serializes the return.

**Error semantics (load-bearing):**

- `throw new Error('Unauthorized')` — the **exact string** — → 401. This is the canonical auth-fail idiom inside handlers.
- `ZodError` → 400 with `errors: issues`.
- `AppError` (from `src/lib/errors.ts`) or plain `Error` → 400, message surfaced, **not** sent to Sentry.
- Anything else → 500 + `Sentry.captureException`.
- Response shape is always `{ success, status, message, errors? }` — `FormMutationError` on the client matches it.

Canonical endpoint (`src/routes/api/scenes/createScene/+server.ts`): build the schema from drizzle-zod exports (`insertSceneSchema.extend(...)`), auth-check inline (`locals.user?.id` + `isUserInParty`), delegate business logic to a `$lib/server` domain function.

**Exception:** the Stripe webhook (`api/stripe/webhook/+server.ts`) is a raw RequestHandler — it needs the raw body for signature verification. Internal endpoints (`/api/internal/*`) are token-guarded via `assertInternalRequest` (x-internal-token vs `INTERNAL_API_TOKEN`), no user session.

## Frontend queries/mutations (CLAUDE.md C-6)

All in `src/lib/queries/*.ts`, one file per domain. `mutationFactory` (`src/lib/factories/mutationFactory.ts`) wraps TanStack `createMutation`; two config forms: `{ endpoint, method }` (auto-fetch, throws the error JSON on `!ok`) or `{ mutationFn }` (custom work, e.g. R2 upload in `queries/file.ts`).

- **Invalidation default**: no `onSuccess` → `invalidateAll()` (full load re-run). Hooks pass `onSuccess: async () => { return; }` to **opt out** — required for realtime-doc flows so a doc write doesn't trigger a pointless reload (see `queries/scenes.ts`, `queries/gameSessions.ts`).
- Components wrap `mutation.mutateAsync` in `handleMutation({ mutation, formLoadingState, toastMessages, … })` (same file) for loading state + `addToast` feedback.
- Queries use TanStack `createQuery` directly (no factory) — see `queries/users.ts`.

## Database (drizzle + Turso/libSQL)

- **One** app database. Schema: `src/lib/db/app/schema.ts` (~18 tables). Per-table convention: `sqliteTable` → `InsertX`/`SelectX` inferred types → `insertXSchema`/`selectXSchema`/`updateXSchema` via drizzle-zod, `.extend()`ed where needed.
- Timestamps: `integer({ mode: 'timestamp' })` = **Unix seconds** (CLAUDE.md D-5 — use `date -d @<ts>`). Booleans: `integer({ mode: 'boolean' })`. JSON: `text({ mode: 'json' }).$type<…>()`.
- Client (`src/lib/db/app/index.ts`): in production an **embedded replica** (`/app/data/turso_local.db`, syncInterval 30s) with remote fallback; dev is remote-only. Wrapped in `makeResilientClient` (`resilientClient.ts`) — a Proxy that reconnect-retries once on Hrana stream errors; transactions deliberately not retried (rationale: `spec/embedded-replica-stream-recovery.md`).
- Migrations live in `src/lib/db/app/migrations/`. **Never generate/run migrations or `pnpm run push`** — ask the user (CLAUDE.md D-3/D-4).

## Realtime (the biggest thing to internalize)

Full doc: `docs/yjs-sync-architecture.md` (current, trust it). The one-paragraph model:

PartyKit + Y.js. Two Y docs per session (`game_session` = scene content, `party` = party state). Client entry is `src/lib/realtime/SessionDocClient.svelte.ts`: reactive snapshot getters (pages never touch Y types), writes through origin-tagged writers, per-scene `Y.UndoManager`. The PartyKit room (`partykit/gameSession.ts`) hydrates from the DB and is the **only** writer of scene data back to the DB (debounced 2s/max 10s via `/api/internal/persistSession`).

**Consequences when adding features:**

- **There is no save pipeline.** Do not add autosave, save buttons, or scene-update API mutations. Edits are doc writes; PartyKit persists.
- Scene **create** still goes through `/api/scenes/createScene` (server computes alignment), then the client adds the row to the doc. Update/delete/reorder scenes = doc writes only (see the comment atop `queries/scenes.ts`).
- After any **direct DB write** to scene data (import, admin tooling), trigger a room `resync` (`requestGameSessionRoomResync` in `src/lib/server/realtime/`), or the live doc won't see it.
- **Write cadence is handled for you.** `queuePropertyUpdate` applies locally at once and flushes to the doc event-driven (`$lib/utils/propertyUpdateBroadcaster.ts`: 8ms leading-edge gate + trailing timer), and `SessionDocClient` coalesces remote rev bumps via `setTimeout(0)` so message backlogs drain into one rebuild. Do not bypass the broadcaster with per-event `client.write.*` calls in a gesture loop, and never schedule realtime send/receive work on `requestAnimationFrame` — rAF cadence is per-window (focus/occlusion/GPU contention) and makes sync smoothness depend on which window has scheduler priority.
- **Never write settings fields you didn't change.** The broadcaster writes field-level diffs (only fields mapped from queued paths — `sceneSettingsFieldsForPropPaths`). Writing a full settings object from local stageProps pushes stale copies of other clients' in-flight fields into the doc and rubber-bands their gestures. Same rule for any new direct `write.setSceneSettings` call: pass only the fields you actually changed.
- System writes that must not pollute user undo (e.g. thumbnails) go through `systemWrite`.
- Editor integration: `useEditorSession.svelte.ts` in `routes/(app)/[party]/[gameSession]/[[selectedScene]]/` (applies remote fog/annotation masks to the stage, idle thumbnail regen).

## Auth

Custom session-token auth (oslojs), not a library. `src/lib/server/auth.ts`: token in httpOnly `session` cookie; session id = SHA-256 of token; 30-day expiry, sliding renewal at 15 days. `hooks.server.ts` populates `locals.user`/`locals.session` (+ Sentry, prod-only).

- Page protection: the `(app)` route-group layout guard (`routes/(app)/+layout.server.ts` → redirect to /login). Everything under `(app)/` is authed.
- API protection: inline per-handler (`throw new Error('Unauthorized')`), plus `isUserInParty`/`isUserAdminInParty` for party-scoped resources.

## Quick map: uploads, Stripe, email, env

- **Uploads (R2 via S3 API)**: client mutation → `POST /api/file/generatePresignedWriteUrl` → client PUTs blob to presigned URL → optional `/api/file/createFile` for a `filesTable` row. Throwaway assets (fog masks, thumbnails) skip the DB row and cache-bust via `incrementUrlVersion` (`src/lib/utils/fileVersion.ts`). Server: `src/lib/server/file/files.ts`.
- **Stripe**: `api/stripe/{checkout,customerPortal,webhook}`; price→plan via `STRIPE_PRICE_ID_*` envs; updates `partyTable` plan fields; gated by `isStripeEnabled()`.
- **Email (Cloudflare Email Sending, replaced Resend 2026-06)**: `src/lib/server/email/email.ts` → Cloudflare API, from `no-reply@tableslayer.com`. Dev redirects all mail to `DEV_EMAIL`; `ENV_NAME === 'preview'` skips sending.
- **Turnstile (bot check on signup)**: `src/lib/server/turnstile.ts` `verifyTurnstileToken()` (fails closed); gated by `isTurnstileEnabled()` (`TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`). Widget is `lib/components/Turnstile.svelte` (`appearance` prop: `always` outside production so it can be seen/tested, `interaction-only` in production); site key reaches the page via `signup/+page.server.ts`. CI preview uses Cloudflare's always-pass test keys.
- **Env**: `ENV_NAME ∈ production|preview|dev` drives behavior throughout. `PUBLIC_PARTYKIT_HOST` is the only public var. See `.env-example` for the full list.
- Server business logic lives under `src/lib/server/<domain>/`, re-exported from `$lib/server` — endpoints import from there, not from deep paths.
- **Dev**: `pnpm run dev` runs vite (port 5174) + partykit (1999) together. Gates: `pnpm run check`, `pnpm run format-check`.

## Anchor files (freshness check)

- `apps/web/src/lib/factories/apiFactory.ts`
- `apps/web/src/lib/factories/mutationFactory.ts`
- `apps/web/src/lib/db/app/schema.ts` / `index.ts` / `resilientClient.ts`
- `apps/web/src/lib/realtime/SessionDocClient.svelte.ts` / `docSchema.ts`
- `apps/web/partykit/gameSession.ts`
- `apps/web/src/lib/server/auth.ts`, `apps/web/src/hooks.server.ts`
- `apps/web/src/routes/api/scenes/createScene/+server.ts` — canonical endpoint

## Keeping this skill current

If this document contradicts the code, trust the code and update this file in the same PR. Changes to factory signatures, the realtime persistence model, or auth flow must be reflected here (and in the relevant `/docs` file).
