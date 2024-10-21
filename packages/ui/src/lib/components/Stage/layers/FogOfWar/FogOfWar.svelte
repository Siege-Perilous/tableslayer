<script lang="ts">
  import * as THREE from 'three';
  import { T, type Size, useThrelte } from '@threlte/core';
  import { BrushType, DrawMode, type FogOfWarProps } from './types';
  import { onMount } from 'svelte';

  let { props, imageSize }: { props: FogOfWarProps; imageSize: Size } = $props();

  const { camera, renderer, size } = useThrelte();

  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;
  let raycaster: THREE.Raycaster;

  let fogQuad = $state(new THREE.Mesh());
  let fogMaterial = $state(new THREE.MeshBasicMaterial());
  let fogTexture: THREE.CanvasTexture;

  let mouse = new THREE.Vector2();
  let drawing: boolean = false;
  let drawStartPos: THREE.Vector2 = new THREE.Vector2();
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
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // If texture already exists, dispose of existing one
    if (fogTexture) {
      fogTexture.dispose();
    }

    fogTexture = new THREE.CanvasTexture(canvas);
    fogMaterial.map = fogTexture;
  });

  export const revealAll = () => {
    console.log('reveal all');
    context.clearRect(0, 0, canvas.width, canvas.height);
    fogTexture.needsUpdate = true;
  };

  export const resetFog = () => {
    console.log('reset fog');
    context.fillStyle = 'white';
    context.globalCompositeOperation = 'source-over';
    context.fillRect(0, 0, canvas.width, canvas.height);
    fogTexture.needsUpdate = true;
  };

  function onMouseDown(e: MouseEvent): void {
    const coords = getCanvasCoords(e);
    if (coords) {
      drawStartPos.copy(coords);
      drawing = true;
    }
  }

  function onMouseUp(): void {
    drawing = false;
  }

  function onMouseMove(e: MouseEvent): void {
    const coords = getCanvasCoords(e);
    if (coords) {
      if (resetPos) {
        resetPos = false;
        drawStartPos.copy(coords);
      }
      draw(coords);
    } else {
      // If mouse leaves the drawing area, we need to reset the start position
      // when it re-enters the drawing area to prevent the drawing from "jumping"
      // to the new point
      resetPos = true;
    }
  }

  function draw(p: THREE.Vector2): void {
    if (drawing && fogTexture) {
      if (props.drawMode === DrawMode.Brush || props.drawMode === DrawMode.Eraser) {
        if (props.brushType === BrushType.Round) {
          drawRoundBrush(p);
        } else if (props.brushType === BrushType.Square) {
          drawSquareBrush(p);
        }
      } else {
      }

      drawStartPos.set(p.x, p.y);
      fogTexture.needsUpdate = true;
    }
  }

  function drawRoundBrush(p: THREE.Vector2) {
    context.lineWidth = props.brushSize;
    context.lineCap = 'round';

    if (props.drawMode === DrawMode.Eraser) {
      context.globalCompositeOperation = 'destination-out';
      context.strokeStyle = 'black';
    } else {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = props.fogColor;
    }

    context.beginPath();
    context.moveTo(drawStartPos.x, drawStartPos.y);
    context.lineTo(p.x, p.y);
    context.stroke();
    context.closePath();
  }

  function drawSquareBrush(p: THREE.Vector2) {
    if (props.drawMode === DrawMode.Brush) {
      context.fillStyle = props.fogColor;
      context.fillRect(p.x - props.brushSize / 2, p.y - props.brushSize / 2, props.brushSize, props.brushSize);
    } else if (props.drawMode === DrawMode.Eraser) {
      context.clearRect(p.x - props.brushSize / 2, p.y - props.brushSize / 2, props.brushSize, props.brushSize);
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
</script>

<T.Mesh bind:ref={fogQuad} name="FogOfWar" position={[0, 0, 3]} rotation={[0, 0, 0]}>
  <T.MeshBasicMaterial bind:ref={fogMaterial} color={props.fogColor} opacity={props.opacity} transparent={true} />
  <T.PlaneGeometry />
</T.Mesh>
