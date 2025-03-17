<script lang="ts">
  import * as THREE from 'three';
  import { onDestroy, onMount } from 'svelte';
  import { useThrelte } from '@threlte/core';
  import type { Size } from '../../types';
  import { SceneLayer } from '../Scene/types';
  import { MapLayerType } from '../MapLayer/types';

  interface Props {
    isActive: boolean;
    target?: THREE.Mesh;
    layerSize?: Size | null;
    activeLayer?: MapLayerType;
    gestureTarget?: 'map' | 'scene';
    onMouseDown?: (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => void;
    onMouseUp?: (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => void;
    onMouseMove?: (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => void;
    onContextMenu?: (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => void;
    onMouseLeave?: () => void;
    onWheel?: (e: WheelEvent) => void;
    onPinch?: (scale: number, gestureTarget: 'map' | 'scene') => void;
    onRotate?: (angle: number, gestureTarget: 'map' | 'scene') => void;
  }

  let {
    layerSize,
    isActive,
    target,
    activeLayer,
    gestureTarget = 'scene',
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseLeave,
    onWheel,
    onContextMenu,
    onPinch,
    onRotate
  }: Props = $props();

  const { camera, renderer, size } = useThrelte();

  let raycaster = new THREE.Raycaster();
  raycaster.layers.enable(SceneLayer.Overlay);
  raycaster.layers.enable(SceneLayer.Main);
  raycaster.layers.enable(SceneLayer.Input);

  // Touch gesture state
  let initialDistance = 0;
  let initialAngle = 0;
  let isMultiTouch = false;
  let currentGestureTarget: 'map' | 'scene';

  function isTouchDevice() {
    return window.matchMedia('(any-pointer: coarse)').matches;
  }

  // Bind events to the renderer's canvas element
  onMount(() => {
    // Mouse events
    if (onMouseDown) renderer.domElement.addEventListener('mousedown', handleMouseDown);
    if (onMouseMove) renderer.domElement.addEventListener('mousemove', handleMouseMove);
    if (onMouseUp) renderer.domElement.addEventListener('mouseup', handleMouseUp);
    if (onMouseLeave) renderer.domElement.addEventListener('mouseleave', handleMouseLeave);
    if (onContextMenu) renderer.domElement.addEventListener('contextmenu', handleContextMenu);
    if (onWheel) renderer.domElement.addEventListener('wheel', handleWheel);

    // Touch events
    if (onMouseDown) renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    if (onMouseMove) renderer.domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    if (onMouseUp) renderer.domElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    if (onMouseLeave) renderer.domElement.addEventListener('touchcancel', handleTouchCancel, { passive: false });
  });

  onDestroy(() => {
    // Mouse events
    if (onMouseDown) renderer.domElement.removeEventListener('mousedown', handleMouseDown);
    if (onMouseMove) renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    if (onMouseUp) renderer.domElement.removeEventListener('mouseup', handleMouseUp);
    if (onMouseLeave) renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
    if (onContextMenu) renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
    if (onWheel) renderer.domElement.removeEventListener('wheel', handleWheel);

    // Touch events
    if (onMouseDown)
      renderer.domElement.removeEventListener('touchstart', handleTouchStart, {
        passive: false
      } as EventListenerOptions);
    if (onMouseMove)
      renderer.domElement.removeEventListener('touchmove', handleTouchMove, { passive: false } as EventListenerOptions);
    if (onMouseUp)
      renderer.domElement.removeEventListener('touchend', handleTouchEnd, { passive: false } as EventListenerOptions);
    if (onMouseLeave)
      renderer.domElement.removeEventListener('touchcancel', handleTouchCancel, {
        passive: false
      } as EventListenerOptions);
  });

  // Internal event handler methods for mouse
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

  function handleMouseLeave() {
    if (onMouseLeave && isActive) {
      onMouseLeave();
    }
  }

  function handleContextMenu(event: MouseEvent) {
    if (onContextMenu && isActive) {
      onContextMenu(event, mouseToCanvasCoords(event));
    }
  }

  function handleWheel(event: WheelEvent) {
    if (onWheel && isActive) {
      onWheel(event);
    }
  }

  function handleTouchStart(event: TouchEvent) {
    if (!isActive) return;

    event.preventDefault(); // Prevent scrolling when interacting with the canvas

    // Only handle pinch/zoom if we have onPinch handler
    if (event.touches.length === 2 && onPinch) {
      // Initialize pinch-zoom and rotation
      isMultiTouch = true;
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      // Calculate initial distance between touch points
      initialDistance = getDistance(touch1, touch2);

      // Calculate initial angle between touch points
      initialAngle = getAngle(touch1, touch2);

      // Determine if we're modifying the map or scene based on gestureTarget or modifier key
      currentGestureTarget = event.shiftKey ? 'map' : gestureTarget;
    } else if (event.touches.length === 1 && onMouseDown) {
      // Single touch - handle as normal
      isMultiTouch = false;
      const touch = event.touches[0];
      onMouseDown(event, touchToCanvasCoords(touch));
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    if (!isActive) return;

    event.preventDefault();

    // Reset multi-touch state
    if (isMultiTouch && event.touches.length < 2) {
      isMultiTouch = false;
    }

    // Handle regular touch end for single touch
    if (!isMultiTouch && onMouseUp && isTouchDevice()) {
      // We may not have a touch point in touchend, so pass null if not available
      const touch = event.changedTouches[0];
      onMouseUp(event, touch ? touchToCanvasCoords(touch) : null);
    }
  }

  function handleTouchMove(event: TouchEvent) {
    if (!isActive) return;

    event.preventDefault();

    // For pinch/zoom, handle regardless of active layer
    if (isMultiTouch && event.touches.length === 2 && onPinch) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      // Handle pinch/zoom
      const currentDistance = getDistance(touch1, touch2);
      const scaleFactor = currentDistance / initialDistance;

      // Only trigger zoom if the change is significant
      if (Math.abs(scaleFactor - 1) > 0.01) {
        onPinch(scaleFactor, currentGestureTarget);
        initialDistance = currentDistance; // Update for next move event
      }

      // Handle rotation
      if (onRotate) {
        const currentAngle = getAngle(touch1, touch2);
        const angleDelta = currentAngle - initialAngle;

        // Only trigger rotation if the change is significant
        if (Math.abs(angleDelta) > 0.05) {
          onRotate(angleDelta, currentGestureTarget);
          initialAngle = currentAngle; // Update for next move event
        }
      }
    } else if (onMouseMove && isTouchDevice()) {
      // Handle regular touch move for single touch
      const touch = event.touches[0];
      onMouseMove(event, touchToCanvasCoords(touch));
    }
  }

  function handleTouchCancel() {
    if (onMouseLeave && isActive) {
      isMultiTouch = false;
      onMouseLeave();
    }
  }

  function getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getAngle(touch1: Touch, touch2: Touch): number {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX);
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
        layerSize.height * (localPoint.y + 0.5)
      );
      return canvasPoint;
    } else {
      return null;
    }
  }

  function touchToCanvasCoords(touch: Touch): THREE.Vector2 | null {
    if (!target || !layerSize || !renderer.domElement) return null;

    const rect = renderer.domElement.getBoundingClientRect();

    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    const mouse = new THREE.Vector2((offsetX / $size.width) * 2 - 1, -(offsetY / $size.height) * 2 + 1);

    raycaster.setFromCamera(mouse, $camera);
    const intersects = raycaster.intersectObject(target);

    if (intersects.length > 0) {
      const { point } = intersects[0];
      const localPoint = target.worldToLocal(point);
      const canvasPoint = new THREE.Vector2(
        layerSize.width * (localPoint.x + 0.5),
        layerSize.height * (localPoint.y + 0.5)
      );
      return canvasPoint;
    } else {
      return null;
    }
  }
</script>
