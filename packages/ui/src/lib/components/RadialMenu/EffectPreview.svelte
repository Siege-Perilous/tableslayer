<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { AnnotationEffect } from '../Stage/components/AnnotationLayer/types';
  import EffectPreviewScene from './EffectPreviewScene.svelte';

  interface Props {
    effectType: AnnotationEffect;
    size?: number;
  }

  const { effectType, size = 48 }: Props = $props();
</script>

<div class="effectPreview" style="width: {size}px; height: {size}px;">
  <Canvas>
    <EffectPreviewScene {effectType} />
  </Canvas>
</div>

<style>
  .effectPreview {
    border-radius: 50%;
    overflow: hidden;
    background: transparent;
  }

  .effectPreview :global(canvas) {
    width: 100% !important;
    height: 100% !important;
  }
</style>
