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
  let lastPointerCount = $state(0);

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
    pointerCache.push(e);
    isDragging = true;
  }

  // Helper functions for pointer calculations
  function calculateRotatedMovement(e: PointerEvent, rotation: number) {
    const radians = (Math.PI / 180) * rotation;
    return {
      dx: e.movementX * Math.cos(radians) + e.movementY * Math.sin(radians),
      dy: -1 * (-e.movementX * Math.sin(radians) + e.movementY * Math.cos(radians))
    };
  }

  function calculatePinchAndRotation(pointers: PointerEvent[]) {
    const [p1, p2] = pointers;
    const curDiff = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
    const zoomDelta = -(curDiff - prevDiff) * zoomSensitivity;

    const curAngle = Math.atan2(p2.clientY - p1.clientY, p2.clientX - p1.clientX);
    let angleDelta = curAngle - prevAngle;

    // Normalize angle delta to handle wrapping around ±π boundary
    if (angleDelta > Math.PI) {
      angleDelta -= 2 * Math.PI;
    } else if (angleDelta < -Math.PI) {
      angleDelta += 2 * Math.PI;
    }

    return { curDiff, zoomDelta, curAngle, angleDelta };
  }

  function handleSinglePointer(e: PointerEvent) {
    const { dx, dy } = calculateRotatedMovement(e, stageProps.scene.rotation);

    if (e.shiftKey) {
      const movementFactor = 1 / stageProps.scene.zoom;
      onMapPan(dx * movementFactor, dy * movementFactor);
    } else if (e.ctrlKey) {
      onScenePan(dx, dy);
    }
  }

  function handleMultiPointer(pointers: PointerEvent[], isMapControl: boolean) {
    const { dx, dy } = calculateRotatedMovement(pointers[0], stageProps.scene.rotation);
    const { curDiff, zoomDelta, curAngle, angleDelta } = calculatePinchAndRotation(pointers);

    if (prevDiff > 0) {
      if (isMapControl) {
        onMapPan(dx, dy);
        onMapZoom(Math.max(minZoom, Math.min(stageProps.map.zoom - zoomDelta, maxZoom)));
        onMapRotate(stageProps.map.rotation - (angleDelta * 180) / Math.PI);
      } else {
        onScenePan(dx, dy);
        onSceneZoom(Math.max(minZoom, Math.min(stageProps.scene.zoom - zoomDelta, maxZoom)));
        onSceneRotate(stageProps.scene.rotation + (angleDelta * 180) / Math.PI);
      }
    }

    prevDiff = curDiff;
    prevAngle = curAngle;
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;

    // Update pointer cache
    const index = pointerCache.findIndex((cachedEv) => cachedEv.pointerId === e.pointerId);
    if (index !== -1) {
      pointerCache[index] = e;
    }

    // Reset multi-touch state when transitioning from single to multi-touch
    // This prevents using stale movement data from single-touch phase
    if (lastPointerCount !== pointerCache.length) {
      if (pointerCache.length >= 2 && lastPointerCount < 2) {
        prevDiff = -1;
        prevAngle = 0;
      }
      lastPointerCount = pointerCache.length;
    }

    // Handle different pointer counts
    switch (pointerCache.length) {
      case 1:
        handleSinglePointer(e);
        break;
      case 2:
        handleMultiPointer(pointerCache, false); // Scene controls
        break;
      case 3:
        handleMultiPointer([pointerCache[0], pointerCache[2]], true); // Map controls
        break;
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
      lastPointerCount = 0;
    }
  }
</script>
