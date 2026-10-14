import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import {
  readDirtySet,
  readDocSnapshot,
  writeDirtySet,
  writeDocSnapshot,
  type SnapshotStorage
} from '../../partyserver/docSnapshot';

const MIB = 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;

// Mimics Durable Object storage: values are structured-cloned on put
const createStorage = () => {
  const map = new Map<string, unknown>();
  const storage: SnapshotStorage = {
    get: (async (keyOrKeys: string | string[]) => {
      if (Array.isArray(keyOrKeys)) {
        const result = new Map<string, unknown>();
        for (const key of keyOrKeys) if (map.has(key)) result.set(key, map.get(key));
        return result;
      }
      return map.get(keyOrKeys);
    }) as SnapshotStorage['get'],
    put: async (entries) => {
      for (const [key, value] of Object.entries(entries)) map.set(key, structuredClone(value));
    },
    delete: async (keys) => keys.filter((key) => map.delete(key)).length
  };
  return { storage, map };
};

const createDoc = (maskBytes = 16) => {
  const doc = new Y.Doc();
  const scene = new Y.Map<unknown>();
  doc.getMap('scenes').set('scene-1', scene);
  scene.set('name', 'Cave');
  scene.set('fogMask', new Uint8Array(maskBytes).fill(7));
  return doc;
};

const restore = (update: Uint8Array) => {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, update);
  return doc;
};

describe('docSnapshot', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips a doc with binary values and keeps item identity', async () => {
    const { storage } = createStorage();
    const doc = createDoc();
    await writeDocSnapshot(storage, doc, null);

    const snapshot = await readDocSnapshot(storage, DAY_MS);
    expect(snapshot).not.toBeNull();
    const restored = restore(snapshot!.update);
    const scene = restored.getMap('scenes').get('scene-1') as Y.Map<unknown>;
    expect(scene.get('name')).toBe('Cave');
    expect(scene.get('fogMask')).toEqual(new Uint8Array(16).fill(7));
    // Same state vector means the restored doc shares the original's item ids
    expect(Y.encodeStateVector(restored)).toEqual(Y.encodeStateVector(doc));
  });

  it('chunks large docs, bounds each stored value, and drops stale chunks on shrink', async () => {
    const { storage, map } = createStorage();
    await writeDocSnapshot(storage, createDoc(2.5 * MIB), null);

    expect(map.has('snap:0')).toBe(true);
    expect(map.has('snap:2')).toBe(true);
    expect(map.has('snap:3')).toBe(false);
    for (const key of ['snap:0', 'snap:1', 'snap:2']) {
      // A subarray would clone the whole backing buffer; each chunk must stand alone
      expect((map.get(key) as Uint8Array).buffer.byteLength).toBeLessThanOrEqual(MIB);
    }
    const large = await readDocSnapshot(storage, DAY_MS);
    const scene = restore(large!.update).getMap('scenes').get('scene-1') as Y.Map<unknown>;
    expect((scene.get('fogMask') as Uint8Array).byteLength).toBe(2.5 * MIB);

    await writeDocSnapshot(storage, createDoc(), null);
    expect(map.has('snap:0')).toBe(true);
    expect(map.has('snap:1')).toBe(false);
    expect(map.has('snap:2')).toBe(false);
  });

  it('ignores snapshots older than the max age', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T10:00:00Z'));
    const { storage } = createStorage();
    await writeDocSnapshot(storage, createDoc(), null);

    vi.setSystemTime(new Date('2026-10-14T09:00:00Z'));
    expect(await readDocSnapshot(storage, DAY_MS)).not.toBeNull();
    vi.setSystemTime(new Date('2026-10-14T11:00:00Z'));
    expect(await readDocSnapshot(storage, DAY_MS)).toBeNull();
  });

  it('treats a snapshot with a missing chunk as absent', async () => {
    const { storage, map } = createStorage();
    await writeDocSnapshot(storage, createDoc(2.5 * MIB), null);
    map.delete('snap:1');
    expect(await readDocSnapshot(storage, DAY_MS)).toBeNull();
  });

  it('returns null when nothing was stored', async () => {
    const { storage } = createStorage();
    expect(await readDocSnapshot(storage, DAY_MS)).toBeNull();
    expect(await readDirtySet(storage)).toBeUndefined();
  });

  it('stores the dirty set with the snapshot and lets it be rewritten alone', async () => {
    const { storage } = createStorage();
    const dirty = { scenes: [['scene-1', ['settings', 'fogMask']]], deleted: ['scene-9'] };
    await writeDocSnapshot(storage, createDoc(), dirty);
    expect(await readDirtySet(storage)).toEqual(dirty);

    await writeDirtySet(storage, { scenes: [], deleted: [] });
    expect(await readDirtySet(storage)).toEqual({ scenes: [], deleted: [] });
    expect(await readDocSnapshot(storage, DAY_MS)).not.toBeNull();
  });
});
