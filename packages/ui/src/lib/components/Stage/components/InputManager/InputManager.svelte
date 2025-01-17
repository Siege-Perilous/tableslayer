<script lang="ts">
  import * as THREE from 'three';
  import { onDestroy, onMount } from 'svelte';
  import { type Size, useThrelte } from '@threlte/core';

  interface Props {
    isActive: boolean;
    target?: THREE.Mesh;
    layerSize?: Size | null;
    onMouseDown?: (e: MouseEvent, coords: THREE.Vector2 | null) => void;
    onMouseUp?: (e: MouseEvent, coords: THREE.Vector2 | null) => void;
    onMouseMove?: (e: MouseEvent, coords: THREE.Vector2 | null) => void;
    onMouseLeave?: (e: MouseEvent, coords: THREE.Vector2 | null) => void;
    onWheel?: (e: WheelEvent) => void;
  }

  let { layerSize, isActive, target, onMouseDown, onMouseUp, onMouseMove, onMouseLeave, onWheel }: Props = $props();

  const { camera, renderer, size } = useThrelte();

  let raycaster = new THREE.Raycaster();

  // Bind events to the renderer's canvas element
  onMount(() => {
    if (onMouseDown) renderer.domElement.addEventListener('mousedown', handleMouseDown);
    if (onMouseUp) renderer.domElement.addEventListener('mousemove', handleMouseMove);
    if (onMouseMove) renderer.domElement.addEventListener('mouseup', handleMouseUp);
    if (onMouseLeave) renderer.domElement.addEventListener('mouseleave', handleMouseLeave);
    if (onWheel) renderer.domElement.addEventListener('wheel', handleWheel);
  });

  // Cleanup method to remove event listeners
  onDestroy(() => {
    if (onMouseDown) renderer.domElement.removeEventListener('mousedown', handleMouseDown);
    if (onMouseUp) renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    if (onMouseMove) renderer.domElement.removeEventListener('mouseup', handleMouseUp);
    if (onMouseLeave) renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
    if (onWheel) renderer.domElement.removeEventListener('wheel', handleWheel);
  });

  // Internal event handler methods
  function handleMouseDown(event: MouseEvent) {
    if (onMouseDown && isActive) {
      onMouseDown(event, mouseToCanvasCoords(event));
    }
  }

  function handleMouseUp(event: MouseEvent) {
    if (onMouseUp && isActive) {
      onMouseUp(event, mouseToCanvasCoords(event));
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (onMouseMove && isActive) {
      onMouseMove(event, mouseToCanvasCoords(event));
    }
  }

  function handleWheel(event: WheelEvent) {
    if (onWheel && isActive) {
      onWheel(event);
    }
  }

  function handleMouseLeave(event: MouseEvent) {
    if (onMouseLeave && isActive) {
      onMouseLeave(event, null);
    }
  }

  function mouseToCanvasCoords(e: MouseEvent): THREE.Vector2 | null {
    if (!target || !layerSize) return null;

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
