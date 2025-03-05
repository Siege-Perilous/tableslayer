<script lang="ts">
  import * as THREE from 'three';
  import { onDestroy, onMount } from 'svelte';
  import { useThrelte } from '@threlte/core';
  import type { Size } from '../../types';
  import { SceneLayer } from '../Scene/types';

  interface Props {
    isActive: boolean;
    target?: THREE.Mesh;
    layerSize?: Size | null;
    onMouseDown?: (e: Event, coords: THREE.Vector2 | null) => void;
    onMouseUp?: (e: Event, coords: THREE.Vector2 | null) => void;
    onMouseMove?: (e: Event, coords: THREE.Vector2 | null) => void;
    onMouseLeave?: () => void;
    onWheel?: (e: WheelEvent) => void;
  }

  let { layerSize, isActive, target, onMouseDown, onMouseUp, onMouseMove, onMouseLeave, onWheel }: Props = $props();

  const { camera, renderer, size } = useThrelte();

  let raycaster = new THREE.Raycaster();
  raycaster.layers.enable(SceneLayer.Overlay);
  raycaster.layers.enable(SceneLayer.Main);
  raycaster.layers.enable(SceneLayer.Input);

  function isTouchDevice() {
    return window.matchMedia('(any-pointer: coarse)').matches;
  }

  console.log('isMobile', isTouchDevice());

  // Bind events to the renderer's canvas element
  onMount(() => {
    // Mouse events
    if (onMouseDown) renderer.domElement.addEventListener('mousedown', handleMouseDown);
    if (onMouseMove) renderer.domElement.addEventListener('mousemove', handleMouseMove);
    if (onMouseUp) renderer.domElement.addEventListener('mouseup', handleMouseUp);
    if (onMouseLeave) renderer.domElement.addEventListener('mouseleave', handleMouseLeave);
    if (onWheel) renderer.domElement.addEventListener('wheel', handleWheel);

    // Touch events
    if (onMouseDown) renderer.domElement.addEventListener('touchstart', handleTouchStart);
    if (onMouseMove) renderer.domElement.addEventListener('touchmove', handleTouchMove);
    if (onMouseUp) renderer.domElement.addEventListener('touchend', handleTouchEnd);
    if (onMouseLeave) renderer.domElement.addEventListener('touchcancel', handleTouchCancel);
  });

  onDestroy(() => {
    // Mouse events
    if (onMouseDown) renderer.domElement.removeEventListener('mousedown', handleMouseDown);
    if (onMouseMove) renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    if (onMouseUp) renderer.domElement.removeEventListener('mouseup', handleMouseUp);
    if (onMouseLeave) renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
    if (onWheel) renderer.domElement.removeEventListener('wheel', handleWheel);

    // Touch events
    if (onMouseDown) renderer.domElement.removeEventListener('touchstart', handleTouchStart);
    if (onMouseMove) renderer.domElement.removeEventListener('touchmove', handleTouchMove);
    if (onMouseUp) renderer.domElement.removeEventListener('touchend', handleTouchEnd);
    if (onMouseLeave) renderer.domElement.removeEventListener('touchcancel', handleTouchCancel);
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

  function handleWheel(event: WheelEvent) {
    if (onWheel && isActive) {
      onWheel(event);
    }
  }

  function handleMouseLeave() {
    if (onMouseLeave && isActive) {
      onMouseLeave();
    }
  }

  function handleTouchStart(event: TouchEvent) {
    if (onMouseDown && isActive) {
      event.preventDefault(); // Prevent scrolling when interacting with the canvas
      const touch = event.touches[0];
      onMouseDown(event, touchToCanvasCoords(touch));
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    if (onMouseUp && isActive && isTouchDevice()) {
      event.preventDefault();
      // We may not have a touch point in touchend, so pass null if not available
      const touch = event.changedTouches[0];
      onMouseUp(event, touch ? touchToCanvasCoords(touch) : null);
    }
  }

  function handleTouchMove(event: TouchEvent) {
    if (onMouseMove && isActive && isTouchDevice()) {
      event.preventDefault();
      const touch = event.touches[0];
      onMouseMove(event, touchToCanvasCoords(touch));
    }
  }

  function handleTouchCancel() {
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
        layerSize.height * (-localPoint.y + 0.5)
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
        layerSize.height * (-localPoint.y + 0.5)
      );
      return canvasPoint;
    } else {
      return null;
    }
  }
</script>
