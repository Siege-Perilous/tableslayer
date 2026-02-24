<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { AnnotationEffect } from '../Stage/components/AnnotationLayer/types';
  import EffectPreviewScene from './EffectPreviewScene.svelte';

  interface Props {
    effectType: AnnotationEffect;
    size?: string;
    shape?: 'circle' | 'rounded';
  }

  const { effectType, size = '3rem', shape = 'circle' }: Props = $props();
</script>

<div class="effectPreview" class:effectPreview--rounded={shape === 'rounded'} style="width: {size}; height: {size};">
  <Canvas>
    <EffectPreviewScene {effectType} {shape} />
  </Canvas>
</div>

<style>
  .effectPreview {
    border-radius: 50%;
    overflow: hidden;
    background: transparent;
  }

  .effectPreview--rounded {
    border-radius: var(--radius-1);
  }

  .effectPreview :global(canvas) {
    width: 100% !important;
    height: 100% !important;
  }
</style>
