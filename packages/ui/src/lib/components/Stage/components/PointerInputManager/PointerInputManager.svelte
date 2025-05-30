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

    // Calculate center point between the two touches
    const centerX = (p1.clientX + p2.clientX) / 2;
    const centerY = (p1.clientY + p2.clientY) / 2;

    const curAngle = Math.atan2(p2.clientY - p1.clientY, p2.clientX - p1.clientX);
    let angleDelta = curAngle - prevAngle;

    // Handle angle wraparound (crossing -π/π boundary)
    if (angleDelta > Math.PI) {
      angleDelta -= 2 * Math.PI;
    } else if (angleDelta < -Math.PI) {
      angleDelta += 2 * Math.PI;
    }

    // Filter out very small angle changes to reduce jitter
    const minAngleThreshold = 0.01; // ~0.57 degrees
    if (Math.abs(angleDelta) < minAngleThreshold) {
      angleDelta = 0;
    }

    return { curDiff, zoomDelta, curAngle, angleDelta, centerX, centerY };
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

  function rotateAroundCenter(
    currentOffset: { x: number; y: number },
    currentRotation: number,
    angleDelta: number,
    stageCenter: { x: number; y: number }
  ) {
    // Convert angle delta to radians
    const radians = (angleDelta * Math.PI) / 180;

    // Get current position relative to stage center
    const relativeX = currentOffset.x - stageCenter.x;
    const relativeY = currentOffset.y - stageCenter.y;

    // Apply rotation around center
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    const newRelativeX = relativeX * cos - relativeY * sin;
    const newRelativeY = relativeX * sin + relativeY * cos;

    // Convert back to absolute coordinates
    const newOffset = {
      x: newRelativeX + stageCenter.x,
      y: newRelativeY + stageCenter.y
    };

    const newRotation = currentRotation + (angleDelta * 180) / Math.PI;

    return { offset: newOffset, rotation: newRotation };
  }

  function handleMultiPointer(pointers: PointerEvent[], isMapControl: boolean) {
    const { dx, dy } = calculateRotatedMovement(pointers[0], stageProps.scene.rotation);
    const { curDiff, zoomDelta, curAngle, angleDelta } = calculatePinchAndRotation(pointers);

    if (prevDiff > 0) {
      // Apply rotation sensitivity factor to make rotation feel more natural
      const rotationSensitivity = 0.5; // Reduce rotation speed by half for more control
      const adjustedAngleDelta = angleDelta * rotationSensitivity;

      // Calculate stage center for rotation
      const stageRect = stageElement.getBoundingClientRect();
      const stageCenter = {
        x: stageRect.width / 2,
        y: stageRect.height / 2
      };

      if (isMapControl) {
        onMapPan(dx, dy);
        onMapZoom(Math.max(minZoom, Math.min(stageProps.map.zoom - zoomDelta, maxZoom)));

        // Rotate around stage center
        const { offset, rotation } = rotateAroundCenter(
          stageProps.map.offset,
          stageProps.map.rotation,
          -adjustedAngleDelta,
          stageCenter
        );
        onMapPan(offset.x - stageProps.map.offset.x, offset.y - stageProps.map.offset.y);
        onMapRotate(rotation);
      } else {
        onScenePan(dx, dy);
        onSceneZoom(Math.max(minZoom, Math.min(stageProps.scene.zoom - zoomDelta, maxZoom)));

        // Rotate around stage center
        const { offset, rotation } = rotateAroundCenter(
          stageProps.scene.offset,
          stageProps.scene.rotation,
          adjustedAngleDelta,
          stageCenter
        );
        onScenePan(offset.x - stageProps.scene.offset.x, offset.y - stageProps.scene.offset.y);
        onSceneRotate(rotation);
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
    }
  }
</script>
