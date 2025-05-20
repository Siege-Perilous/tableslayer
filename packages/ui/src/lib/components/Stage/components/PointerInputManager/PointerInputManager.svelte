<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { StageProps } from '../Stage/types';

  interface Props {
    minZoom: number;
    maxZoom: number;
    zoomSensitivity: number;
    stageElement: HTMLDivElement;
    stageProps: StageProps;
    onMapPan: (dx: number, dy: number) => void;
    onMapRotate: (angle: number) => void;
    onMapZoom: (zoom: number) => void;
    onScenePan: (dx: number, dy: number) => void;
    onSceneRotate: (angle: number) => void;
    onSceneZoom: (zoom: number) => void;
  }

  // Props
  let {
    minZoom,
    maxZoom,
    zoomSensitivity,
    stageElement,
    stageProps,
    onMapPan,
    onMapRotate,
    onMapZoom,
    onScenePan,
    onSceneRotate,
    onSceneZoom
  }: Props = $props();

  // State for pointer tracking
  let pointerCache: PointerEvent[] = $state([]);
  let prevDiff = $state(-1);
  let prevAngle = $state(0);
  let isDragging = $state(false);

  $effect(() => {
    if (stageElement) {
      stageElement.addEventListener('pointerdown', onPointerDown as EventListener);
      stageElement.addEventListener('pointermove', onPointerMove as EventListener);
      stageElement.addEventListener('pointerup', onPointerUp as EventListener);
      stageElement.addEventListener('pointercancel', onPointerUp as EventListener);
      stageElement.addEventListener('pointerout', onPointerUp as EventListener);
      stageElement.addEventListener('pointerleave', onPointerUp as EventListener);
    }
  });

  onDestroy(() => {
    if (stageElement) {
      stageElement.removeEventListener('pointerdown', onPointerDown as EventListener);
      stageElement.removeEventListener('pointermove', onPointerMove as EventListener);
      stageElement.removeEventListener('pointerup', onPointerUp as EventListener);
      stageElement.removeEventListener('pointercancel', onPointerUp as EventListener);
      stageElement.removeEventListener('pointerout', onPointerUp as EventListener);
      stageElement.removeEventListener('pointerleave', onPointerUp as EventListener);
    }
  });

  // Event handlers
  function onPointerDown(e: PointerEvent) {
    console.log('pointer down', e);
    e.preventDefault();
    pointerCache.push(e);
    isDragging = true;
  }

  function onPointerMove(e: PointerEvent) {
    console.log('pointer move', e);
    if (!isDragging) return;

    // Find this event in the cache and update its record
    const index = pointerCache.findIndex((cachedEv) => cachedEv.pointerId === e.pointerId);
    if (index !== -1) {
      pointerCache[index] = e;
    }

    // Handle different pointer counts
    if (pointerCache.length === 1) {
      // Get rotation for both map and scene transformations
      const rotation = stageProps.scene.rotation;
      const radians = (Math.PI / 180) * rotation;

      // Calculate rotated movement vectors
      const rotatedMovementX = e.movementX * Math.cos(radians) + e.movementY * Math.sin(radians);
      const rotatedMovementY = -e.movementX * Math.sin(radians) + e.movementY * Math.cos(radians);

      if (e.shiftKey) {
        const movementFactor = 1 / stageProps.scene.zoom;
        onMapPan(rotatedMovementX * movementFactor, -rotatedMovementY * movementFactor);
      } else if (e.ctrlKey) {
        onScenePan(rotatedMovementX, -rotatedMovementY);
      } else if (e.pointerType === 'touch') {
        onScenePan(rotatedMovementX, -rotatedMovementY);
      }

      // Scene controls use two finger gestures
    } else if (pointerCache.length === 2) {
      // Two pointers - handle pinch and rotation
      const curDiff = Math.hypot(
        pointerCache[0].clientX - pointerCache[1].clientX,
        pointerCache[0].clientY - pointerCache[1].clientY
      );
      const zoomDelta = -(curDiff - prevDiff) * zoomSensitivity;

      // Calculate angle between pointers
      const curAngle = Math.atan2(
        pointerCache[1].clientY - pointerCache[0].clientY,
        pointerCache[1].clientX - pointerCache[0].clientX
      );
      const angleDelta = curAngle - prevAngle;

      if (prevDiff > 0) {
        onSceneZoom(Math.max(minZoom, Math.min(stageProps.scene.zoom - zoomDelta, maxZoom)));
        onSceneRotate(stageProps.scene.rotation + (angleDelta * 180) / Math.PI);
      }

      prevDiff = curDiff;
      prevAngle = curAngle;

      // Map controls use three finger gestures
    } else if (pointerCache.length === 3) {
      // Two pointers - handle pinch and rotation
      const curDiff = Math.hypot(
        pointerCache[0].clientX - pointerCache[2].clientX,
        pointerCache[0].clientY - pointerCache[2].clientY
      );
      const zoomDelta = -(curDiff - prevDiff) * zoomSensitivity;

      // Calculate angle between pointers
      const curAngle = Math.atan2(
        pointerCache[0].clientY - pointerCache[2].clientY,
        pointerCache[0].clientX - pointerCache[2].clientX
      );
      const angleDelta = curAngle - prevAngle;

      if (prevDiff > 0) {
        if (pointerCache.length === 2) {
          onSceneZoom(Math.max(minZoom, Math.min(stageProps.scene.zoom - zoomDelta, maxZoom)));
          onSceneRotate(stageProps.scene.rotation + (angleDelta * 180) / Math.PI);
        } else if (pointerCache.length === 3) {
          onMapZoom(Math.max(minZoom, Math.min(stageProps.map.zoom - zoomDelta, maxZoom)));
          onMapRotate(stageProps.map.rotation - (angleDelta * 180) / Math.PI);
        }
      }

      prevDiff = curDiff;
      prevAngle = curAngle;
    }
  }

  function onPointerUp(e: PointerEvent) {
    // Remove this pointer from the cache
    const index = pointerCache.findIndex((cachedEv) => cachedEv.pointerId === e.pointerId);
    if (index !== -1) {
      pointerCache.splice(index, 1);
    }

    // Reset state if no pointers are down
    if (pointerCache.length === 0) {
      isDragging = false;
      prevDiff = -1;
      prevAngle = 0;
    }
  }
</script>
