<script lang="ts">
  import type { StageProps } from '../Stage/types';

  interface Props {
    minZoom: number;
    maxZoom: number;
    zoomSensitivity: number;
    stageElement: HTMLDivElement;
    stageProps: StageProps;
    /** When set, map rotation gestures snap to this step in degrees (e.g. 90 in MapDefined mode) */
    mapRotationStep?: number;
    /** Disables pinch-zooming the map (MapDefined mode derives the map zoom from the grid) */
    disableMapZoom?: boolean;
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
    mapRotationStep,
    disableMapZoom = false,
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
  let prevCentroid = $state<{ x: number; y: number } | null>(null);

  $effect(() => {
    if (!stageElement) return;

    stageElement.addEventListener('pointerdown', onPointerDown as EventListener);
    stageElement.addEventListener('pointermove', onPointerMove as EventListener);
    stageElement.addEventListener('pointerup', onPointerUp as EventListener);
    stageElement.addEventListener('pointercancel', onPointerUp as EventListener);
    stageElement.addEventListener('pointerout', onPointerUp as EventListener);
    stageElement.addEventListener('pointerleave', onPointerUp as EventListener);

    // Cleanup when stageElement changes or component unmounts
    return () => {
      stageElement.removeEventListener('pointerdown', onPointerDown as EventListener);
      stageElement.removeEventListener('pointermove', onPointerMove as EventListener);
      stageElement.removeEventListener('pointerup', onPointerUp as EventListener);
      stageElement.removeEventListener('pointercancel', onPointerUp as EventListener);
      stageElement.removeEventListener('pointerout', onPointerUp as EventListener);
      stageElement.removeEventListener('pointerleave', onPointerUp as EventListener);
    };
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

  function calculateCentroidMovement(pointers: PointerEvent[], rotation: number) {
    let sumX = 0;
    let sumY = 0;
    for (const pointer of pointers) {
      sumX += pointer.clientX;
      sumY += pointer.clientY;
    }
    const curCentroid = {
      x: sumX / pointers.length,
      y: sumY / pointers.length
    };

    if (!prevCentroid) {
      return { dx: 0, dy: 0, curCentroid };
    }

    const rawDx = curCentroid.x - prevCentroid.x;
    const rawDy = curCentroid.y - prevCentroid.y;

    // Apply rotation transformation
    const radians = (Math.PI / 180) * rotation;
    const dx = rawDx * Math.cos(radians) + rawDy * Math.sin(radians);
    const dy = -1 * (-rawDx * Math.sin(radians) + rawDy * Math.cos(radians));

    return { dx, dy, curCentroid };
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
    const { curDiff, zoomDelta, curAngle, angleDelta } = calculatePinchAndRotation(pointers);

    // Use centroid-based movement (center of the two pointers)
    const { dx, dy, curCentroid } = calculateCentroidMovement(pointers, stageProps.scene.rotation);
    prevCentroid = curCentroid;

    if (prevDiff > 0) {
      if (isMapControl) {
        onMapPan(dx, dy);
        if (!disableMapZoom) {
          onMapZoom(Math.max(minZoom, Math.min(stageProps.map.zoom - zoomDelta, maxZoom)));
        }
        const rotation = stageProps.map.rotation - (angleDelta * 180) / Math.PI;
        onMapRotate(mapRotationStep ? Math.round(rotation / mapRotationStep) * mapRotationStep : rotation);
      } else {
        onScenePan(dx, dy);
        onSceneZoom(Math.max(minZoom, Math.min(stageProps.scene.zoom - zoomDelta, maxZoom)));
        onSceneRotate(stageProps.scene.rotation + (angleDelta * 180) / Math.PI);
      }
    }

    prevDiff = curDiff;
    prevAngle = curAngle;
  }

  // Four-finger drag pans the map without zoom/rotate (the map zoom is locked
  // in MapDefined mode); mirrors the Shift+drag pan including the zoom factor
  function handleMultiPointerMapPan(pointers: PointerEvent[]) {
    const { dx, dy, curCentroid } = calculateCentroidMovement(pointers, stageProps.scene.rotation);
    prevCentroid = curCentroid;

    const movementFactor = 1 / stageProps.scene.zoom;
    onMapPan(dx * movementFactor, dy * movementFactor);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;

    // Update pointer cache
    const index = pointerCache.findIndex((cachedEv) => cachedEv.pointerId === e.pointerId);
    if (index !== -1) {
      pointerCache[index] = e;
    }

    // Reset multi-touch state whenever the pointer count changes so a gesture
    // never consumes stale movement data from the previous configuration
    if (lastPointerCount !== pointerCache.length) {
      prevDiff = -1;
      prevAngle = 0;
      prevCentroid = null;
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
      case 4:
        handleMultiPointerMapPan(pointerCache); // Map pan only
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
      prevCentroid = null;
    }
  }
</script>
