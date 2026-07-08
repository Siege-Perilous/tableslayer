---
name: stage-rendering
description: Architecture and gotchas for packages/stage — the Threlte/Three.js map renderer (layers, two-pass rendering, shaders, coordinate flips, performance tiers, disposal). Load whenever working in packages/stage, on shaders, or on the stage's consumers (apps/docs stage route, the web editor's Stage integration).
---

# @tableslayer/stage rendering architecture

> **Freshness**: last verified 2026-07-08 (Threlte 8.5, Three 0.185, postprocessing 6.39).
> Anchor files at the bottom — if one is missing/renamed, the code wins; update this skill.
> Deeper current docs: `docs/grid-system-architecture.md` (grid math), `docs/stage-performance-guide.md` (perf workflow).

## Big picture

- `Stage.svelte` (`packages/stage/src/lib/components/Stage/components/Stage/Stage.svelte`) is the public entry: creates a custom `WebGLRenderer` (`antialias: false` — everything is textured quads AA'd in-texture; MSAA would be wasted), renders `<Canvas renderMode="always">` (continuous loop — animated shaders/weather need it), and mounts `Scene.svelte`.
- `Scene.svelte` is the heart: single `T.OrthographicCamera`; **pan/zoom is applied to a wrapping `T.Object3D` (`props.scene.offset`/`zoom`), not the camera**. Inside it, a **`mapAnchor` node always carries the uniform map transform** (`position = map.offset`, `rotation = map.rotation`, `scale = map.zoom`); `MapLayer`'s inner node only scales the unit plane to the image size.
- **MapDefined anchoring**: grid/annotation/light/marker/measurement layers live in an `anchoredLayers` snippet mounted **inside `mapAnchor`** when `gridMode === MapDefined` (and `mapSize` is loaded) and at scene level in FillSpace. Anchored layers receive a **synthetic map-space `DisplayProps`** (`anchoredDisplay` via `getMapSpaceDisplay`: resolution = mapSize px, size = fixedGridCount × spacing "inches") so all their display-space math computes in map pixels unchanged, plus `localScale` (= map.zoom) to convert screen-px style values to local px. Marker/light positions are center-relative **map pixels** in MapDefined, display pixels in FillSpace; conversion contract lives in `helpers/mapSpace.ts` (THREE-free, exported — apps/web shares it).
- Two distinct "layer" enums in `Scene/types.ts` — do not confuse them:
  - `SceneLayerOrder` — Three.js `renderOrder` (Background 0 → Map 10 → Fog 20 → … → Grid 50 → … → TvViewport 95 → Cursor 100).
  - `SceneLayer` — Three.js camera-layer masks: `Main = 0` (gets postprocessing), `Overlay = 1` (grid/measurement/cursor — deliberately skips bloom/LUT), `Input = 2` (invisible raycast targets).
- **Two-pass render loop** (custom `useTask` in Scene.svelte; Threlte `autoRender` is disabled, `renderer.autoClear = false`): pass 1 renders `Main` through the `postprocessing` EffectComposer (Bloom, ChromaticAberration, Vignette, LUT3D, ToneMapping); pass 2 renders `Overlay` directly. If all effects are zero-strength (`getActiveEffects`), the composer is **bypassed entirely** — a key perf path. The composer is disposed and rebuilt whenever `props.postProcessing` changes.
- Offscreen targets: WeatherLayer renders particles into its own `WebGLRenderTarget`; `DrawingMaterial` (fog-of-war + annotation painting) uses **double-buffered ping-pong render targets**; `generateThumbnail` swaps a temp scene/camera into the composer and reads back via `OffscreenCanvas`.
- **Polygon fog rooms** (`props.fogOfWar.rooms`, `helpers/fogRooms.ts` — THREE-free, shared with apps/web): committed rooms + the in-progress draft are rasterized into a map-sized `CanvasTexture` in `FogOfWarMaterial` — enabled rooms in the GREEN channel, toggled-off rooms in RED — and composited in `Fog.frag` as `max(enabled, base * (1 - disabled))`: erase strokes never cut into enabled rooms, a toggled-off room actively reveals its interior through the base mask, and an enclosing enabled room still wins (nesting). Room points are normalized [0-1] mask-UV (v up; canvas draws at `(1-v)*h`, CanvasTexture flipY un-flips). Data out via `Callbacks.onFogRoomAdd/onFogRoomToggle/onFogRoomDelete` (hit-tests pick the smallest containing room, enabled or not); commit via Enter (consumer's job through `StageExports.fogOfWar.commitPolygon/cancelPolygon/polygonPointCount`), double-click/double-tap, or clicking the first vertex. Toggle = right-click with ANY tool/layer active in DM mode (`LayerInput.isContextMenuActive` bypasses the isActive gate; consumers defer the toggle one tick so a marker context menu from the same right-click wins) or double-tap (polygon tool, empty draft); delete = Delete/Backspace while hovering (`deleteRoomAtCursor`) or touch press-and-hold (Shift+right-click also works, but Firefox forces its native menu on Shift+right-click regardless of preventDefault — never make that the only path). stageKeyCommands' Shift-deselect exempts the polygon tool (it ignores Shift/Ctrl-modified clicks itself). Preview/outlines are triangle ribbons + disc vertices (`FogRoomLine/Disc` shaders, fwidth-feathered — LineBasicMaterial linewidth is unsupported) built at constant ON-SCREEN thickness by dividing by `mapZoom * sceneZoom` (a fixed texture-px width goes sub-pixel and aliases when zoomed out); the cursor acts as the provisional last vertex so the draft always reads as a closed polygon. The draft deliberately survives `isActive` toggles (Shift/Ctrl pan) and resets on tool/map change.

## Props and control flow

- One flat `StageProps` object (`Stage/components/Stage/types.ts`) with a sub-object per layer, passed down whole; layers take their slice.
- **The stage never mutates props.** Data flows out through the `Callbacks` interface (`onSceneUpdate`, `onFogUpdate`, marker/light/measurement callbacks), provided via `setContext('callbacks', …)`; the parent writes new values back into its `$state` stageProps. Pan/zoom round-trips through this loop.
- Imperative API: `StageExports` — parent does `bind:this={stage}` and calls e.g. `stage.fogOfWar.toRLE()`. These delegate Stage → Scene → layer → material with `?.` at every hop.
- `stageContext` (context `'stage'`) carries reactive `mode`, `performanceTier`, hovered/pinned marker ids.
- Input (pan/zoom/rotate gestures, wheel, keyboard) is the **parent's** job via the exported `PointerInputManager` — Stage itself doesn't bind wheel/keys.

## Shaders

- GLSL lives in `packages/stage/src/lib/components/Stage/shaders/*.frag|.vert`, imported as strings with Vite `?raw`. Exception: the light shader is inline TS (`LightLayer/lightShader.ts`, uses `#include <clipping_planes_*>`). `AnnotationEffects.frag` is the 1400-line monster (Fire/Water/Magic/etc. effects).
- Uniform idiom: create uniforms once at material construction; update in `$effect` with **in-place mutation** (`uniforms.uColor.value.set(...)`, `.copy(...)`) — never allocate new objects per frame. Time-driven uniforms advance in `useTask((delta) => { uniforms.uTime.value += delta })`. Dispose materials in `onDestroy`.
- The JS grid-snapping math in `helpers/grid.ts` is a **hand-ported mirror of the shader's `getHex`** (and compensates for the shader's `lineThickness/4.0` visual offset). If you change `GridShader.frag` grid math, change `helpers/grid.ts` to match, and vice versa.

## Gotchas (the expensive ones)

- **`$state.raw()` for Three objects** (`$state.raw(new THREE.Mesh())`) — Svelte 5 proxies break Three's internals. Recurring pattern in FogOfWarLayer, WeatherLayer.
- **Y-flips everywhere**: render-target readback is vertically flipped — `toPng` un-flips via canvas transform; `toRLE`/`fromRLE` flip rows manually (`height-1-y`) and pack **alpha channel only**. NDC→pixel conversions flip y (`-v.y*0.5+0.5`). The weather particle camera is intentionally upside-down (`rotation.x = Math.PI`).
- **Brush sizes are in grid units**, converted to texture pixels via `getGridCellSize` (fog additionally divides by map zoom; annotation uses the synthetic map-space display in MapDefined — the two formulas agree under the locked zoom), then **halved** (shaders treat `uBrushSize` as a radius).
- **Resize must happen in the render task, not `$effect`** — `needsResize` flag pattern in Scene.svelte; the size-mismatch check doesn't work in effects.
- **Effects must key off prop VALUES, not sub-object identity.** apps/web replaces the whole stageProps ROOT on every remote doc change — structural sharing preserves identity for unchanged subtrees, but any effect whose dependency chain reaches the root signal still re-fires per received update. Template-expression props (`strokeColor={props.marker.shape.strokeColor}`) carry the root in their chain, so a child effect reading such a prop directly re-runs per remote pan step even though the value never changed. Only `$derived` cuts the chain (it re-propagates only when its VALUE changes). Three past incidents: setSize + autoFit refit per update (Scene.svelte `resizedForMapUrl` guard), full EffectComposer rebuild per update (`lastPostProcessingKey` guard), and per-marker canvas redraw + gaussian shadow blur + texture upload per update (~30ms/marker; MarkerToken routes every style prop through `$derived`). When adding an expensive effect, route each input through `$derived` or a last-value comparison.
- DPR is capped by `props.display.maxPixelRatio` (default 2) for weak GPUs.
- **Performance tiers**: `PerformanceTier = 'high'|'medium'|'low'` with the knob table `PERFORMANCE_TIER_SETTINGS` in `Stage/components/Stage/types.ts` (fog layer count/octave cap, weather resolution+particle scale, `forcePostProcessingOff` on low). The consumer picks the tier — Stage never auto-detects. Shaders also receive `uPerformanceTier`. Tier changes apply live.
- **Clipping planes**: two stores in `helpers/clippingPlaneStore.svelte.ts` — display bounds (on the renderer) vs map bounds (on weather/light materials so effects stop at map edges). `generateThumbnail` temporarily clears them. In **DM + MapDefined** the display-bounds store is "disabled" (planes pushed to 1e9, keeping the 4-plane shape `AnnotationEffects.frag` bakes in) so the whole map is visible; `TvViewportLayer` draws the playfield rectangle + dim mask instead. Player mode keeps clipping.
- **MapDefined grid cells are always square**: the quad IS the map; the synthetic map-space display has uniform pixel pitch, so `gridSpacing = uSpacing_in/pixelPitch` yields the per-axis-average square cell and the grid is centered on the map (count/aspect mismatch = edge misfit, not rectangles). Mirrored in `helpers/grid.ts` (`getGridOrigin` centers; `snapToGrid` takes an optional `localScale` for the `t/4` offset compensation). The count describes the map image (X along the image's width, like the `name_WxH` filename convention) and is invariant under rotation. Grid lines are analytically AA'd inside `squareGrid`/`hexGrid` via `fwidth()` with the half-width floored at one device pixel — sub-pixel hard bands alias into patchy moiré/phase-dependent brightness.
- **Legacy annotation conversion**: persisted RLE masks embed 8-byte width/height; in MapDefined, a mask at the real display resolution is legacy display-space data and gets GPU re-projected into the map-sized texture (`helpers/annotationSpaceConversion.ts` + `AnnotationMaterial`'s `conversion` prop), then persisted once via the normal `onAnnotationUpdate` flow.
- `scene.fit()` in DM + MapDefined frames the map ∪ TV rect (5% margin) instead of the display bounds; `getMarkerScreenPosition`/`getMarkerSizeInScreenSpace` apply the map transform in MapDefined.
- MapLayer disposes the old data source and `material.map` before loading a new one; video URLs keep query params (cache-busting) while image URLs strip them. Data sources are pluggable (`MapLayer/dataSources/` — Image, Video, Gif — each with `.dispose()`).
- Touch input debounces 50ms to disambiguate draw vs pinch-zoom (`LayerInput.svelte`).
- Annotation layers with visual effects render on `SceneLayer.Main` (get postprocessing); plain-color layers render on `Overlay`.

## Dev / verify workflow

```bash
pnpm --filter @tableslayer/stage dev   # svelte-package --watch
pnpm --filter docs dev                 # then open the /stage route
```

The docs stage page (`apps/docs/src/routes/(components)/stage/+page.svelte` + `defaults.ts`) is the full-featured playground: tweakpane control panels per layer, keyboard shortcuts to switch active layer, test maps under its `components/maps/`. **F9** toggles the performance overlay (`PerformanceDebugger`). Adding a new StageProp means adding a tweakpane control there to exercise it.

## Anchor files (freshness check)

- `packages/stage/src/lib/components/Stage/components/Stage/Stage.svelte` — entry/renderer
- `packages/stage/src/lib/components/Stage/components/Scene/Scene.svelte` — render loop, composer
- `packages/stage/src/lib/components/Stage/components/Scene/types.ts` — SceneLayer/SceneLayerOrder
- `packages/stage/src/lib/components/Stage/components/Stage/types.ts` — StageProps/Callbacks/StageExports/perf tiers
- `packages/stage/src/lib/components/Stage/components/DrawingLayer/DrawingMaterial.svelte` — ping-pong RTT, RLE
- `packages/stage/src/lib/components/Stage/helpers/grid.ts` — shader-mirrored grid math
- `packages/stage/src/lib/components/Stage/helpers/mapSpace.ts` — display↔map coordinate contract, locked zoom, aligned transform (shared with apps/web)
- `packages/stage/src/lib/components/Stage/shaders/` — GLSL
- `apps/docs/src/routes/(components)/stage/+page.svelte` — playground consumer

## Keeping this skill current

If this document contradicts the code, trust the code and update this file in the same PR. Changes to layer ordering, the render loop, perf tiers, or the props/callback contract must be reflected here.
