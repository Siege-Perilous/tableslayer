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
    onTouchStart?: (e: TouchEvent, coords: THREE.Vector2 | null) => void;
    onTouchMove?: (e: TouchEvent, coords: THREE.Vector2 | null) => void;
    onTouchEnd?: (e: TouchEvent, coords: THREE.Vector2 | null) => void;
  }

  let {
    layerSize,
    isActive,
    target,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseLeave,
    onWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  }: Props = $props();

  const { camera, renderer, size } = useThrelte();

  let raycaster = new THREE.Raycaster();

  // Bind events to the renderer's canvas element
  onMount(() => {
    if (onMouseDown) renderer.domElement.addEventListener('mousedown', handleMouseDown);
    if (onMouseUp) renderer.domElement.addEventListener('mousemove', handleMouseMove);
    if (onMouseMove) renderer.domElement.addEventListener('mouseup', handleMouseUp);
    if (onMouseLeave) renderer.domElement.addEventListener('mouseleave', handleMouseLeave);
    if (onWheel) renderer.domElement.addEventListener('wheel', handleWheel);
    if (onTouchStart) renderer.domElement.addEventListener('touchstart', handleTouchStart);
    if (onTouchMove) renderer.domElement.addEventListener('touchmove', handleTouchMove);
    if (onTouchEnd) renderer.domElement.addEventListener('touchend', handleTouchEnd);
  });

  // Cleanup method to remove event listeners
  onDestroy(() => {
    if (onMouseDown) renderer.domElement.removeEventListener('mousedown', handleMouseDown);
    if (onMouseUp) renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    if (onMouseMove) renderer.domElement.removeEventListener('mouseup', handleMouseUp);
    if (onMouseLeave) renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
    if (onWheel) renderer.domElement.removeEventListener('wheel', handleWheel);
    if (onTouchStart) renderer.domElement.removeEventListener('touchstart', handleTouchStart);
    if (onTouchMove) renderer.domElement.removeEventListener('touchmove', handleTouchMove);
    if (onTouchEnd) renderer.domElement.removeEventListener('touchend', handleTouchEnd);
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
  function handleTouchStart(event: TouchEvent) {
    if (onTouchStart && isActive) {
      const coords = touchToCanvasCoords(event.touches[0]);
      onTouchStart(event, coords);
    }
  }

  function handleTouchMove(event: TouchEvent) {
    if (onTouchMove && isActive) {
      const coords = touchToCanvasCoords(event.touches[0]);
      onTouchMove(event, coords);
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    if (onTouchEnd && isActive) {
      const coords = touchToCanvasCoords(event.changedTouches[0]);
      onTouchEnd(event, coords);
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

  function touchToCanvasCoords(touch: Touch): THREE.Vector2 | null {
    if (!target || !layerSize) return null;

    const rect = renderer.domElement.getBoundingClientRect();
    const touchPoint = new THREE.Vector2(
      ((touch.clientX - rect.left) / rect.width) * 2 - 1,
      -((touch.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(touchPoint, $camera);
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
