<script lang="ts">
  import * as THREE from 'three';
  import { T, type Size, useThrelte } from '@threlte/core';
  import { DrawMode, ToolType, type FogOfWarProps } from './types';
  import { onMount } from 'svelte';
  import { Tool, type DrawingTool } from './tools/types';
  import type { StageFunctions } from '../Stage/types';
  import { textureToBase64 } from '../../helpers/utils';

  let {
    props,
    imageSize,
    functions
  }: {
    props: FogOfWarProps;
    imageSize: Size;
    functions: StageFunctions;
  } = $props();

  // Bind functions
  functions.fogOfWar = {
    resetFog,
    revealAll,
    toBase64
  };

  const { camera, renderer, size } = useThrelte();

  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;
  let imageData: ImageData;
  let raycaster: THREE.Raycaster;

  let fogQuad = $state(new THREE.Mesh());
  let fogMaterial = $state(new THREE.MeshBasicMaterial());
  let fogTexture: THREE.CanvasTexture;

  let mouse = new THREE.Vector2();
  let drawing: boolean = false;
  let activeTool: DrawingTool;

  // If mouse leaves the drawing area, we need to reset the start position
  // when it re-enters the drawing area to prevent the drawing from "jumping"
  // to the new point
  let resetPos = false;

  onMount(() => {
    raycaster = new THREE.Raycaster();

    // Event listeners for mouse interaction
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseenter', onMouseMove);

    // Create a canvas element to draw on
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d')!;
  });

  $effect(() => {
    console.log(`Resetting fog of war canvas to ${imageSize.width}x${imageSize.height}`);

    // If texture already exists, dispose of existing one
    if (fogTexture) {
      fogTexture.dispose();
    }

    fogTexture = new THREE.CanvasTexture(canvas);
    fogMaterial.map = fogTexture;

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
      canvas.width = imageSize.width;
      canvas.height = imageSize.height;
      resetFog();
      imageData = context.getImageData(0, 0, canvas.width, canvas.height);
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

  function onMouseDown(e: MouseEvent): void {
    const p = getCanvasCoords(e);
    if (p) {
      drawing = true;
      activeTool.origin = p;
    }
  }

  function onMouseUp(e: MouseEvent): void {
    const p = getCanvasCoords(e);

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

  function onMouseMove(e: MouseEvent): void {
    if (!activeTool) return;

    const p = getCanvasCoords(e);
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

  /**
   * Converts mouse coordinates into canvas coordinates. If mouse is not currently over
   * the fog of war layer, returns null
   * @param e
   */
  function getCanvasCoords(e: MouseEvent): THREE.Vector2 | null {
    mouse.x = (e.offsetX / $size.width) * 2 - 1;
    mouse.y = -(e.offsetY / $size.height) * 2 + 1;

    raycaster.setFromCamera(mouse, $camera);
    const intersects = raycaster.intersectObject(fogQuad);

    if (intersects.length > 0) {
      const { point } = intersects[0];
      const localPoint = fogQuad.worldToLocal(point);
      const canvasPoint = new THREE.Vector2(canvas.width * (localPoint.x + 0.5), canvas.height * (-localPoint.y + 0.5));
      return canvasPoint;
    } else {
      return null;
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
  function revealAll() {
    configureClearMode();
    context.clearRect(0, 0, canvas.width, canvas.height);
    persistChanges();
    fogTexture.needsUpdate = true;
  }

  /**
   * Resets the fog to fill the entire layer
   */
  function resetFog() {
    configureDrawMode();
    context.fillRect(0, 0, canvas.width, canvas.height);
    persistChanges();
    fogTexture.needsUpdate = true;
  }

  /**
   * Serializes the fog of war image data into a base-64 string
   * @return A base-64 string
   */
  function toBase64(): string {
    return textureToBase64(fogTexture);
  }
</script>

<T.Mesh bind:ref={fogQuad} name="FogOfWar" position={[0, 0, 3]} rotation={[0, 0, 0]}>
  <T.MeshBasicMaterial bind:ref={fogMaterial} color={props.fogColor} opacity={props.opacity} transparent={true} />
  <T.PlaneGeometry />
</T.Mesh>
