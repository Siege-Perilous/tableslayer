<script lang="ts">
  import * as THREE from 'three';
  import { onDestroy, onMount } from 'svelte';
  import { type Size, useThrelte } from '@threlte/core';

  interface Props {
    isActive: boolean;
    target: THREE.Mesh;
    layerSize: Size;
    onmousedown?: (coords: THREE.Vector2 | null) => void;
    onmouseup?: (coords: THREE.Vector2 | null) => void;
    onmousemove?: (coords: THREE.Vector2 | null) => void;
    onwheel?: (coords: THREE.Vector2 | null) => void;
  }

  let { layerSize, isActive, target, onmousedown, onmousemove, onmouseup, onwheel }: Props = $props();

  const { camera, renderer, size } = useThrelte();

  let raycaster = new THREE.Raycaster();

  // Bind events to the renderer's canvas element
  onMount(() => {
    if (onmousedown) renderer.domElement.addEventListener('mousedown', handleMouseDown);
    if (onmouseup) renderer.domElement.addEventListener('mousemove', handleMouseMove);
    if (onmousemove) renderer.domElement.addEventListener('mouseup', handleMouseUp);
    if (onwheel) renderer.domElement.addEventListener('wheel', handleWheel);
  });

  // Cleanup method to remove event listeners
  onDestroy(() => {
    if (onmousedown) renderer.domElement.removeEventListener('mousedown', handleMouseDown);
    if (onmouseup) renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    if (onmousemove) renderer.domElement.removeEventListener('mouseup', handleMouseUp);
    if (onwheel) renderer.domElement.removeEventListener('wheel', handleWheel);
  });

  // Internal event handler methods
  function handleMouseDown(event: MouseEvent) {
    if (onmousedown && isActive) {
      onmousedown(mouseToCanvasCoords(event));
    }
  }

  function handleMouseUp(event: MouseEvent) {
    if (onmouseup && isActive) {
      onmouseup(mouseToCanvasCoords(event));
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (onmousemove && isActive) {
      onmousemove(mouseToCanvasCoords(event));
    }
  }

  function handleWheel(event: MouseEvent) {
    if (onwheel && isActive) {
      onwheel(mouseToCanvasCoords(event));
    }
  }

  function mouseToCanvasCoords(e: MouseEvent): THREE.Vector2 | null {
    const mouse = new THREE.Vector2((e.offsetX / $size.width) * 2 - 1, -(e.offsetY / $size.height) * 2 + 1);

    raycaster.setFromCamera(mouse, $camera);
    const intersects = raycaster.intersectObject(target);

    if (intersects.length > 0) {
      const { point } = intersects[0];
      const localPoint = target.worldToLocal(point);
      const canvasPoint = new THREE.Vector2(
        layerSize.width * (localPoint.x + 0.5),
        layerSize.height * (-localPoint.y + 0.5)
      );
      return canvasPoint;
    } else {
      return null;
    }
  }
</script>
