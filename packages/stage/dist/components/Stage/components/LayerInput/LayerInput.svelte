<script lang="ts">
  import * as THREE from 'three';
  import { onDestroy, onMount } from 'svelte';
  import { useThrelte } from '@threlte/core';
  import type { Size } from '../../types';
  import { SceneLayer } from '../Scene/types';

  interface Props {
    id?: string;
    isActive: boolean;
    target?: THREE.Mesh;
    layerSize?: Size | null;
    onMouseDown?: (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => void;
    onMouseUp?: (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => void;
    onMouseMove?: (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => void;
    onContextMenu?: (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onWheel?: (e: WheelEvent) => void;
  }

  let {
    id,
    layerSize,
    isActive,
    target,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseEnter,
    onMouseLeave,
    onWheel,
    onContextMenu
  }: Props = $props();

  const { camera, renderer, size } = useThrelte();

  let raycaster = new THREE.Raycaster();
  raycaster.layers.enable(SceneLayer.Overlay);
  raycaster.layers.enable(SceneLayer.Main);
  raycaster.layers.enable(SceneLayer.Input);

  function isTouchDevice() {
    return window.matchMedia('(any-pointer: coarse)').matches;
  }

  // Track pending touch to detect multi-touch gestures
  let touchStartTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingTouchEvent: TouchEvent | null = null;
  let pendingTouchCoords: THREE.Vector2 | null = null;
  let isDrawing = false;

  // Bind events to the renderer's canvas element
  onMount(() => {
    // Mouse events
    if (onMouseDown) renderer.domElement.addEventListener('mousedown', handleMouseDown);
    if (onMouseMove) renderer.domElement.addEventListener('mousemove', handleMouseMove);
    if (onMouseUp) renderer.domElement.addEventListener('mouseup', handleMouseUp);
    if (onMouseEnter) renderer.domElement.addEventListener('mouseenter', handleMouseEnter);
    if (onMouseLeave) renderer.domElement.addEventListener('mouseleave', handleMouseLeave);
    if (onContextMenu) renderer.domElement.addEventListener('contextmenu', handleContextMenu);
    if (onWheel) renderer.domElement.addEventListener('wheel', handleWheel);

    // Touch events
    if (onMouseDown) renderer.domElement.addEventListener('touchstart', handleTouchStart);
    if (onMouseMove) renderer.domElement.addEventListener('touchmove', handleTouchMove);
    if (onMouseUp) renderer.domElement.addEventListener('touchend', handleTouchEnd);
    if (onMouseLeave) renderer.domElement.addEventListener('touchcancel', handleTouchCancel);
  });

  onDestroy(() => {
    // Clean up any pending timers
    if (touchStartTimer) {
      clearTimeout(touchStartTimer);
      touchStartTimer = null;
    }

    // Mouse events
    if (onMouseDown) renderer.domElement.removeEventListener('mousedown', handleMouseDown);
    if (onMouseMove) renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    if (onMouseUp) renderer.domElement.removeEventListener('mouseup', handleMouseUp);
    if (onMouseEnter) renderer.domElement.removeEventListener('mouseenter', handleMouseEnter);
    if (onMouseLeave) renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
    if (onContextMenu) renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
    if (onWheel) renderer.domElement.removeEventListener('wheel', handleWheel);

    // Touch events
    if (onMouseDown) renderer.domElement.removeEventListener('touchstart', handleTouchStart);
    if (onMouseMove) renderer.domElement.removeEventListener('touchmove', handleTouchMove);
    if (onMouseUp) renderer.domElement.removeEventListener('touchend', handleTouchEnd);
    if (onMouseLeave) renderer.domElement.removeEventListener('touchcancel', handleTouchCancel);
  });

  export function getId() {
    return id;
  }

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

  function handleMouseEnter() {
    if (onMouseEnter && isActive) {
      onMouseEnter();
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
    if (onMouseDown && isActive) {
      // If multiple touches detected immediately, cancel any pending touch
      if (event.touches.length > 1) {
        // Cancel pending touch if it exists
        if (touchStartTimer) {
          clearTimeout(touchStartTimer);
          touchStartTimer = null;
          pendingTouchEvent = null;
          pendingTouchCoords = null;
        }
        // Stop any ongoing drawing
        if (isDrawing && onMouseUp) {
          onMouseUp(event, null);
          isDrawing = false;
        }
        return;
      }

      event.preventDefault(); // Prevent scrolling when interacting with the canvas
      const touch = event.touches[0];
      const coords = touchToCanvasCoords(touch);

      // Store the touch event and wait to see if another finger touches
      pendingTouchEvent = event;
      pendingTouchCoords = coords;

      // Clear any existing timer
      if (touchStartTimer) {
        clearTimeout(touchStartTimer);
      }

      // Wait 50ms to see if this becomes a multi-touch gesture
      touchStartTimer = setTimeout(() => {
        // If we still only have one touch after the delay, start drawing
        if (pendingTouchEvent && pendingTouchCoords && event.touches.length === 1) {
          onMouseDown(pendingTouchEvent, pendingTouchCoords);
          isDrawing = true;
        }
        touchStartTimer = null;
        pendingTouchEvent = null;
        pendingTouchCoords = null;
      }, 50);
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    if (onMouseUp && isActive && isTouchDevice()) {
      event.preventDefault();

      // Cancel any pending touch start
      if (touchStartTimer) {
        clearTimeout(touchStartTimer);
        touchStartTimer = null;
        pendingTouchEvent = null;
        pendingTouchCoords = null;
      }

      // Only trigger mouse up if we were actually drawing
      if (isDrawing) {
        const touch = event.changedTouches[0];
        onMouseUp(event, touch ? touchToCanvasCoords(touch) : null);
        isDrawing = false;
      }
    }
  }

  function handleTouchMove(event: TouchEvent) {
    if (onMouseMove && isActive && isTouchDevice()) {
      // Stop drawing if multiple touches detected (pinch/zoom gesture)
      if (event.touches.length > 1) {
        // Cancel any pending touch
        if (touchStartTimer) {
          clearTimeout(touchStartTimer);
          touchStartTimer = null;
          pendingTouchEvent = null;
          pendingTouchCoords = null;
        }
        // Stop any ongoing drawing
        if (isDrawing && onMouseUp) {
          onMouseUp(event, null);
          isDrawing = false;
        }
        return;
      }

      // Only process move if we're actually drawing
      if (isDrawing) {
        event.preventDefault();
        const touch = event.touches[0];
        onMouseMove(event, touchToCanvasCoords(touch));
      }
    }
  }

  function handleTouchCancel() {
    // Clean up any pending or ongoing touch operations
    if (touchStartTimer) {
      clearTimeout(touchStartTimer);
      touchStartTimer = null;
      pendingTouchEvent = null;
      pendingTouchCoords = null;
    }

    if (isDrawing) {
      isDrawing = false;
    }

    if (onMouseLeave && isActive) {
      onMouseLeave();
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
