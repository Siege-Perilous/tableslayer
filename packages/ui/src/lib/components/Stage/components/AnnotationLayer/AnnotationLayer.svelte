<script lang="ts">
  import * as THREE from 'three';
  import { getContext } from 'svelte';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { type AnnotationsLayerProps } from './types';
  import type { Size } from '../../types';
  import type { Callbacks, DisplayProps } from '../Stage/types';
  import LayerInput from '../LayerInput/LayerInput.svelte';
  import { SceneLayer } from '../Scene/types';
  import AnnotationMaterial from './AnnotationMaterial.svelte';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: AnnotationsLayerProps;
    isActive: boolean;
    display: DisplayProps;
    sceneZoom: number;
  }

  const { props, isActive, display, sceneZoom, ...meshProps }: Props = $props();

  const onAnnotationUpdate = getContext<Callbacks>('callbacks').onAnnotationUpdate;

  let mesh: THREE.Mesh = $state(new THREE.Mesh());
  let material: AnnotationMaterial | undefined = $state();
  let drawing = false;
  let size = $derived({ width: display.resolution.x, height: display.resolution.y });

  // If mouse leaves the drawing area, we need to reset the start position
  // when it re-enters the drawing area to prevent the drawing from "jumping"
  // to the new point
  let lastPos: THREE.Vector2 | null = null;

  // Whenever the tool type changes, we need to reset the drawing state
  $effect(() => {
    if (!isActive) {
      lastPos = null;
      drawing = false;
      material?.revertChanges();
    }
  });

  function onMouseDown(e: Event, p: THREE.Vector2 | null) {
    e.preventDefault();
    console.log('onMouseDown', p);
    lastPos = p;
    drawing = true;
    draw(e, p);
  }

  function onMouseUp(_e: Event, p: THREE.Vector2 | null) {
    onAnnotationUpdate(toPng());

    // Reset the drawing state
    lastPos = null;
    drawing = false;
  }

  function onMouseLeave() {
    lastPos = null;
    drawing = false;
    material?.revertChanges();
  }

  function draw(e: Event, p: THREE.Vector2 | null) {
    // If the mouse is not within the drawing area, do nothing
    if (!p) return;

    // If this is the first time the mouse has moved, set the last position to the current position
    if (!lastPos) {
      lastPos = p.clone();
    }
    console.log('draw', p, lastPos, drawing);
    material?.drawPath(p, lastPos, drawing);
    lastPos = p.clone();
  }

  /**
   * Clears all fog, revealing the entire map underneath
   */
  export function clear() {
    material?.clear();
    onAnnotationUpdate(toPng());
  }

  /**
   * Serializes the fog of war image data into a binary buffer
   * @return A binary buffer
   */
  export async function toPng(): Promise<Blob> {
    return (await material?.toPng()) ?? new Blob();
  }
</script>

<LayerInput
  id="annotation"
  {isActive}
  layerSize={size}
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
<T.Mesh bind:ref={mesh} name="annotationInput" layer={SceneLayer.Input}>
  <T.MeshBasicMaterial visible={false} />
  <T.PlaneGeometry args={[10 * display.resolution.x, 10 * display.resolution.y]} />
</T.Mesh>

<T.Mesh name="annotationLayer" scale={[display.resolution.x, display.resolution.y, 1]} {...meshProps}>
  {#each props.layers as layer}
    <T.Mesh name="annotation" {...meshProps} layers={[SceneLayer.Main]}>
      <AnnotationMaterial bind:this={material} props={layer} {display} {sceneZoom} />
      <T.PlaneGeometry />
    </T.Mesh>
  {/each}
</T.Mesh>
