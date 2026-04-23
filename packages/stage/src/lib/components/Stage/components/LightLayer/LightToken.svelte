<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask } from '@threlte/core';
  import { onDestroy } from 'svelte';
  import { type Light, LightPulse, LIGHT_PULSE_DURATION } from './types';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';
  import { getGridCellSize } from '../../helpers/grid';
  import type { GridLayerProps } from '../GridLayer/types';
  import type { DisplayProps } from '../Stage/types';
  import { createLightMaterial, getStyleIndex } from './lightShader';

  interface Props {
    light: Light;
    grid: GridLayerProps;
    display: DisplayProps;
    opacity: number;
    isSelected: boolean;
    isHovered?: boolean;
  }

  const { light, grid, display, opacity, isSelected = false, isHovered = false }: Props = $props();

  // Geometry is 2x larger than the light radius to allow ambient glow to extend
  const glowScale = 2.0;
  const baseSize = $derived(getGridCellSize(grid, display) * light.radius * glowScale);
  const lightSize = $derived(isHovered ? baseSize * 1.1 : baseSize);

  // Create shader material
  let lightMaterial = createLightMaterial(light.style, new THREE.Color(light.color));

  // Pulse animation state
  let pulsePhase = Math.random() * Math.PI * 2;
  let currentPulseValue = 0;

  // Animate shader time and pulse
  useTask((delta) => {
    // Update shader time
    lightMaterial.uniforms.uTime.value += delta;

    // Calculate smooth pulse value (0 to 1 range)
    if (light.pulse !== LightPulse.None) {
      const baseDuration = LIGHT_PULSE_DURATION[light.pulse];
      const speed = (Math.PI * 2) / (baseDuration / 1000);

      pulsePhase += delta * speed;

      // Organic pulse using multiple sine waves - output 0 to 1
      const wave1 = (Math.sin(pulsePhase) + 1) * 0.5; // 0 to 1
      const wave2 = (Math.sin(pulsePhase * 1.7 + 0.5) + 1) * 0.5; // 0 to 1
      const wave3 = (Math.sin(pulsePhase * 0.6 + 1.2) + 1) * 0.5; // 0 to 1

      // Blend waves for smooth, organic movement
      currentPulseValue = wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2;
    } else {
      currentPulseValue = 0;
    }

    // Update uniforms - combine layer opacity with per-light opacity
    const lightOpacity = light.opacity ?? 1.0;
    lightMaterial.uniforms.uOpacity.value = opacity * lightOpacity;
    lightMaterial.uniforms.uPulse.value = currentPulseValue;
    lightMaterial.uniforms.uPulseSetting.value = light.pulse;
  });

  // Update material when light properties change
  $effect(() => {
    lightMaterial.uniforms.uStyle.value = getStyleIndex(light.style);
    lightMaterial.uniforms.uColor.value = new THREE.Color(light.color);
    lightMaterial.uniforms.uSelected.value = isSelected || isHovered;
    // Update position, size, and display bounds for clipping
    lightMaterial.uniforms.uLightPosition.value.set(light.position.x, light.position.y);
    lightMaterial.uniforms.uLightSize.value = lightSize;
    lightMaterial.uniforms.uDisplayBounds.value.set(display.resolution.x / 2, display.resolution.y / 2);
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
