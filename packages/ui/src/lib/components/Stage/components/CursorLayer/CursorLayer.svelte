<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask } from '@threlte/core';
  import { Text } from '@threlte/extras';
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

  // Create cursor geometry (reusable)
  const cursorGeometry = new THREE.CircleGeometry(8, 16);
  const cursorOutlineGeometry = new THREE.RingGeometry(7, 10, 16);
</script>

{#each props.cursors as cursor (cursor.id)}
  {@const opacity = getCursorOpacity(cursor)}

  {#if opacity > 0}
    <!-- Cursor group positioned in world space -->
    <T.Group
      position={[cursor.worldPosition.x, cursor.worldPosition.y, cursor.worldPosition.z + 0.1]}
      layers={[SceneLayer.Overlay]}
    >
      <!-- White outline -->
      <T.Mesh geometry={cursorOutlineGeometry}>
        <T.MeshBasicMaterial color="#ffffff" transparent={true} {opacity} depthTest={false} />
      </T.Mesh>

      <!-- Colored center -->
      <T.Mesh geometry={cursorGeometry}>
        <T.MeshBasicMaterial color={cursor.color} transparent={true} opacity={opacity * 0.8} depthTest={false} />
      </T.Mesh>

      <!-- Cursor pointer triangle -->
      <T.Mesh position={[-4, -4, 0.01]} rotation={[0, 0, -Math.PI / 4]}>
        <T.ConeGeometry args={[4, 8, 3]} />
        <T.MeshBasicMaterial color="#ffffff" transparent={true} {opacity} depthTest={false} />
      </T.Mesh>

      <!-- Label (if enabled and provided) -->
      {#if props.showLabels && cursor.label}
        <Text
          text={cursor.label}
          fontSize={14}
          color={cursor.color}
          anchorX="left"
          anchorY="middle"
          position={[15, 0, 0.02]}
          outlineWidth={2}
          outlineColor="#000000"
          outlineOpacity={opacity}
          fillOpacity={opacity}
          layers={[SceneLayer.Overlay]}
        />
      {/if}
    </T.Group>
  {/if}
{/each}
