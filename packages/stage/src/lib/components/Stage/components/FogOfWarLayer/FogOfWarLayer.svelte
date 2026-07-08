<script lang="ts">
  import * as THREE from 'three';
  import { getContext, onDestroy } from 'svelte';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { ToolType } from '../DrawingLayer/types';
  import { type FogOfWarLayerProps } from './types';
  import type { Size } from '../../types';
  import { StageMode, type Callbacks, type DisplayProps } from '../Stage/types';
  import type { GridLayerProps } from '../GridLayer/types';
  import { getGridCellSize } from '../../helpers/grid';
  import { smallestRoomContaining, type FogRoom } from '../../helpers/fogRooms';
  import type { Point2 } from '../../helpers/mapSpace';
  import LayerInput from '../LayerInput/LayerInput.svelte';
  import toolOutlineVertexShader from '../../shaders/default.vert?raw';
  import toolOutlineFragmentShader from '../../shaders/ToolOutline.frag?raw';
  import fogRoomLineVertexShader from '../../shaders/FogRoomLine.vert?raw';
  import fogRoomLineFragmentShader from '../../shaders/FogRoomLine.frag?raw';
  import fogRoomDiscFragmentShader from '../../shaders/FogRoomDisc.frag?raw';
  import { SceneLayer } from '../Scene/types';
  import FogOfWarMaterial from './FogOfWarMaterial.svelte';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: FogOfWarLayerProps;
    isActive: boolean;
    mapSize: Size | null;
    grid: GridLayerProps;
    display: DisplayProps;
    mapZoom: number;
    sceneZoom: number;
  }

  const { props, isActive, mapSize, grid, display, mapZoom, sceneZoom, ...meshProps }: Props = $props();

  const callbacks = getContext<Callbacks>('callbacks');
  const onFogUpdate = callbacks.onFogUpdate;
  const stage = getContext<{ mode: StageMode }>('stage');

  // Convert tool.size (grid units, brush diameter) to fog texture pixels. The map
  // mesh is scaled mapSize * mapZoom in world units (1 world unit = 1 display
  // pixel), so one fog texture pixel covers mapZoom display pixels. The shaders
  // treat uBrushSize as a radius, so halve the diameter.
  const toolSizePixels = $derived.by(() => {
    const cellSizePixels = getGridCellSize(grid, display);
    return Math.max(1, Math.round((props.tool.size * cellSizePixels) / (2 * (mapZoom || 1))));
  });

  // Use $state.raw() for Three.js objects to prevent proxy interference with internal properties
  let mesh: THREE.Mesh = $state.raw(new THREE.Mesh());
  let outlineMesh: THREE.Mesh = $state.raw(new THREE.Mesh());
  let material: FogOfWarMaterial | undefined = $state();
  let drawing = false;
  let hasFinishedDrawing = false;

  // Export drawing state so parent can check it
  export function isDrawing() {
    return drawing;
  }

  // If mouse leaves the drawing area, we need to reset the start position
  // when it re-enters the drawing area to prevent the drawing from "jumping"
  // to the new point
  let lastPos: THREE.Vector2 | null = null;

  // In-progress polygon room, in normalized mask-UV coords (v up). Deliberately
  // survives isActive toggles so Shift/Ctrl pan gestures don't destroy the draft.
  const MAX_DRAFT_POINTS = 512;
  let draftPoints = $state<Point2[]>([]);
  let cursorUv: Point2 | null = $state(null);
  const isPolygonTool = $derived(props.tool.type === ToolType.Polygon);

  $effect(() => {
    if (!isPolygonTool) {
      draftPoints = [];
      cursorUv = null;
    }
  });

  // A map change (scene switch) invalidates the draft's coordinate space
  const mapSizeKey = $derived(mapSize ? `${mapSize.width}x${mapSize.height}` : '');
  $effect(() => {
    void mapSizeKey;
    draftPoints = [];
    cursorUv = null;
  });

  // Preview visuals for the polygon tool: the draft outline (with the cursor
  // acting as the provisional last vertex, so the shape always reads as one
  // closed polygon), vertex circles, and DM-only outlines of committed rooms.
  // All live on the Overlay layer in map-local coords (u - 0.5, v - 0.5), which
  // the parent mapLayer node scales to the map, so they track pan/zoom/rotation
  // in both grid modes for free. Lines are triangle ribbons because
  // LineBasicMaterial's linewidth is unsupported on most platforms; ribbon and
  // disc shaders feather their edges in screen space since the renderer runs
  // without MSAA. The vertex circles hide the unmitered segment joints.
  const ROOM_LINE_COLOR = '#ffec99'; // matches the UI's dark-theme --fgDanger
  // Constant ON-SCREEN thickness (TV-outline precedent): geometry is built in
  // texture px, so divide by the effective screen-px-per-texture-px (map zoom ×
  // workspace zoom). Zoomed out, the ribbon then still rasterizes wide enough
  // for the shader's fwidth() feathering — a fixed texture-px width would go
  // sub-pixel and alias at the geometry edges where no fragments exist.
  const ROOM_LINE_SCREEN_PX = 4;
  const screenPxPerTexturePx = $derived(Math.max(0.0001, (mapZoom || 1) * (sceneZoom || 1)));
  const lineThicknessPx = $derived(ROOM_LINE_SCREEN_PX / screenPxPerTexturePx);
  const vertexRadiusPx = $derived(lineThicknessPx * 2);
  const closeThresholdPx = $derived(vertexRadiusPx * 2.5);

  const makeRoomLineMaterial = (opacity: number) =>
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(ROOM_LINE_COLOR) },
        uOpacity: { value: opacity }
      },
      vertexShader: fogRoomLineVertexShader,
      fragmentShader: fogRoomLineFragmentShader,
      transparent: true,
      depthTest: false,
      side: THREE.DoubleSide
    });

  // Writes one ribbon segment (two triangles, 6 vertices) of thickness t
  // between normalized points a and b. The parent node's scale is non-uniform
  // (width vs height), so offsets are computed in texture pixels and converted
  // back to map-local units per component.
  const writeRibbonSegment = (
    positions: Float32Array,
    cross: Float32Array,
    vertexOffset: number,
    a: Point2,
    b: Point2,
    t: number,
    w: number,
    h: number
  ) => {
    const ax = a.x * w;
    const ay = a.y * h;
    const bx = b.x * w;
    const by = b.y * h;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * (t / 2);
    const ny = (dx / len) * (t / 2);
    const corners = [
      [ax + nx, ay + ny, 1],
      [bx + nx, by + ny, 1],
      [bx - nx, by - ny, -1],
      [ax + nx, ay + ny, 1],
      [bx - nx, by - ny, -1],
      [ax - nx, ay - ny, -1]
    ];
    for (let i = 0; i < 6; i++) {
      const base = (vertexOffset + i) * 3;
      positions[base] = corners[i][0] / w - 0.5;
      positions[base + 1] = corners[i][1] / h - 0.5;
      positions[base + 2] = 0;
      cross[vertexOffset + i] = corners[i][2];
    }
    return vertexOffset + 6;
  };

  const draftGeometry = new THREE.BufferGeometry();
  // +2 segments: the cursor edge and the auto-closing edge back to the first point
  draftGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array((MAX_DRAFT_POINTS + 2) * 6 * 3), 3)
  );
  draftGeometry.setAttribute('aCross', new THREE.BufferAttribute(new Float32Array((MAX_DRAFT_POINTS + 2) * 6), 1));
  const draftMaterial = makeRoomLineMaterial(0.9);
  const draftMesh = new THREE.Mesh(draftGeometry, draftMaterial);
  const vertexGeometry = new THREE.PlaneGeometry(2, 2);
  const vertexMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(ROOM_LINE_COLOR) },
      uOpacity: { value: 0.95 }
    },
    vertexShader: toolOutlineVertexShader,
    fragmentShader: fogRoomDiscFragmentShader,
    transparent: true,
    depthTest: false
  });
  const vertexGroup = new THREE.Group();
  const roomOutlineGroup = new THREE.Group();
  draftMesh.layers.set(SceneLayer.Overlay);
  draftMesh.frustumCulled = false;
  draftMesh.visible = false;

  $effect(() => {
    const pts = draftPoints;
    const cursor = cursorUv;
    const size = mapSize;
    const t = lineThicknessPx;
    // The cursor is the provisional last vertex, so the outline previews the
    // exact polygon a commit would produce
    const outline = cursor && pts.length >= 1 ? [...pts, cursor] : pts;
    if (outline.length < 2 || !size) {
      draftMesh.visible = false;
      return;
    }
    const position = draftGeometry.attributes.position as THREE.BufferAttribute;
    const crossAttr = draftGeometry.attributes.aCross as THREE.BufferAttribute;
    const positions = position.array as Float32Array;
    const cross = crossAttr.array as Float32Array;
    let vertexCount = 0;
    for (let i = 0; i < outline.length - 1; i++) {
      vertexCount = writeRibbonSegment(
        positions,
        cross,
        vertexCount,
        outline[i],
        outline[i + 1],
        t,
        size.width,
        size.height
      );
    }
    if (outline.length >= 3) {
      vertexCount = writeRibbonSegment(
        positions,
        cross,
        vertexCount,
        outline[outline.length - 1],
        outline[0],
        t,
        size.width,
        size.height
      );
    }
    position.needsUpdate = true;
    crossAttr.needsUpdate = true;
    draftGeometry.setDrawRange(0, vertexCount);
    draftMesh.visible = true;
  });

  // Vertex circles share one geometry/material, so clearing the group is enough
  $effect(() => {
    const pts = draftPoints;
    const size = mapSize;
    const r = vertexRadiusPx;
    vertexGroup.clear();
    if (!size) return;
    for (const pt of pts) {
      const marker = new THREE.Mesh(vertexGeometry, vertexMaterial);
      marker.position.set(pt.x - 0.5, pt.y - 0.5, 0);
      marker.scale.set(r / size.width, r / size.height, 1);
      marker.layers.set(SceneLayer.Overlay);
      marker.frustumCulled = false;
      vertexGroup.add(marker);
    }
  });

  // Serialized so remote stageProps root replacements with unchanged rooms
  // cannot rebuild the outline meshes (only the VALUE propagates)
  const roomsKey = $derived(JSON.stringify(props.rooms));

  const disposeRoomOutlines = () => {
    for (const child of roomOutlineGroup.children) {
      const mesh = child as THREE.Mesh;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    roomOutlineGroup.clear();
  };

  $effect(() => {
    const rooms: FogRoom[] = JSON.parse(roomsKey);
    const size = mapSize;
    const t = lineThicknessPx;
    disposeRoomOutlines();
    if (stage.mode !== StageMode.DM || !size) return;
    for (const room of rooms) {
      if (room.points.length < 3) continue;
      const positions = new Float32Array(room.points.length * 6 * 3);
      const cross = new Float32Array(room.points.length * 6);
      let vertexCount = 0;
      for (let i = 0; i < room.points.length; i++) {
        const a = room.points[i];
        const b = room.points[(i + 1) % room.points.length];
        vertexCount = writeRibbonSegment(positions, cross, vertexCount, a, b, t, size.width, size.height);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aCross', new THREE.BufferAttribute(cross, 1));
      const mesh = new THREE.Mesh(geometry, makeRoomLineMaterial(room.enabled ? 0.45 : 0.15));
      mesh.layers.set(SceneLayer.Overlay);
      mesh.frustumCulled = false;
      roomOutlineGroup.add(mesh);
    }
  });

  // Add outline material
  // Initial value will be updated by $effect below
  const outlineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uStart: { value: new THREE.Vector2(Infinity, Infinity) },
      uEnd: { value: new THREE.Vector2(Infinity, Infinity) },
      uBrushSize: { value: props.tool.size }, // Will be updated to pixels in $effect
      uTextureSize: { value: new THREE.Vector2(0, 0) },
      uShapeType: { value: props.tool.type },
      uOutlineColor: { value: new THREE.Color(props.outline.color) },
      uOutlineOpacity: { value: props.outline.opacity },
      uOutlineThickness: { value: props.outline.thickness }
    },
    vertexShader: toolOutlineVertexShader,
    fragmentShader: toolOutlineFragmentShader,
    transparent: true,
    depthTest: false
  });

  onDestroy(() => {
    clearLongPress();
    outlineMaterial.dispose();
    draftGeometry.dispose();
    draftMaterial.dispose();
    vertexGeometry.dispose();
    vertexMaterial.dispose();
    disposeRoomOutlines();
  });

  // Whenever the tool becomes inactive, reset the drawing state and hide outline
  $effect(() => {
    if (!isActive) {
      lastPos = null;
      drawing = false;
      cursorUv = null;
      clearLongPress();
      material?.revertChanges();
      outlineMesh.visible = false;
      // Reset cursor position so it doesn't appear at old location when reactivated
      outlineMaterial.uniforms.uStart.value.set(Infinity, Infinity);
      outlineMaterial.uniforms.uEnd.value.set(Infinity, Infinity);
    }
  });

  // Update outline material uniforms (but don't control visibility here - let draw() handle it)
  $effect(() => {
    if (!mapSize) return;

    // Use .set() to avoid allocating new objects
    outlineMaterial.uniforms.uTextureSize.value.set(mapSize.width, mapSize.height);
    outlineMaterial.uniforms.uOutlineColor.value.set(props.outline.color);
    outlineMaterial.uniforms.uOutlineThickness.value = props.outline.thickness;
    outlineMaterial.uniforms.uOutlineOpacity.value = props.outline.opacity;
    outlineMaterial.uniforms.uShapeType.value = props.tool.type;
    outlineMaterial.uniforms.uBrushSize.value = toolSizePixels;
  });

  function onMouseDown(e: Event, p: THREE.Vector2 | null) {
    e.preventDefault();

    // Polygon clicks only collect vertices; they never touch the mask or the
    // drawing flag, so mask commits and remote mask application are unaffected
    if (isPolygonTool) {
      addDraftPoint(e, p);
      return;
    }

    lastPos = p;
    drawing = true;
    hasFinishedDrawing = false;

    draw(e, p);
  }

  // Touch gestures: double-tap toggles a room and press-and-hold deletes one
  // (mouse equivalents: right-click / Shift+right-click). Both only act when
  // no draft is in progress; the tap that starts the gesture places a
  // provisional vertex, which gets rolled back.
  const LONG_PRESS_MS = 600;
  const DOUBLE_TAP_MS = 400;
  let lastTapTime = 0;
  let lastTapUv: Point2 | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  const clearLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const roomAt = (point: Point2) => smallestRoomContaining(props.rooms, point);

  const texturePxBetween = (a: Point2, b: Point2) =>
    mapSize ? Math.hypot((a.x - b.x) * mapSize.width, (a.y - b.y) * mapSize.height) : Infinity;

  function addDraftPoint(e: Event, p: THREE.Vector2 | null) {
    if (!p || !mapSize) return;
    // Shift/Ctrl-modified clicks are pan gestures, never vertices
    if (e instanceof MouseEvent && (e.button !== 0 || e.shiftKey || e.ctrlKey)) return;
    const point = { x: p.x / mapSize.width, y: p.y / mapSize.height };

    const isMouse = e instanceof MouseEvent;
    const now = performance.now();
    const isDouble = isMouse
      ? e.detail >= 2
      : lastTapUv !== null &&
        now - lastTapTime < DOUBLE_TAP_MS &&
        texturePxBetween(point, lastTapUv) <= closeThresholdPx;
    if (!isMouse) {
      lastTapTime = now;
      lastTapUv = point;
    }

    // Clicking the first vertex (or double-click / double-tap) closes the room
    if (draftPoints.length >= 3) {
      const first = draftPoints[0];
      if (texturePxBetween(point, first) <= closeThresholdPx || isDouble) {
        commitPolygon();
        return;
      }
    }

    // With no draft in progress, double-click / double-tap toggles the room
    // under the pointer (rolling back the first tap's stray vertex)
    if (isDouble && draftPoints.length <= 1) {
      draftPoints = [];
      const room = roomAt(point);
      if (room) callbacks.onFogRoomToggle?.(room.id);
      return;
    }

    if (draftPoints.length >= MAX_DRAFT_POINTS) return;
    const last = draftPoints[draftPoints.length - 1];
    // Ignore near-duplicate clicks (double-clicks, jitter) within ~3 texture px
    if (last && texturePxBetween(point, last) < 3) return;
    draftPoints = [...draftPoints, point];

    // Press-and-hold on touch deletes the room under the finger (armed only
    // when this tap started a fresh draft)
    clearLongPress();
    if (!isMouse && draftPoints.length === 1) {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        draftPoints = [];
        const room = roomAt(point);
        if (room) callbacks.onFogRoomDelete?.(room.id);
      }, LONG_PRESS_MS);
    }
  }

  function onContextMenu(e: Event, p: THREE.Vector2 | null) {
    // Room toggling works with any tool or layer active (DM only). Consumers
    // suppress the toggle when a marker context menu claims the same
    // right-click. Deleting stays scoped to the polygon tool.
    if (stage.mode !== StageMode.DM) return;
    e.preventDefault();
    if (!p || !mapSize) return;
    const room = smallestRoomContaining(props.rooms, { x: p.x / mapSize.width, y: p.y / mapSize.height });
    if (!room) return;
    if (isPolygonTool && e instanceof MouseEvent && e.shiftKey) callbacks.onFogRoomDelete?.(room.id);
    else callbacks.onFogRoomToggle?.(room.id);
  }

  function onMouseUp(_e: Event, p: THREE.Vector2 | null) {
    if (isPolygonTool) {
      clearLongPress();
      return;
    }

    // If using shapes, draw the shape outline when the mouse button is released
    if (props.tool.type === ToolType.Ellipse || props.tool.type === ToolType.Rectangle) {
      if (p && drawing && lastPos) {
        material?.drawPath(p, lastPos, true);
        outlineMesh.visible = false;
        hasFinishedDrawing = true;
      }
    }

    if (hasFinishedDrawing) {
      onFogUpdate(toPng());
    }

    // Reset the drawing state
    lastPos = null;
    drawing = false;
    hasFinishedDrawing = false;
  }

  function onMouseLeave() {
    if (isPolygonTool) {
      cursorUv = null;
      clearLongPress();
      return;
    }

    lastPos = null;
    drawing = false;
    outlineMesh.visible = false;
    material?.revertChanges();

    // Hide cursor when mouse leaves
    outlineMaterial.uniforms.uStart.value.set(Infinity, Infinity);
    outlineMaterial.uniforms.uEnd.value.set(Infinity, Infinity);
  }

  function draw(e: Event, p: THREE.Vector2 | null) {
    if (isPolygonTool) {
      // ToolOutline.frag has no polygon branch; the preview lines replace it
      outlineMesh.visible = false;
      cursorUv = p && mapSize ? { x: p.x / mapSize.width, y: p.y / mapSize.height } : null;
      // Moving past the tap slop turns a press-and-hold into a draw gesture
      if (longPressTimer && cursorUv && draftPoints.length === 1) {
        if (texturePxBetween(cursorUv, draftPoints[0]) > closeThresholdPx) clearLongPress();
      }
      return;
    }

    // If the mouse is not within the drawing area, do nothing
    if (!p) {
      // Move cursor off-screen when mouse is outside
      outlineMaterial.uniforms.uStart.value.set(Infinity, Infinity);
      outlineMaterial.uniforms.uEnd.value.set(Infinity, Infinity);
      return;
    }

    if (props.tool.type === ToolType.Ellipse || props.tool.type === ToolType.Rectangle) {
      // Shapes don't use lazy brush
      outlineMaterial.uniforms.uStart.value.copy(p);
      outlineMaterial.uniforms.uEnd.value.copy(lastPos ?? p);

      // When using shapes, draw the shape outline while the mouse button is held down
      if (drawing) {
        outlineMesh.visible = true;
        material?.drawPath(p, lastPos);
      }
    } else {
      // For freehand tools, always show the cursor
      outlineMesh.visible = true;

      // For freehand drawing
      if (drawing) {
        if (!lastPos) {
          lastPos = p.clone();
        }
        material?.drawPath(p, lastPos, true);
        hasFinishedDrawing = true;
        lastPos = p.clone();
      }

      // Always show cursor at current position
      outlineMaterial.uniforms.uStart.value.copy(p);
      outlineMaterial.uniforms.uEnd.value.copy(p);
    }
  }

  /**
   * Commits the in-progress polygon as a fog room (requires at least 3 points)
   */
  export function commitPolygon() {
    if (draftPoints.length < 3) return;
    callbacks.onFogRoomAdd?.(draftPoints.map((pt) => ({ x: pt.x, y: pt.y })));
    draftPoints = [];
    cursorUv = null;
    lastTapUv = null;
    clearLongPress();
  }

  /**
   * Discards the in-progress polygon
   */
  export function cancelPolygon() {
    draftPoints = [];
    cursorUv = null;
    lastTapUv = null;
    clearLongPress();
  }

  /**
   * Number of vertices in the in-progress polygon
   */
  export function polygonPointCount() {
    return draftPoints.length;
  }

  /**
   * Deletes the room under the cursor (keyboard-driven: Shift+right-click is
   * hijacked by Firefox's native-menu escape hatch, so Delete-while-hovering
   * is the reliable mouse path)
   */
  export function deleteRoomAtCursor() {
    if (!isPolygonTool || !cursorUv) return;
    const room = roomAt(cursorUv);
    if (room) callbacks.onFogRoomDelete?.(room.id);
  }

  /**
   * Clears all fog, revealing the entire map underneath
   */
  export function clearFog() {
    material?.clear();
    onFogUpdate(toPng());
  }

  /**
   * Resets the fog to fill the entire layer
   */
  export function resetFog() {
    material?.fill();
    onFogUpdate(toPng());
  }

  /**
   * Serializes the fog of war image data into a binary buffer
   * @return A binary buffer
   */
  export async function toPng(): Promise<Blob> {
    return (await material?.toPng()) ?? new Blob();
  }

  /**
   * Exports the fog of war state as RLE-encoded data
   * @returns RLE encoded Uint8Array
   */
  export async function toRLE(): Promise<Uint8Array> {
    return (await material?.toRLE()) ?? new Uint8Array();
  }

  /**
   * Loads RLE-encoded data into the fog of war
   * @param rleData RLE encoded data
   * @param width Image width
   * @param height Image height
   */
  export async function fromRLE(rleData: Uint8Array, width: number, height: number) {
    return material?.fromRLE(rleData, width, height);
  }
