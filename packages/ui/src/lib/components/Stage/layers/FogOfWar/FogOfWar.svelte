<script lang="ts">
  import * as THREE from 'three';
  import { T, type Size, useThrelte } from '@threlte/core';
  import type { FogOfWarProps } from './types';
  import { onMount } from 'svelte';

  let { props, imageSize }: { props: FogOfWarProps; imageSize: Size } = $props();

  const { camera, renderer, size } = useThrelte();

  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;
  let raycaster: THREE.Raycaster;
  let fogQuad = $state(new THREE.Mesh());
  let material: THREE.MeshBasicMaterial;
  let texture: THREE.CanvasTexture;

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

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;
    context.fillStyle = 'rgba(255, 255, 255, 255)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    texture = new THREE.CanvasTexture(canvas);
    material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    fogQuad.material = material;
  });

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
    if (drawing && texture) {
      context.lineWidth = 250;
      context.lineCap = 'round';

      context.globalCompositeOperation = 'destination-out';
      context.strokeStyle = '#000000';

      context.moveTo(drawStartPos.x, drawStartPos.y);
      context.lineTo(p.x, p.y);
      context.stroke();

      drawStartPos.set(p.x, p.y);

      texture.needsUpdate = true;
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
  <T.PlaneGeometry />
</T.Mesh>
