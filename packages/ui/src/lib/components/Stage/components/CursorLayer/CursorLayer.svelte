<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask } from '@threlte/core';
  import type { CursorData, CursorLayerProps } from './types';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';

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

  // Calculate cursor size based on grid spacing and display dimensions
  const calculateCursorSize = () => {
    if (!props.gridSpacing || !props.displaySize || !props.displayResolution) {
      return 50;
    }

    const worldUnitsPerInch = props.displayResolution.x / props.displaySize.x;
    const gridSizeInWorldUnits = props.gridSpacing * worldUnitsPerInch;
    const sceneZoom = props.sceneZoom || 1;
    const adjustedSize = gridSizeInWorldUnits / sceneZoom;
    const targetScale = 0.6;
    const finalSize = adjustedSize * targetScale;

    return finalSize;
  };

  const targetDiameter = $derived(calculateCursorSize());
  const outerRadius = $derived(targetDiameter / 2);
  const borderWidth = $derived(outerRadius * 0.2);
  const innerRadius = $derived(outerRadius - borderWidth);

  const cursorGeometry = $derived(new THREE.CircleGeometry(innerRadius, 128));
  const cursorOutlineGeometry = $derived(new THREE.RingGeometry(innerRadius, outerRadius, 128));

  const shadowOuterRadius = $derived(outerRadius * 1.25);
  const shadowInnerRadius = $derived(outerRadius * 1.05);
  const shadowGeometry = $derived(new THREE.RingGeometry(shadowInnerRadius, shadowOuterRadius, 128));
</script>

{#each props.cursors as cursor (cursor.id)}
  {@const opacity = getCursorOpacity(cursor)}

  {#if opacity > 0}
    <T.Group
      position={[cursor.worldPosition.x, cursor.worldPosition.y, cursor.worldPosition.z + 0.1]}
      layers={[SceneLayer.Overlay]}
    >
      <T.Mesh geometry={shadowGeometry} position={[0, 0, -0.01]} renderOrder={SceneLayerOrder.Cursor}>
        <T.MeshBasicMaterial
          color="#000000"
          transparent={true}
          opacity={opacity * 0.25}
          depthTest={false}
          depthWrite={false}
          side={2}
        />
      </T.Mesh>

      <T.Mesh geometry={cursorOutlineGeometry} renderOrder={SceneLayerOrder.Cursor}>
        <T.MeshBasicMaterial color="#ffffff" transparent={true} {opacity} depthTest={false} depthWrite={false} />
      </T.Mesh>

      <T.Mesh geometry={cursorGeometry} renderOrder={SceneLayerOrder.Cursor}>
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
