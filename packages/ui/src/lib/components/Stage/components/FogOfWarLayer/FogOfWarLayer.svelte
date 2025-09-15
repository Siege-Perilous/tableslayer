<script lang="ts">
  import * as THREE from 'three';
  import { getContext } from 'svelte';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { ToolType } from '../DrawingLayer/types';
  import { type FogOfWarLayerProps } from './types';
  import type { Size } from '../../types';
  import type { Callbacks } from '../Stage/types';
  import LayerInput from '../LayerInput/LayerInput.svelte';
  import toolOutlineVertexShader from '../../shaders/default.vert?raw';
  import toolOutlineFragmentShader from '../../shaders/ToolOutline.frag?raw';
  import { SceneLayer } from '../Scene/types';
  import FogOfWarMaterial from './FogOfWarMaterial.svelte';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: FogOfWarLayerProps;
    isActive: boolean;
    mapSize: Size | null;
  }

  const { props, isActive, mapSize, ...meshProps }: Props = $props();

  const onFogUpdate = getContext<Callbacks>('callbacks').onFogUpdate;

  let mesh: THREE.Mesh = $state(new THREE.Mesh());
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

  // Add outline material
  const outlineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uStart: { value: new THREE.Vector2(Infinity, Infinity) },
      uEnd: { value: new THREE.Vector2(Infinity, Infinity) },
      uBrushSize: { value: props.tool.size },
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

  // Whenever the tool type changes, we need to reset the drawing state
  $effect(() => {
    if (!isActive) {
      lastPos = null;
      drawing = false;
      material?.revertChanges();
      outlineMaterial.visible = false;
    }
  });

  // Update outline material uniforms
  $effect(() => {
    if (!mapSize) return;

    outlineMaterial.visible = isActive;
    outlineMaterial.uniforms.uTextureSize.value = new THREE.Vector2(mapSize.width, mapSize.height);
    outlineMaterial.uniforms.uOutlineColor.value = new THREE.Color(props.outline.color);
    outlineMaterial.uniforms.uOutlineThickness.value = props.outline.thickness;
    outlineMaterial.uniforms.uOutlineOpacity.value = props.outline.opacity;
    outlineMaterial.uniforms.uShapeType.value = props.tool.type;
    outlineMaterial.uniforms.uBrushSize.value = props.tool.size;

    // When changing to a rectangle or ellipse, initially hide the outline
    if (props.tool.type === ToolType.Rectangle || props.tool.type === ToolType.Ellipse) {
      outlineMaterial.visible = false;
    }
  });

  function onMouseDown(e: Event, p: THREE.Vector2 | null) {
    e.preventDefault();
    lastPos = p;
    drawing = true;
    hasFinishedDrawing = false;

    draw(e, p);
  }

  function onMouseUp(_e: Event, p: THREE.Vector2 | null) {
    // If using shapes, draw the shape outline when the mouse button is released
    if (props.tool.type === ToolType.Ellipse || props.tool.type === ToolType.Rectangle) {
      if (p && drawing && lastPos) {
        material?.drawPath(p, lastPos, true);
        outlineMaterial.visible = false;
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
    lastPos = null;
    drawing = false;
    outlineMaterial.visible = false;
    material?.revertChanges();

    // Hide cursor when mouse leaves
    outlineMaterial.uniforms.uStart.value.set(Infinity, Infinity);
    outlineMaterial.uniforms.uEnd.value.set(Infinity, Infinity);
  }

  function draw(e: Event, p: THREE.Vector2 | null) {
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
        outlineMaterial.visible = true;
        material?.drawPath(p, lastPos);
      }
    } else {
      // For freehand tools, always show the cursor
      outlineMaterial.visible = true;

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

<T.Mesh name="fogOfWarToolOutline" layers={[SceneLayer.Overlay]}>
  <T is={outlineMaterial} transparent={true} opacity={0.0} depthTest={false} />
  <T.PlaneGeometry />
</T.Mesh>

<T.Mesh name="fogOfWar" {...meshProps} layers={[SceneLayer.Main]}>
  <FogOfWarMaterial bind:this={material} {props} {mapSize} />
  <T.PlaneGeometry />
</T.Mesh>
