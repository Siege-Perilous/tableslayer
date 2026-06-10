// Structural sharing for rebuilt render props: returns `next`, but with any
// subtree that is deep-equal to `prev` replaced by the `prev` reference. Svelte 5
// signals fire on referential change, so stage-internal effects (measurement
// reset, material updates, texture loads) stay quiet for parts that didn't
// actually change — only genuinely-changed subtrees re-render.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Uint8Array);

export const reuseUnchanged = <T>(prev: T, next: T): T => {
  if (prev === next) return next;
  if (Array.isArray(prev) && Array.isArray(next)) {
    let allReused = prev.length === next.length;
    const merged = next.map((item, index) => {
      const reused = index < prev.length ? reuseUnchanged(prev[index], item) : item;
      if (reused !== prev[index]) allReused = false;
      return reused;
    });
    return (allReused ? prev : merged) as T;
  }
  if (isPlainObject(prev) && isPlainObject(next)) {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    let allReused = prevKeys.length === nextKeys.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged: Record<string, any> = {};
    for (const key of nextKeys) {
      const reused = key in prev ? reuseUnchanged(prev[key], next[key]) : next[key];
      if (reused !== prev[key]) allReused = false;
      merged[key] = reused;
    }
    return (allReused ? prev : merged) as T;
  }
  return next;
};
