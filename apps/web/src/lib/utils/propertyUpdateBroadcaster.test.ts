import type { SessionDocClient } from '$lib/realtime';
import { createSessionWriter, getSceneSnapshot } from '$lib/realtime/docSchema';
import type { SceneSettings } from '$lib/realtime/types';
import type { StageProps } from '@tableslayer/stage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import {
  bindPropertyUpdatesToDoc,
  FLUSH_INTERVAL_MS,
  flushQueuedPropertyUpdates,
  queuePropertyUpdate,
  queueRawSettingsUpdate,
  unbindPropertyUpdates
} from './propertyUpdateBroadcaster';

const makeSettings = (id: string): SceneSettings =>
  ({
    id,
    gameSessionId: 'gs1',
    name: `Scene ${id}`,
    order: 1,
    mapRotation: 0,
    mapOffsetX: 0,
    mapOffsetY: 0,
    mapZoom: 1
  }) as SceneSettings;

// Just enough StageProps for convertPropsToSceneDetails; missing subtrees are skipped
const makeProps = (): StageProps =>
  ({
    map: { rotation: 0, offset: { x: 0, y: 0 }, zoom: 1 }
  }) as unknown as StageProps;

const makeClient = (doc: Y.Doc) => {
  const origin = { client: 'test' };
  const write = createSessionWriter(doc, origin);
  return {
    doc,
    origin,
    write,
    scene: (sceneId: string) => getSceneSnapshot(doc, sceneId)
  } as unknown as SessionDocClient;
};

const mapOffsetX = (doc: Y.Doc, sceneId: string) => getSceneSnapshot(doc, sceneId)?.settings.mapOffsetX;

describe('propertyUpdateBroadcaster flush throttle', () => {
  let doc: Y.Doc;
  let client: SessionDocClient;
  let props: StageProps;
  let updates: number;

  // The broadcaster's lastFlushAt is module state carried across tests, and
  // vi.useFakeTimers resets the clock to real time each test — so the advance
  // must grow per test to land every test past the previous one's lastFlushAt
  let epoch = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    epoch += 60_000;
    vi.advanceTimersByTime(epoch);
    doc = new Y.Doc();
    client = makeClient(doc);
    client.write.createScene(makeSettings('s1'));
    client.write.createScene(makeSettings('s2'));
    props = makeProps();
    updates = 0;
    doc.on('update', () => updates++);
    bindPropertyUpdatesToDoc(client, 's1');
  });

  afterEach(() => {
    unbindPropertyUpdates();
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('flushes the first update on the next microtask (leading edge)', async () => {
    queuePropertyUpdate(props, ['map', 'offset', 'x'], 10, 'control');
    queuePropertyUpdate(props, ['map', 'offset', 'y'], 20, 'control');
    expect(updates).toBe(0);

    await Promise.resolve();
    expect(updates).toBe(1);
    expect(mapOffsetX(doc, 's1')).toBe(10);
  });

  it('coalesces a burst into one trailing transaction carrying the latest values', async () => {
    queuePropertyUpdate(props, ['map', 'offset', 'x'], 1, 'control');
    await Promise.resolve(); // leading flush
    expect(updates).toBe(1);

    for (const x of [2, 3, 4, 5]) {
      queuePropertyUpdate(props, ['map', 'offset', 'x'], x, 'control');
    }
    await Promise.resolve();
    expect(updates).toBe(1); // still throttled

    vi.advanceTimersByTime(FLUSH_INTERVAL_MS);
    expect(updates).toBe(2);
    expect(mapOffsetX(doc, 's1')).toBe(5);
  });

  it('flushQueuedPropertyUpdates writes pending updates immediately', async () => {
    queuePropertyUpdate(props, ['map', 'offset', 'x'], 1, 'control');
    await Promise.resolve();
    queuePropertyUpdate(props, ['map', 'offset', 'x'], 42, 'control');
    expect(mapOffsetX(doc, 's1')).toBe(1);

    flushQueuedPropertyUpdates();
    expect(mapOffsetX(doc, 's1')).toBe(42);

    // The canceled trailing timer must not double-flush
    const flushed = updates;
    vi.advanceTimersByTime(100);
    expect(updates).toBe(flushed);
  });

  it('rebinding to another scene lands pending writes on the previous scene', async () => {
    queuePropertyUpdate(props, ['map', 'offset', 'x'], 1, 'control');
    await Promise.resolve();
    queuePropertyUpdate(props, ['map', 'offset', 'x'], 7, 'control');

    bindPropertyUpdatesToDoc(client, 's2');
    expect(mapOffsetX(doc, 's1')).toBe(7);
    expect(mapOffsetX(doc, 's2')).toBe(0);
  });

  it('unbinding flushes pending writes', async () => {
    queuePropertyUpdate(props, ['map', 'offset', 'x'], 1, 'control');
    await Promise.resolve();
    queuePropertyUpdate(props, ['map', 'offset', 'x'], 9, 'control');

    unbindPropertyUpdates();
    expect(mapOffsetX(doc, 's1')).toBe(9);
  });

  it('raw settings updates share the throttled transaction with property updates', async () => {
    queuePropertyUpdate(props, ['map', 'offset', 'x'], 3, 'control');
    queueRawSettingsUpdate({ mapCoordVersion: 1 });

    await Promise.resolve();
    expect(updates).toBe(1);
    const settings = getSceneSnapshot(doc, 's1')?.settings;
    expect(settings?.mapOffsetX).toBe(3);
    expect(settings?.mapCoordVersion).toBe(1);
  });
});
