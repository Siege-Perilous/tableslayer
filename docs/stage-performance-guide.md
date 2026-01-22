# Stage Performance Guide

This document covers performance patterns, common pitfalls, and optimization techniques for the Stage component and Three.js rendering.

---

## Performance Debugging Tools

### Visual Overlay

Press **F9** anywhere on the Stage to toggle the performance overlay, which shows:

- Current FPS (color-coded: green ≥55, yellow ≥30, red <30)
- Average FPS over ~2 seconds
- 1% low FPS (slowest frames)
- Frame time graph
- Draw calls, triangles, textures, geometries
- Composer and overlay render times

### Console Logging

Enable via `stageProps.debug.logMetricsToConsole = true` to see periodic console output:

```
[Perf] FPS: 58.2 | Frame: 17.18ms | Draw calls: 42 | Triangles: 1156 | ...
```

### Implementation

The performance system uses timestamp-based FPS calculation because `performance.now()` has only 1ms precision due to Spectre mitigations. Per-frame timing is unreliable; instead, we store timestamps and calculate FPS from frame count over time windows.

Key files:

- `packages/ui/src/lib/components/Stage/helpers/performanceMetrics.svelte.ts`
- `packages/ui/src/lib/components/Stage/helpers/debugState.svelte.ts`
- `packages/ui/src/lib/components/Stage/components/PerformanceOverlay/`
- `packages/ui/src/lib/components/Stage/components/PerformanceDebugger/`

---

## GPU Memory Management

### The Problem

WebGL resources (textures, render targets, materials, geometries) must be explicitly disposed. JavaScript garbage collection does NOT free GPU memory. Undisposed resources cause:

- Memory leaks
- GPU pressure during heavy operations
- Frame drops during drawing/annotation operations

### Patterns

#### 1. Always dispose in `onDestroy`

```typescript
import { onDestroy } from 'svelte';

// Create resources
const renderTarget = new THREE.WebGLRenderTarget(width, height);
const material = new THREE.ShaderMaterial({ ... });

onDestroy(() => {
  renderTarget.dispose();
  material.dispose();
});
```

#### 2. Dispose before replacing

When updating a texture or material, dispose the old one first:

```typescript
$effect(() => {
  // Dispose old texture before creating new
  if (material.map) {
    material.map.dispose();
  }
  material.map = new THREE.CanvasTexture(canvas);
});
```

#### 3. Dispose temporary resources immediately

For textures created during operations (like RLE decoding), dispose after use:

```typescript
const texture = createTemporaryTexture();
render(texture);
texture.dispose(); // Don't wait for cleanup
```

### Common Leak Sources

| Component        | Resource          | Solution                              |
| ---------------- | ----------------- | ------------------------------------- |
| Render targets   | WebGLRenderTarget | `onDestroy` disposal                  |
| Canvas textures  | CanvasTexture     | Dispose before replacing, `onDestroy` |
| Shader materials | ShaderMaterial    | `onDestroy` disposal                  |
| Data textures    | DataTexture       | Dispose after use                     |
| EffectComposer   | Composer + passes | `onDestroy` disposal                  |

---

## Render Loop Optimization

### Conditional Post-Processing

Skip the EffectComposer when no effects are active:

```typescript
const hasActiveEffects = $derived(() => {
  const pp = props.postProcessing;
  if (!pp.enabled) return false;
  return pp.bloom.enabled || pp.chromaticAberration.enabled || pp.vignette.enabled || pp.lut.enabled;
});

// In render loop
if (hasActiveEffects()) {
  composer.render(dt);
} else {
  renderer.render(scene, camera.current);
}
```

This saves 5-15% frame time when post-processing is disabled.

### Avoid Unnecessary EffectComposer

Don't use EffectComposer with only RenderPass + CopyPass. Render directly:

```typescript
// BAD: EffectComposer with no actual effects
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new CopyPass()); // Just copying!
composer.render(dt);

// GOOD: Direct render
renderer.setRenderTarget(renderTarget);
renderer.clear();
renderer.render(scene, camera);
renderer.setRenderTarget(null);
```

This can save 10-20% frame time for affected layers.

---

## Event Listener Management

### The Problem

Event listeners registered in `$effect()` can accumulate when dependencies change, because new listeners are added without removing old ones.

### Solution

Return a cleanup function from `$effect()`:

```typescript
$effect(() => {
  if (!element) return;

  element.addEventListener('pointerdown', handler);
  element.addEventListener('pointermove', handler);

  // Cleanup function runs when effect re-runs or component unmounts
  return () => {
    element.removeEventListener('pointerdown', handler);
    element.removeEventListener('pointermove', handler);
  };
});
```

---

## Svelte Reactivity and Three.js

### Avoid Excessive Uniform Updates

Multiple `$effect()` blocks updating shader uniforms individually can cause overhead. Consider batching:

```typescript
// Less efficient: separate effects
$effect(() => {
  material.uniforms.uColor.value = color;
});
$effect(() => {
  material.uniforms.uSize.value = size;
});
$effect(() => {
  material.uniforms.uOpacity.value = opacity;
});

// More efficient: batched effect
$effect(() => {
  material.uniforms.uColor.value = color;
  material.uniforms.uSize.value = size;
  material.uniforms.uOpacity.value = opacity;
});
```

### Global State for Debug Settings

Debug settings that toggle features should use global state, not component props. Props get rebuilt on changes (like zooming), which resets local state:

```typescript
// debugState.svelte.ts
export const debugState = $state({
  enableMetrics: false,
  logMetricsToConsole: false
});

// Persists across prop rebuilds
```

---

## Performance Profiling Protocol

When investigating performance issues:

1. **Baseline**: Enable metrics overlay (Shift+P), note FPS with all features on
2. **Isolate**: Disable features one at a time to identify impact
3. **Profile**: Use browser DevTools Performance tab for CPU profiling
4. **GPU**: Watch `renderer.info.render.calls` and `renderer.info.memory` for GPU metrics
5. **Memory**: Check for leaks using DevTools Memory tab, look for growing texture/geometry counts

### Layer Isolation

The debug interface supports disabling layers via `debug.disabledLayers`. This can be wired up for A/B testing individual layers to identify performance bottlenecks.

---

## Future Optimization Opportunities

These patterns have been identified but not yet implemented:

1. **Texture atlasing** - Combine marker textures to reduce draw calls
2. **Instanced rendering** - For multiple similar markers
3. **LOD for complex shaders** - Reduce shader complexity at low zoom
4. **Render target pooling** - Reuse render targets instead of creating per-component
5. **Shader early exit** - Discard pixels outside bounds before expensive calculations
6. **Uniform batching** - Consolidate multiple `$effect()` blocks updating uniforms

---

## Key Lessons Learned

1. **`performance.now()` precision**: Browser timing APIs have 1ms precision due to Spectre mitigations. Use timestamp-based calculations for accurate FPS measurement.

2. **GPU memory is separate from JS memory**: Always explicitly dispose Three.js resources. The garbage collector won't help.

3. **EffectComposer overhead**: Only use when you have actual effects. Empty composers still cost frame time.

4. **Effect cleanup in Svelte**: Always return cleanup functions from `$effect()` when registering listeners or subscriptions.

5. **Global vs prop state**: Debug toggles should use global stores to persist across component rebuilds.
