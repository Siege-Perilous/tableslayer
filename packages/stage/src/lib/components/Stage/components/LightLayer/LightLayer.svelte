<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { LightStyle, LightPulse, type Light, LIGHT_STYLE_COLORS } from './types';
  import { getContext } from 'svelte';
  import LayerInput from '../LayerInput/LayerInput.svelte';
  import type { Callbacks } from '../Stage/types';
  import { type StageProps, StageMode } from '../Stage/types';
  import LightToken from './LightToken.svelte';
  import { getGridCellSize, snapToGrid } from '../../helpers/grid';
  import type { GridLayerProps } from '../GridLayer/types';
  import type { DisplayProps } from '../Stage/types';
  import { SceneLayer } from '../Scene/types';
  import { MapLayerType } from '../MapLayer/types';
  import { v4 as uuidv4 } from 'uuid';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: StageProps;
    isActive: boolean;
    grid: GridLayerProps;
    display: DisplayProps;
  }

  const { props, isActive, display, grid }: Props = $props();

  const stage = getContext<{ mode: StageMode }>('stage');
  const { onLightAdded, onLightMoved, onLightSelected } = getContext<Callbacks>('callbacks');

  // Quad used for raycasting / mouse input detection
  let inputMesh = $state.raw(new THREE.Mesh());

  // Track the currently selected light and dragging state
  let selectedLight: Light | null = $state(null);
  let isDragging = $state(false);
  let hoveredLight: Light | null = $state(null);

  const ghostLight: Light = $state({
    id: uuidv4(),
    position: new THREE.Vector2(0, 0),
    radius: 2,
    color: LIGHT_STYLE_COLORS[LightStyle.Lantern],
    style: LightStyle.Lantern,
    pulse: LightPulse.None
  });

  const findClosestLight = (gridCoords: THREE.Vector2) => {
    let closestLight: Light | undefined;
    let minDistance = Infinity;

    props.light.lights.forEach((light) => {
      const distance = gridCoords.distanceTo(light.position);
      const lightRadius = getGridCellSize(grid, display) * light.radius;
      // Use a smaller hit area (30% of radius) for easier selection
      if (distance < minDistance && distance <= lightRadius * 0.3) {
        minDistance = distance;
        closestLight = light;
      }
    });

    return closestLight;
  };

  const onMouseDown = (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => {
    if (!coords) return;

    const isTouchEvent = typeof TouchEvent !== 'undefined' && e instanceof TouchEvent;
    const isMouseEvent = e instanceof MouseEvent;

    if (isMouseEvent && e.button !== 0) return;
    if (isTouchEvent && (e as TouchEvent).touches.length !== 1) return;

    // Only allow light interaction when activeLayer is None or Light
    if (props.activeLayer !== MapLayerType.None && props.activeLayer !== MapLayerType.Light) {
      return;
    }

    const gridCoords = new THREE.Vector2(coords.x - display.resolution.x / 2, coords.y - display.resolution.y / 2);

    const closestLight = findClosestLight(gridCoords);

    if (closestLight !== undefined) {
      selectedLight = closestLight;
      isDragging = true;
      onLightSelected?.(selectedLight);
    } else {
      // In player mode, clicking empty space clears selection
      if (stage.mode === StageMode.Player) {
        selectedLight = null;
        return;
      }

      // In DM mode with Light tool active, create a new light
      if (props.activeLayer === MapLayerType.Light) {
        const position = props.light.snapToGrid ? snapToGrid(gridCoords, grid, display) : gridCoords;
        const newLight: Light = {
          id: uuidv4(),
          position,
          radius: 2,
          color: LIGHT_STYLE_COLORS[LightStyle.Lantern],
          style: LightStyle.Lantern,
          pulse: LightPulse.None
        };
        selectedLight = newLight;
        onLightAdded?.(newLight);
      } else {
        // Clear selection when clicking empty space in DM mode with other tools
        selectedLight = null;
        onLightSelected?.(null);
      }
    }
  };

  const onMouseMove = (e: Event, coords: THREE.Vector2 | null) => {
    if (!coords) {
      hoveredLight = null;
      return;
    }

    let position = new THREE.Vector2(coords.x - display.resolution.x / 2, coords.y - display.resolution.y / 2);
    const snapPosition = props.light.snapToGrid ? snapToGrid(position, grid, display) : position;

    ghostLight.position = snapPosition;

    // Check for hover when not dragging
    if (!isDragging && (props.activeLayer === MapLayerType.None || props.activeLayer === MapLayerType.Light)) {
      hoveredLight = findClosestLight(position) ?? null;
    } else {
      hoveredLight = null;
    }

    if (isDragging && selectedLight) {
      onLightMoved?.(selectedLight, snapPosition);
    }
  };

  const onMouseUp = () => {
    if (isDragging && selectedLight) {
      isDragging = false;
    }
  };

  const onMouseLeave = () => {
    hoveredLight = null;
  };

  /**
   * Called when the scene changes to clear all light interaction state.
   */
  export const onSceneChange = () => {
    selectedLight = null;
    isDragging = false;
    hoveredLight = null;
  };

  // Export reactive state for hover and drag
  export const lightState = {
    get isHovering() {
      return hoveredLight !== null;
    },
    get isDragging() {
      return isDragging;
    },
    get hoveredLight() {
      return hoveredLight;
    },
    get selectedLight() {
      return selectedLight;
    }
  };
</script>

<LayerInput
  id="light"
  isActive={isActive || stage.mode === StageMode.Player}
  target={inputMesh}
  layerSize={{ width: display.resolution.x, height: display.resolution.y }}
  {onMouseDown}
  {onMouseMove}
  {onMouseUp}
  {onMouseLeave}
/>

<!-- This quad is used for raycasting / mouse input detection. It is invisible -->
<T.Mesh bind:ref={inputMesh} scale={[display.resolution.x, display.resolution.y, 1]} layers={[SceneLayer.Input]}>
  <T.MeshBasicMaterial visible={false} />
  <T.PlaneGeometry />
</T.Mesh>

<!-- This group contains all the lights -->
<T.Group name="lightLayer" position={[-0.5, -0.5, 0]}>
  {#each props.light.lights as light (light.id)}
    <LightToken
      {light}
      {grid}
      {display}
      opacity={1.0}
      isSelected={selectedLight?.id === light.id}
      isHovered={hoveredLight?.id === light.id}
    />
  {/each}

  <!-- Only show the ghost light when the light layer is active -->
  {#if isActive && stage.mode === StageMode.DM && props.activeLayer === MapLayerType.Light}
    <LightToken light={ghostLight} {grid} {display} opacity={0.3} isSelected={false} isHovered={false} />
  {/if}
</T.Group>
