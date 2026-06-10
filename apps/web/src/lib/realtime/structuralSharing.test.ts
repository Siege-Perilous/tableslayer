import { describe, expect, it } from 'vitest';
import { reuseUnchanged } from './structuralSharing';

describe('reuseUnchanged', () => {
  it('returns prev references for deep-equal subtrees', () => {
    const prev = {
      display: { resolution: { x: 1920, y: 1080 }, padding: { x: 16, y: 16 } },
      map: { url: 'a.jpg', zoom: 1 },
      markers: [{ id: 'm1', position: { x: 1, y: 2 } }]
    };
    const next = structuredClone(prev);

    const merged = reuseUnchanged(prev, next);
    expect(merged).toBe(prev);
  });

  it('keeps unchanged siblings while replacing changed subtrees', () => {
    const prev = {
      display: { resolution: { x: 1920, y: 1080 } },
      map: { url: 'a.jpg', zoom: 1 },
      markers: [
        { id: 'm1', position: { x: 1, y: 2 } },
        { id: 'm2', position: { x: 3, y: 4 } }
      ]
    };
    const next = structuredClone(prev);
    next.map.zoom = 2;
    next.markers[1].position.x = 99;

    const merged = reuseUnchanged(prev, next);
    expect(merged).not.toBe(prev);
    expect(merged.display).toBe(prev.display); // untouched subtree keeps identity
    expect(merged.map).not.toBe(prev.map);
    expect(merged.map.zoom).toBe(2);
    expect(merged.markers[0]).toBe(prev.markers[0]); // unchanged marker reused
    expect(merged.markers[1]).not.toBe(prev.markers[1]);
    expect(merged.markers[1].position.x).toBe(99);
  });

  it('handles added and removed keys and array growth', () => {
    const prev = { a: { v: 1 }, b: { v: 2 }, list: [1, 2] };
    const next = { a: { v: 1 }, c: { v: 3 }, list: [1, 2, 3] } as unknown as typeof prev;

    const merged = reuseUnchanged(prev, next);
    expect(merged).not.toBe(prev);
    expect(merged.a).toBe(prev.a);
    expect((merged as Record<string, unknown>).c).toEqual({ v: 3 });
    expect((merged as Record<string, unknown>).b).toBeUndefined();
    expect(merged.list).toEqual([1, 2, 3]);
  });

  it('treats binary masks and nulls safely', () => {
    const prev = { mask: new Uint8Array([1, 2]), other: null };
    const nextSame = { mask: prev.mask, other: null };
    expect(reuseUnchanged(prev, nextSame)).toBe(prev);

    const nextChanged = { mask: new Uint8Array([1, 2, 3]), other: null };
    const merged = reuseUnchanged(prev, nextChanged);
    expect(merged.mask).toBe(nextChanged.mask); // binary compared by reference only
  });
});