</script>

<LayerInput
  id="fogOfWar"
  {isActive}
  layerSize={mapSize}
  target={mesh}
  {onMouseDown}
  onMouseMove={draw}
  {onMouseUp}
  {onMouseLeave}
  {onContextMenu}
  isContextMenuActive={true}
/>

<!--
Invisible mesh used for input detection.
The plane geometry is larger than the map size to allow cursor
events to be detected outside of the fog of war layer.
-->
<T.Mesh bind:ref={mesh} name="fogOfWarInput" layer={SceneLayer.Input}>
  <T.MeshBasicMaterial visible={false} />
  <T.PlaneGeometry args={[10, 10]} />
</T.Mesh>

<T.Mesh bind:ref={outlineMesh} name="fogOfWarToolOutline" layers={[SceneLayer.Overlay]}>
  <T is={outlineMaterial} transparent={true} opacity={0.0} depthTest={false} />
  <T.PlaneGeometry />
</T.Mesh>

<T is={draftMesh} name="fogRoomDraft" />
<T is={vertexGroup} name="fogRoomVertices" />
<T is={roomOutlineGroup} name="fogRoomOutlines" />

<T.Mesh name="fogOfWar" {...meshProps} layers={[SceneLayer.Main]}>
  <FogOfWarMaterial bind:this={material} {props} {mapSize} {toolSizePixels} {draftPoints} />
  <T.PlaneGeometry />
</T.Mesh>
