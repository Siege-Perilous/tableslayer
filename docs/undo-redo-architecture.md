# Editor undo/redo architecture

How the editor's undo/redo works: a per-scene `Y.UndoManager` on top of the realtime doc
(see `yjs-sync-architecture.md`), tracking only this client's transactions. Spec and design
rationale live in `spec/editor-undo-redo.md`. Editor-only by design — the play route is
primarily a receiver and never constructs an undo scope.

## Mental model

`Y.UndoManager` is not a snapshot rollback; the doc only moves forward. It watches
transactions whose `origin` is in its `trackedOrigins` set, records the inverse of each
(items inserted/deleted), and `undo()` applies that inverse as a **new transaction**. The
undo therefore propagates to other clients and the PartyKit persister exactly like any other
edit — no server, persistence, or play-route changes were needed.

Reconciliation properties (pinned by tests in
`apps/web/src/lib/realtime/docSchema.test.ts`, `undo/redo` suite):

- **Per-user.** Each client tracks only its own `SessionDocClient.origin`. Ctrl+Z never
  reverts another editor's or a player's work.
- **Concurrent-safe across fields.** The granular per-field Y.Map schema means undoing your
  change leaves remote edits to other fields untouched.
- **Same-field race is safe.** If a remote peer rewrites the same field after your change,
  your undo is a no-op for that key — their item already displaced yours, so their newer
  value survives.
- **Deletes restore fully.** Undoing a marker/annotation delete restores the entire row
  (Y.UndoManager re-inserts deleted subtrees), masks included.
- **Session-lifetime only.** The stack is in-memory; refresh or scene switch clears it. This
  is Ctrl+Z, not version history.

## Components

### `SessionDocClient` (`apps/web/src/lib/realtime/SessionDocClient.svelte.ts`)

Owns the `Y.UndoManager` and exposes the whole surface:

- `setUndoScope(sceneId | null)` — destroys any prior manager and creates one scoped to the
  selected scene's Y.Map with `trackedOrigins = new Set([this.origin])`. The default 500ms
  `captureTimeout` merges throttled drag/slider transactions into one undo step. Warns and
  leaves undo disabled if the scene is not in the doc (matches the writer convention).
- `undo()` / `redo()` / `stopCapturing()` — thin delegates.
- `canUndo` / `canRedo` — reactive `$state`, refreshed from the manager's
  `stack-item-added` / `stack-item-popped` / `stack-cleared` events. Available for toolbar
  buttons (currently keyboard-only).
- **Stack cap (100).** Every stack item pins its deleted items against Y.js GC — for fog and
  annotation steps that means the prior RLE mask bytes. The cap trims the oldest entries on
  add so long painting sessions don't grow memory unboundedly.
- `systemOrigin` + `systemWrite` — a second `SessionWriter` whose origin is **not** tracked.
  Used for system-initiated writes that must never become a Ctrl+Z step (currently the
  thumbnail `mapThumbLocation` write in `EditorSession`).

### Change classification (`docSchema.ts` → `types.ts`)

`SceneChange.undoRedo` is true when `transaction.origin instanceof Y.UndoManager`. This
exists for one reason: undo transactions are **local** (`remote: false`), but the fog mask
lives on the GPU canvas and is only re-applied imperatively for non-own changes. Without the
flag, undoing a fog stroke would revert the doc but never repaint the canvas — and the stale
canvas would re-commit the undone mask on the next stroke end.

### `EditorSession` (`useEditorSession.svelte.ts`)

Applies fog masks to the canvas when `change.remote || change.undoRedo` (same `isDrawing()`
guard as remote changes — an in-progress stroke wins and re-commits on stroke end).
Annotation masks need no handling: they are declarative layer props, so the snapshot rebuild
repaints them. Thumbnail regeneration after undo happens naturally and is desired (undo
changes are local, which schedules the idle capture).

### Editor page (`+page.svelte`)

- An `$effect` calls `setUndoScope(selectedSceneId)` once `session.ready` — history follows
  the selected scene and resets on navigation.
- `handleKeydown`: Ctrl/Cmd+Z → undo, Ctrl/Cmd+Shift+Z or Ctrl+Y → redo. Runs after the
  input-focus guard so text fields keep native browser undo.
- A capture-phase `pointerdown` on the document calls `stopCapturing()` — every new pointer
  gesture starts a new undo step, so quick consecutive actions don't merge into one.

## Data flow of an undo

```
Ctrl+Z → client.undo() → UndoManager applies inverse transaction (origin = the manager)
  → scenes observer → classifySceneEvents { remote: false, undoRedo: true }
      → revision counters bump → snapshots re-derive → buildRenderProps → Stage (declarative)
      → EditorSession re-applies fog mask to canvas (imperative, undoRedo path)
  → provider syncs the update → other editors / play apply it as an ordinary remote change
  → PartyKit persister marks the scene dirty → debounced DB write
```

## Out of scope (v1) and how to extend

- **Scene-level operations** (create/delete in `SceneSelector`) happen on the parent scenes
  map, outside the per-scene scope, and are not undoable. To add "undo scene delete", scope a
  second UndoManager to the scenes map itself and route only top-level events to it — the
  restore semantics already work (deleted subtrees come back whole).
- **Edits to non-selected scenes** (rename/reorder from the scene list) are only captured
  when they target the selected scene. Accepted inconsistency, documented in the spec.
- **Toolbar buttons**: bind `client.canUndo` / `client.canRedo` — already reactive.
- **Version history** ("restore the session to an hour ago") is a different feature
  (Y.js snapshots), not an UndoManager extension.

## Testing

`docSchema.test.ts` (`undo/redo (Y.UndoManager semantics)`) covers: undo/redo convergence
across live clients, untracked remote/system origins, full marker restoration after delete,
fog mask byte restoration, capture merging vs `stopCapturing` splitting, and the same-field
remote-overwrite race. If a yjs upgrade changes any reconciliation behavior, these tests are
the tripwire.
