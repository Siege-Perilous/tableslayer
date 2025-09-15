<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask } from '@threlte/core';
  import type { CursorData, CursorLayerProps } from './types';
  import { SceneLayer } from '../Scene/types';

  interface Props {
    props: CursorLayerProps;
  }

  const { props }: Props = $props();

  // Track current time for fade calculations
  let currentTime = $state(Date.now());

  useTask(() => {
    currentTime = Date.now();
  });

  // Calculate opacity for each cursor based on fade settings
  const getCursorOpacity = (cursor: CursorData): number => {
    const timeSinceUpdate = currentTime - cursor.lastUpdateTime;

    if (timeSinceUpdate < props.fadeOutDelay) {
      return cursor.opacity;
    }

    const fadeProgress = (timeSinceUpdate - props.fadeOutDelay) / props.fadeOutDuration;
    if (fadeProgress >= 1) {
      return 0;
    }

    return cursor.opacity * (1 - fadeProgress);
  };

  // Calculate cursor size based on grid
  // Grid spacing is in inches, display size is in inches, resolution is in pixels
  // We want the TOTAL cursor (including border) to be 0.7 times the grid size
  const calculateCursorSize = () => {
    if (!props.gridSpacing || !props.displaySize || !props.displayResolution) {
      return 50; // Default size if grid info not provided
    }

    // In the Stage coordinate system:
    // - The display resolution (e.g., 1920x1080) represents the full stage in world units
    // - The display size (e.g., 17.77x10 inches) is the physical size
    // - Grid spacing is in inches

    // Calculate how many pixels (world units) per inch
    const worldUnitsPerInch = props.displayResolution.x / props.displaySize.x;

    // Convert grid spacing from inches to world units
    const gridSizeInWorldUnits = props.gridSpacing * worldUnitsPerInch;

    // Compensate for scene zoom (since cursor is inside the scaled object)
    const sceneZoom = props.sceneZoom || 1;
    const adjustedSize = gridSizeInWorldUnits / sceneZoom;

    // We want the TOTAL cursor diameter (including border) to be 0.6 times the grid size
    const targetScale = 0.6;
    const finalSize = adjustedSize * targetScale;

    return finalSize;
  };

  // Make cursor size reactive to zoom changes
  const targetDiameter = $derived(calculateCursorSize());
  // The outer radius is half of our target diameter - this is the full visual extent
  const outerRadius = $derived(targetDiameter / 2);
  // Border takes up 20% of the radius
  const borderWidth = $derived(outerRadius * 0.2);
  // Inner colored area is smaller by the border width
  const innerRadius = $derived(outerRadius - borderWidth);

  // Create cursor geometry with more segments for smoother edges (anti-aliasing)
  // These need to be recreated when size changes
  const cursorGeometry = $derived(new THREE.CircleGeometry(innerRadius, 128));
  const cursorOutlineGeometry = $derived(new THREE.RingGeometry(innerRadius, outerRadius, 128));

  // Shadow geometry - ring for softer edge, centered for top-down view
  const shadowOuterRadius = $derived(outerRadius * 1.25);
  const shadowInnerRadius = $derived(outerRadius * 1.05);
  const shadowGeometry = $derived(new THREE.RingGeometry(shadowInnerRadius, shadowOuterRadius, 128));
</script>

{#each props.cursors as cursor (cursor.id)}
  {@const opacity = getCursorOpacity(cursor)}

  {#if opacity > 0}
    <!-- Cursor group positioned in world space -->
    <T.Group
      position={[cursor.worldPosition.x, cursor.worldPosition.y, cursor.worldPosition.z + 0.1]}
      layers={[SceneLayer.Overlay]}
    >
      <!-- Shadow (centered, no offset for top-down view) -->
      <T.Mesh geometry={shadowGeometry} position={[0, 0, -0.01]}>
        <T.MeshBasicMaterial
          color="#000000"
          transparent={true}
          opacity={opacity * 0.25}
          depthTest={false}
          depthWrite={false}
          side={2}
        />
      </T.Mesh>

      <!-- White outline border -->
      <T.Mesh geometry={cursorOutlineGeometry}>
        <T.MeshBasicMaterial color="#ffffff" transparent={true} {opacity} depthTest={false} depthWrite={false} />
      </T.Mesh>

      <!-- Colored center circle -->
      <T.Mesh geometry={cursorGeometry}>
        <T.MeshBasicMaterial
          color={cursor.color}
          transparent={true}
          opacity={opacity * 0.9}
          depthTest={false}
          depthWrite={false}
        />
      </T.Mesh>
    </T.Group>
  {/if}
{/each}
