import * as Y from 'yjs';

// A room's Y doc, snapshotted into Durable Object storage. The DB is the source of
// truth for content; this snapshot exists so a doc restored after eviction or a
// hibernation wake keeps the same Yjs item identities that connected clients hold.
// A doc rebuilt from the DB would carry fresh identities, and a reconnecting
// client's old subtree would then win or lose per Y.Map key arbitrarily.

// SQLite-backed storage caps key+value at 2 MB; `put()` takes at most 128 keys
const CHUNK_BYTES = 1024 * 1024;
const MAX_CHUNKS = 126;
const META_KEY = 'snap:meta';
const DIRTY_KEY = 'snap:dirty';
const chunkKey = (index: number) => `snap:${index}`;
const chunkKeys = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => chunkKey(from + i));

export interface SnapshotStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  put<T>(entries: Record<string, T>): Promise<void>;
  delete(keys: string[]): Promise<number>;
}

interface SnapshotMeta {
  count: number;
  bytes: number;
  savedAt: number;
}

export interface DocSnapshot {
  update: Uint8Array;
  savedAt: number;
}

/**
 * Writes the full doc state plus the caller's dirty bookkeeping in one atomic put.
 * Chunks are `slice`d, never `subarray`ed: structured clone of a view serialises the
 * whole backing buffer, which would blow the per-value limit on every chunk.
 */
export const writeDocSnapshot = async (storage: SnapshotStorage, doc: Y.Doc, dirty: unknown) => {
  const update = Y.encodeStateAsUpdate(doc);
  const count = Math.ceil(update.byteLength / CHUNK_BYTES);
  if (count > MAX_CHUNKS) {
    throw new Error(`doc snapshot too large to store: ${update.byteLength} bytes`);
  }

  const entries: Record<string, unknown> = {
    [META_KEY]: { count, bytes: update.byteLength, savedAt: Date.now() } satisfies SnapshotMeta,
    [DIRTY_KEY]: dirty
  };
  for (let i = 0; i < count; i++) {
    entries[chunkKey(i)] = update.slice(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES);
  }

  const previous = await storage.get<SnapshotMeta>(META_KEY);
  await storage.put(entries);
  if (previous && previous.count > count) {
    await storage.delete(chunkKeys(count, previous.count));
  }
};

/**
 * Returns the stored doc state, or null when there is none, it is older than
 * `maxAgeMs` (so a room that missed a best-effort resync eventually re-reads the
 * DB), or its chunks are incomplete.
 */
export const readDocSnapshot = async (storage: SnapshotStorage, maxAgeMs: number): Promise<DocSnapshot | null> => {
  const meta = await storage.get<SnapshotMeta>(META_KEY);
  if (!meta || meta.count === 0) return null;
  if (Date.now() - meta.savedAt > maxAgeMs) return null;

  const keys = chunkKeys(0, meta.count);
  const chunks = await storage.get<Uint8Array>(keys);
  const update = new Uint8Array(meta.bytes);
  let offset = 0;
  for (const key of keys) {
    const chunk = chunks.get(key);
    if (!chunk || offset + chunk.byteLength > meta.bytes) return null;
    update.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (offset !== meta.bytes) return null;
  return { update, savedAt: meta.savedAt };
};

export const readDirtySet = <T>(storage: SnapshotStorage) => storage.get<T>(DIRTY_KEY);

export const writeDirtySet = (storage: SnapshotStorage, dirty: unknown) => storage.put({ [DIRTY_KEY]: dirty });
