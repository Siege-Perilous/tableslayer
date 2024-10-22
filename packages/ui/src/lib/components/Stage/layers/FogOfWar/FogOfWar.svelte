<script lang="ts">
  import * as THREE from 'three';
  import { T, type Size, useThrelte } from '@threlte/core';
  import { BrushShape, DrawMode, ToolType, type FogOfWarProps } from './types';
  import { onMount } from 'svelte';

  let { props, imageSize }: { props: FogOfWarProps; imageSize: Size } = $props();

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
  let start: THREE.Vector2 = new THREE.Vector2();

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

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;

    // If texture already exists, dispose of existing one
    if (fogTexture) {
      fogTexture.dispose();
    }

    fogTexture = new THREE.CanvasTexture(canvas);
    fogMaterial.map = fogTexture;
    resetFog();

    if (canvas.width > 0 && canvas.height > 0) {
      imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    }
  });

  export const revealAll = () => {
    configureClearMode();
    context.clearRect(0, 0, canvas.width, canvas.height);
    fogTexture.needsUpdate = true;
  };

  export const resetFog = () => {
    configureDrawMode();
    context.fillRect(0, 0, canvas.width, canvas.height);
    fogTexture.needsUpdate = true;
  };

  function onMouseDown(e: MouseEvent): void {
    const p = getCanvasCoords(e);
    if (p) {
      // Get the initial position of the mouse when the user clicks/touches the canvas
      start.copy(p);
      drawing = true;
    }
  }

  function onMouseUp(e: MouseEvent): void {
    const p = getCanvasCoords(e);
    if (p) {
      // If drawing a 2D shape (e.g. rectangle/square), finish drawing on mouse up.
      if (props.toolType === ToolType.Rectangle) {
        drawRectangle(p);
      } else if (props.toolType === ToolType.Ellipse) {
        drawEllipse(p);
      }
    }
    drawing = false;
  }

  function onMouseMove(e: MouseEvent): void {
    const p = getCanvasCoords(e);
    if (!p) {
      // Mouse is outside canvas, reset the start position
      resetPos = true;
      return;
    }

    // If mouse left the canvas area, reset the line start position
    if (resetPos) {
      resetPos = false;
      start.copy(p);
    }

    // Restore the previous draw state, effectively clearing the outline
    // from the previous frame
    context.putImageData(imageData, 0, 0);

    if (props.toolType === ToolType.Brush) {
      if (drawing) {
        drawBrush(p);
      } else {
        drawBrushOutline(p);
      }
    }

    if (drawing) {
      if (props.toolType === ToolType.Rectangle) {
        drawRectangleOutline(p);
      } else if (props.toolType === ToolType.Ellipse) {
        drawEllipseOutline(p);
      }
    }
  }

  function drawBrush(p: THREE.Vector2): void {
    if (props.drawMode === DrawMode.Erase) {
      configureClearMode();
    } /* (props.drawMode === DrawMode.Draw) */ else {
      configureDrawMode();
    }

    if (props.brushShape === BrushShape.Round) {
      drawRoundBrush(p);
    } else if (props.brushShape === BrushShape.Square) {
      drawSquareBrush(p);
    }
  }

  function drawRoundBrush(p: THREE.Vector2) {
    context.lineWidth = props.brushSize;
    context.lineCap = 'round';

    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(p.x, p.y);
    context.stroke();
    context.closePath();

    // Update the start position to the current position so the next
    // line will start from the end of this line
    start.set(p.x, p.y);

    imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    fogTexture.needsUpdate = true;
  }

  function drawSquareBrush(p: THREE.Vector2) {
    context.fillRect(p.x - props.brushSize / 2, p.y - props.brushSize / 2, props.brushSize, props.brushSize);

    imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    fogTexture.needsUpdate = true;
  }

  function drawRectangle(end: THREE.Vector2) {
    if (props.drawMode === DrawMode.Erase) {
      configureClearMode();
    } /* (props.drawMode === DrawMode.Draw) */ else {
      configureDrawMode();
    }

    context.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);

    imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    fogTexture.needsUpdate = true;
  }

  function drawEllipse(end: THREE.Vector2) {
    if (props.drawMode === DrawMode.Erase) {
      configureClearMode();
    } /* (props.drawMode === DrawMode.Draw) */ else {
      configureDrawMode();
    }

    const rx = Math.abs(end.x - start.x);
    const ry = Math.abs(end.y - start.y);

    context.beginPath();
    context.ellipse(start.x, start.y, rx, ry, 0, 0, 2 * Math.PI);
    context.fill();

    imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    fogTexture.needsUpdate = true;
  }

  function drawBrushOutline(p: THREE.Vector2) {
    configureOutlineMode();

    if (props.brushShape === BrushShape.Square) {
      context.fillRect(p.x - props.brushSize / 2, p.y - props.brushSize / 2, props.brushSize, props.brushSize);
    } else {
      context.beginPath();
      context.ellipse(p.x, p.y, props.brushSize / 2, props.brushSize / 2, 0, 0, 2 * Math.PI);
      context.fill();
    }

    fogTexture.needsUpdate = true;
  }

  function drawRectangleOutline(p: THREE.Vector2) {
    configureOutlineMode();

    context.fillRect(start.x, start.y, p.x - start.x, p.y - start.y);

    fogTexture.needsUpdate = true;
  }

  function drawEllipseOutline(p: THREE.Vector2) {
    const rx = Math.abs(p.x - start.x);
    const ry = Math.abs(p.y - start.y);

    configureOutlineMode();

    context.beginPath();
    context.ellipse(start.x, start.y, rx, ry, 0, 0, 2 * Math.PI);
    context.fill();

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
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = props.drawMode === DrawMode.Draw ? 'white' : 'black';
    context.strokeStyle = props.drawMode === DrawMode.Draw ? 'white' : 'black';
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
</script>

<T.Mesh bind:ref={fogQuad} name="FogOfWar" position={[0, 0, 3]} rotation={[0, 0, 0]}>
  <T.MeshBasicMaterial bind:ref={fogMaterial} color={props.fogColor} opacity={props.opacity} transparent={true} />
  <T.PlaneGeometry />
</T.Mesh>
