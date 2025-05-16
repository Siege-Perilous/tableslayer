<script lang="ts">
  import { onMount } from 'svelte';
  import type { StageProps } from '@tableslayer/ui';
  import { DrawMode, ToolType, MapLayerType } from '@tableslayer/ui';

  let { props = $bindable(), element } = $props<{
    props: StageProps;
    element: HTMLElement;
  }>();

  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.0005;

  let lastPointerDistance = $state(0);
  let lastPointerX = $state(0);
  let lastPointerY = $state(0);
  let activePointers = $state(new Map());

  function getPointerDistance(pointer1: PointerEvent, pointer2: PointerEvent) {
    const dx = pointer1.clientX - pointer2.clientX;
    const dy = pointer1.clientY - pointer2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onPointerDown(e: PointerEvent) {
    activePointers.set(e.pointerId, e);

    if (activePointers.size === 2) {
      const pointers = Array.from(activePointers.values());
      lastPointerDistance = getPointerDistance(pointers[0], pointers[1]);
    } else if (activePointers.size === 1) {
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    }
  }

  function onPointerMove(e: PointerEvent) {
    activePointers.set(e.pointerId, e);

    if (activePointers.size === 2) {
      // Handle pinch zoom
      const pointers = Array.from(activePointers.values());
      const currentDistance = getPointerDistance(pointers[0], pointers[1]);
      const delta = (currentDistance - lastPointerDistance) * zoomSensitivity;

      if (e.shiftKey) {
        props.map.zoom = Math.max(minZoom, Math.min(props.map.zoom - delta, maxZoom));
      } else if (e.ctrlKey) {
        props.scene.zoom = Math.max(minZoom, Math.min(props.scene.zoom - delta, maxZoom));
      }

      lastPointerDistance = currentDistance;
    } else if (activePointers.size === 1 && (e.buttons === 1 || e.buttons === 2)) {
      // Handle pan
      const deltaX = e.clientX - lastPointerX;
      const deltaY = e.clientY - lastPointerY;

      // Get rotation for both map and scene transformations
      const rotation = props.scene.rotation;
      const radians = (Math.PI / 180) * rotation;

      // Calculate rotated movement vectors
      const rotatedMovementX = deltaX * Math.cos(radians) + deltaY * Math.sin(radians);
      const rotatedMovementY = -deltaX * Math.sin(radians) + deltaY * Math.cos(radians);

      if (e.shiftKey) {
        const movementFactor = 1 / props.scene.zoom;
        props.map.offset.x += rotatedMovementX * movementFactor;
        props.map.offset.y -= rotatedMovementY * movementFactor;
      } else if (e.ctrlKey) {
        props.scene.offset.x += rotatedMovementX;
        props.scene.offset.y -= rotatedMovementY;
      }

      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    }
  }

  function onPointerUp(e: PointerEvent) {
    activePointers.delete(e.pointerId);
  }

  function onPointerCancel(e: PointerEvent) {
    activePointers.delete(e.pointerId);
  }

  function onWheel(e: WheelEvent) {
    let scrollDelta;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      scrollDelta = e.deltaX * zoomSensitivity;
    } else {
      scrollDelta = e.deltaY * zoomSensitivity;
    }

    if (e.shiftKey) {
      props.map.zoom = Math.max(minZoom, Math.min(props.map.zoom - scrollDelta, maxZoom));
    } else if (e.ctrlKey) {
      e.preventDefault();
      props.scene.zoom = Math.max(minZoom, Math.min(props.scene.zoom - scrollDelta, maxZoom));
    } else if (props.activeLayer === MapLayerType.FogOfWar) {
      props.fogOfWar.tool.size = Math.max(10, Math.min(props.fogOfWar.tool.size + 500.0 * scrollDelta, 1000));
    }
  }

  onMount(() => {
    if (element) {
      element.addEventListener('pointerdown', onPointerDown);
      element.addEventListener('pointermove', onPointerMove);
      element.addEventListener('pointerup', onPointerUp);
      element.addEventListener('pointercancel', onPointerCancel);
      element.addEventListener('wheel', onWheel, { passive: false });

      element.addEventListener(
        'contextmenu',
        function (e: MouseEvent) {
          e.preventDefault();
        },
        false
      );

      document.addEventListener('keydown', (event) => {
        switch (event.key) {
          case 'e':
            props.activeLayer = MapLayerType.FogOfWar;
            props.fogOfWar.tool.mode = DrawMode.Erase;
            props.fogOfWar.tool.type = ToolType.Brush;
            break;
          case 'E':
            props.activeLayer = MapLayerType.FogOfWar;
            props.fogOfWar.tool.mode = DrawMode.Draw;
            props.fogOfWar.tool.type = ToolType.Brush;
            break;
          case 'f':
            // Dispatch event for fog clear
            break;
          case 'F':
            // Dispatch event for fog reset
            break;
          case 'o':
            props.activeLayer = MapLayerType.FogOfWar;
            props.fogOfWar.tool.type = ToolType.Ellipse;
            props.fogOfWar.tool.mode = DrawMode.Erase;
            break;
          case 'O':
            props.activeLayer = MapLayerType.FogOfWar;
            props.fogOfWar.tool.type = ToolType.Ellipse;
            props.fogOfWar.tool.mode = DrawMode.Draw;
            break;
          case 'm':
            props.activeLayer = MapLayerType.Marker;
            break;
          case 'r':
            props.activeLayer = MapLayerType.FogOfWar;
            props.fogOfWar.tool.type = ToolType.Rectangle;
            props.fogOfWar.tool.mode = DrawMode.Erase;
            break;
          case 'R':
            props.activeLayer = MapLayerType.FogOfWar;
            props.fogOfWar.tool.type = ToolType.Rectangle;
            props.fogOfWar.tool.mode = DrawMode.Draw;
            break;
          case 'Escape':
            props.activeLayer = MapLayerType.None;
            break;
        }
      });
    }

    return () => {
      if (element) {
        element.removeEventListener('pointerdown', onPointerDown);
        element.removeEventListener('pointermove', onPointerMove);
        element.removeEventListener('pointerup', onPointerUp);
        element.removeEventListener('pointercancel', onPointerCancel);
        element.removeEventListener('wheel', onWheel);
      }
    };
  });
</script>

<slot />
