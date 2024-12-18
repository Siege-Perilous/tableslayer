<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte, type Size } from '@threlte/core';
  import { DrawMode, ToolType, type FogOfWarLayerProps } from './types';
  import { getContext, onMount } from 'svelte';
  import { Tool, type DrawingTool } from './tools/types';
  import { textureToBase64 } from '../../helpers/utils';
  import InputManager from '../InputManager/InputManager.svelte';
  import type { Callbacks } from '../Stage/types';

  interface Props {
    props: FogOfWarLayerProps;
    isActive: boolean;
    mapSize: Size;
  }

  const { props, isActive, mapSize }: Props = $props();

  const onBrushSizeUpdated = getContext<Callbacks>('callbacks').onBrushSizeUpdated;
  const { mainStage, renderStage } = useThrelte();

  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;

  let mesh = $state(new THREE.Mesh());
  let fogMaterial = $state(new THREE.MeshBasicMaterial());
  let fogTexture: THREE.CanvasTexture;

  let drawing = false;
  let activeTool: DrawingTool;

  // If mouse leaves the drawing area, we need to reset the start position
  // when it re-enters the drawing area to prevent the drawing from "jumping"
  // to the new point
  let resetPos = false;

  onMount(() => {
    // Create a canvas element to draw on
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d')!;
  });

  $effect(() => {
    if (!canvas) return;

    // Dispose of the existing fog texture if there is one
    fogTexture?.dispose();

    if (props.data) {
      const image = new Image();
      image.src = props.data;
      image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        fogTexture = new THREE.CanvasTexture(canvas);
        fogMaterial.map = fogTexture;

        context.drawImage(image, 0, 0);
        fogTexture.needsUpdate = true;
      };
    } else if (mapSize.width > 0 && mapSize.height > 0) {
      // Otherwise, start with a blank canvas
      canvas.width = mapSize.width;
      canvas.height = mapSize.height;
      fogTexture = new THREE.CanvasTexture(canvas);
      fogMaterial.map = fogTexture;

      resetFog();
    }
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

  function onMouseDown(e: MouseEvent, p: THREE.Vector2 | null): void {
    if (!p) return;
    drawing = true;
    activeTool.origin = p;
  }

  function onMouseUp(e: MouseEvent, p: THREE.Vector2 | null): void {
    if (p) {
      if (props.drawMode === DrawMode.Erase) {
        configureClearMode();
      } else if (props.drawMode === DrawMode.Draw) {
        configureDrawMode();
      }
      activeTool.draw(p);
    }

    // Save off the image state
    fogTexture.needsUpdate = true;
    drawing = false;
  }

  function onMouseMove(e: MouseEvent, p: THREE.Vector2 | null): void {
    if (!activeTool) return;

    if (!p) {
      // Mouse is outside canvas, reset the start position
      resetPos = true;
      return;
    }

    // When using shapes, draw the shape outline while the mouse button is held down
    if (props.toolType === ToolType.Ellipse || props.toolType === ToolType.Rectangle) {
      // TODO
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
        fogTexture.needsUpdate = true;
      } else {
        activeTool.updateOverlay(e, p);
      }
    }
  }

  function onWheel(e: WheelEvent) {
    const newBrushSize = props.brushSize + e.deltaY;
    onBrushSizeUpdated(newBrushSize);
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

  /**
   * Clears all fog, revealing the entire map underneath
   */
  export function clearFog() {
    configureClearMode();
    context.clearRect(0, 0, canvas.width, canvas.height);
    fogTexture.needsUpdate = true;
  }

  /**
   * Resets the fog to fill the entire layer
   */
  export function resetFog() {
    configureDrawMode();
    context.fillRect(0, 0, canvas.width, canvas.height);
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

<InputManager {isActive} layerSize={mapSize} target={mesh} {onMouseDown} {onMouseMove} {onMouseUp} {onWheel} />

<T.Mesh bind:ref={mesh} name="FogOfWar">
  <T.MeshBasicMaterial bind:ref={fogMaterial} color={props.fogColor} opacity={props.opacity} transparent={true} />
  <T.PlaneGeometry />
</T.Mesh>
