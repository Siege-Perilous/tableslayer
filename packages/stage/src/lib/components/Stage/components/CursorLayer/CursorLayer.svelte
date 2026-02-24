<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte } from '@threlte/core';
  import type { CursorData, CursorLayerProps } from './types';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';
  import { onMount } from 'svelte';

  interface Props {
    props: CursorLayerProps;
  }

  const { props }: Props = $props();
  const { invalidate } = useThrelte();

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

  // Create plane geometry for the cursor
  const planeGeometry = new THREE.PlaneGeometry(1, 1);

  // Load and create textures for each cursor color
  const textureCache = new Map<string, THREE.Texture>();

  const createCursorTexture = (color: string): THREE.Texture => {
    // Check cache first
    if (textureCache.has(color)) {
      return textureCache.get(color)!;
    }

    // Create SVG with the specified color
    const svg = `
      <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="1" result="offsetblur"/>
            <feFlood flood-color="#000000" flood-opacity="0.2"/>
            <feComposite in2="offsetblur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle 
          cx="32" 
          cy="32" 
          r="20" 
          fill="${color}" 
          stroke="white" 
          stroke-width="4"
          filter="url(#shadow)"
        />
      </svg>
    `;

    // Convert SVG to data URL
    const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(svg);

    // Create texture from SVG
    const loader = new THREE.TextureLoader();
    const texture = loader.load(svgDataUrl, () => {
      invalidate();
    });

    // Configure texture for best quality
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    // Cache the texture
    textureCache.set(color, texture);

    return texture;
  };

  // Cleanup textures on unmount
  onMount(() => {
    return () => {
      textureCache.forEach((texture) => texture.dispose());
      textureCache.clear();
    };
  });
</script>

{#each props.cursors as cursor, index (cursor.id)}
  {@const opacity = getCursorOpacity(cursor)}
  {@const cursorColor = index === 0 ? '#000000' : cursor.color}

  {#if opacity > 0}
    {@const texture = createCursorTexture(cursorColor)}

    <T.Group
      position={[cursor.worldPosition.x, cursor.worldPosition.y, cursor.worldPosition.z + 0.1]}
      layers={[SceneLayer.Overlay]}
    >
      <T.Mesh geometry={planeGeometry} scale={[targetDiameter, targetDiameter, 1]} renderOrder={SceneLayerOrder.Cursor}>
        <T.MeshBasicMaterial
          map={texture}
          transparent={true}
          {opacity}
          depthTest={false}
          depthWrite={false}
          alphaTest={0.01}
        />
      </T.Mesh>
    </T.Group>
  {/if}
{/each}
