<script lang="ts">
  import * as THREE from 'three';
  import { T, type Size } from '@threlte/core';
  import { DrawMode, ToolType, type FogOfWarLayerProps } from './types';
  import { onMount } from 'svelte';
  import { Tool, type DrawingTool } from './tools/types';
  import { textureToBase64 } from '../../helpers/utils';
  import LayerInput from '../LayerInput/LayerInput.svelte';

  interface Props {
    props: FogOfWarLayerProps;
    isActive: boolean;
    z: number;
    mapSize: Size;
  }

  let { props, isActive, z, mapSize }: Props = $props();

  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;
  let imageData: ImageData;

  let layerQuad: THREE.Mesh;
  let fogMaterial: THREE.MeshBasicMaterial;
  let fogTexture: THREE.CanvasTexture;

  let drawing: boolean = false;
  let activeTool: DrawingTool;

  // If mouse leaves the drawing area, we need to reset the start position
  // when it re-enters the drawing area to prevent the drawing from "jumping"
  // to the new point
  let resetPos = false;

  onMount(() => {
    // Create a canvas element to draw on
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d')!;

    if (props.data) {
      // If the props contains initial fog of war data, initialize the canvas to that data
      const image = new Image();
      image.src = props.data;
      image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0);
        imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      };
    } else if (canvas.width > 0 && canvas.height > 0) {
      // Otherwise, start with a blank canvas
      canvas.width = mapSize.width;
      canvas.height = mapSize.height;
      resetFog();
      imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    }
  });

  $effect(() => {
    if (!fogMaterial) return;
    fogTexture = new THREE.CanvasTexture(canvas);
    fogMaterial.map = fogTexture;
    fogMaterial.needsUpdate = true;
  });

  // Update the active tool when the tool type changes
  $effect(() => {
    switch (props.toolType) {
      case ToolType.RoundBrush:
        activeTool = new Tool.RoundBrush(props.brushSize, context);
        break;
      case ToolType.SquareBrush:
        activeTool = new Tool.SquareBrush(props.brushSize, context);
        break;
      case ToolType.Rectangle:
        activeTool = new Tool.Rectangle(context);
        break;
      case ToolType.Ellipse:
        activeTool = new Tool.Ellipse(context);
        break;
    }
  });

  function onMouseDown(p: THREE.Vector2 | null): void {
    if (!p) return;
    drawing = true;
    activeTool.origin = p;
  }

  function onMouseUp(p: THREE.Vector2 | null): void {
    if (p) {
      if (props.drawMode === DrawMode.Erase) {
        configureClearMode();
      } else if (props.drawMode === DrawMode.Draw) {
        configureDrawMode();
      }
      activeTool.draw(p);
    }

    // Save off the image state
    persistChanges();
    fogTexture.needsUpdate = true;
    drawing = false;
  }

  function onMouseMove(p: THREE.Vector2 | null): void {
    if (!activeTool) return;

    if (!p) {
      // Mouse is outside canvas, reset the start position
      resetPos = true;
      return;
    }

    // When using shapes, draw the shape outline while the mouse button is held down
    if (props.toolType === ToolType.Ellipse || props.toolType === ToolType.Rectangle) {
      if (drawing) {
        // Restore the previous draw state, effectively clearing the outline from the previous frame
        revertChanges();
        configureOutlineMode();
        activeTool.drawOutline(p);
      }
    } else {
      // Otherwise, we are using a brush. Paint with the brush when the mouse button is
      // held down and show the outline when the mouse button is up
      if (drawing) {
        // If mouse left the canvas area, reset the line start position
        if (resetPos) {
          resetPos = false;
          activeTool.origin = p;
        }

        if (props.drawMode === DrawMode.Erase) {
          configureClearMode();
        } else if (props.drawMode === DrawMode.Draw) {
          configureDrawMode();
        }

        activeTool.draw(p);
        persistChanges();
      } else {
        // Restore the previous draw state, effectively clearing the outline from the previous frame
        revertChanges();
        configureOutlineMode();
        activeTool.drawOutline(p);
      }
    }

    fogTexture.needsUpdate = true;
  }

  function configureDrawMode() {
    context.globalAlpha = 1.0;
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = 'white';
    context.strokeStyle = 'white';
  }

  function configureClearMode() {
    context.globalAlpha = 1.0;
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = 'black';
    context.strokeStyle = 'black';
  }

  function configureOutlineMode() {
    context.globalAlpha = 0.5;
    if (props.drawMode === DrawMode.Draw) {
      context.globalCompositeOperation = 'source-over';
      context.fillStyle = 'white';
      context.strokeStyle = 'white';
    } else {
      context.globalCompositeOperation = 'destination-out';
      context.fillStyle = 'white';
      context.strokeStyle = 'white';
    }
  }

  function persistChanges() {
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    }
  }

  function revertChanges() {
    context.putImageData(imageData, 0, 0);
  }

  /**
   * Clears all fog, revealing the entire map underneath
   */
  export function clearFog() {
    configureClearMode();
    context.clearRect(0, 0, canvas.width, canvas.height);
    persistChanges();
    fogTexture.needsUpdate = true;
  }

  /**
   * Resets the fog to fill the entire layer
   */
  export function resetFog() {
    configureDrawMode();
    context.fillRect(0, 0, canvas.width, canvas.height);
    persistChanges();
    fogTexture.needsUpdate = true;
  }

  /**
   * Serializes the fog of war image data into a base-64 string
   * @return A base-64 string
   */
  export function toBase64(): string {
    return textureToBase64(fogTexture);
  }
</script>

<LayerInput
  {isActive}
  layerSize={mapSize}
  {layerQuad}
  onmousedown={onMouseDown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
/>

<T.Mesh bind:ref={layerQuad} name="FogOfWar" position={[0, 0, z]}>
  <T.MeshBasicMaterial bind:ref={fogMaterial} color={props.fogColor} opacity={props.opacity} />
  <T.PlaneGeometry />
</T.Mesh>
