<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask } from '@threlte/core';
  import { onDestroy } from 'svelte';
  import { type Light, LightPulse, LIGHT_PULSE_DURATION } from './types';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';
  import { getGridCellSize } from '../../helpers/grid';
  import type { GridLayerProps } from '../GridLayer/types';
  import type { DisplayProps } from '../Stage/types';
  import { createLightMaterial, lightStyleConfigs, getStyleIndex } from './lightShader';

  interface Props {
    light: Light;
    grid: GridLayerProps;
    display: DisplayProps;
    opacity: number;
    isSelected: boolean;
    isHovered?: boolean;
  }

  const { light, grid, display, opacity, isSelected = false, isHovered = false }: Props = $props();

  const baseSize = $derived(getGridCellSize(grid, display) * light.radius);
  const lightSize = $derived(isHovered ? baseSize * 1.1 : baseSize);

  // Create shader material
  let lightMaterial = createLightMaterial(light.style, new THREE.Color(light.color));

  // Pulse animation state
  let pulsePhase = Math.random() * Math.PI * 2;
  let currentPulseMultiplier = 1;

  // Animate shader time and pulse
  useTask((delta) => {
    // Update shader time
    lightMaterial.uniforms.uTime.value += delta;

    // Calculate pulse multiplier for opacity
    if (light.pulse !== LightPulse.None) {
      const baseDuration = LIGHT_PULSE_DURATION[light.pulse];
      const speed = (Math.PI * 2) / (baseDuration / 1000);

      pulsePhase += delta * speed;

      // Organic pulse using multiple sine waves
      const wave = Math.sin(pulsePhase) * 0.15 + Math.sin(pulsePhase * 1.7) * 0.1;
      currentPulseMultiplier = Math.max(0.7, Math.min(1.0, 0.9 + wave));
    } else {
      currentPulseMultiplier = 1;
    }

    // Update opacity uniform
    lightMaterial.uniforms.uOpacity.value = opacity * currentPulseMultiplier;
  });

  // Update material when light properties change
  $effect(() => {
    lightMaterial.uniforms.uStyle.value = getStyleIndex(light.style);
    lightMaterial.uniforms.uColor.value = new THREE.Color(light.color);
    lightMaterial.uniforms.uSelected.value = isSelected || isHovered;
  });

  onDestroy(() => {
    lightMaterial.dispose();
  });
</script>

<T.Group position={[light.position.x, light.position.y, 0]} scale={[lightSize, lightSize, 1]}>
  <T.Mesh renderOrder={SceneLayerOrder.Light} layers={[SceneLayer.Main]}>
    <T.ShaderMaterial args={[lightMaterial]} attach="material" />
    <T.PlaneGeometry args={[1, 1]} />
  </T.Mesh>
</T.Group>
