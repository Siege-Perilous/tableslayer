<script lang="ts">
  import { Popover } from '../Popover';
  import { Icon } from '../Icon';
  import { IconButton } from '../Button';
  import {
    IconBoxMultiple,
    IconBoxMultiple1,
    IconBoxMultiple2,
    IconBoxMultiple3,
    IconBoxMultiple4,
    IconBoxMultiple5,
    IconBoxMultiple6,
    IconBoxMultiple7,
    IconBoxMultiple8,
    IconBoxMultiple9
  } from '@tabler/icons-svelte';
  import type { ComponentType } from 'svelte';
  import { AnnotationEffect } from '../Stage/components/AnnotationLayer/types';
  import EffectPreview from '../RadialMenu/EffectPreview.svelte';

  // Color palette - 10 colors
  const COLORS = [
    '#d73e2e', // red
    '#ffa500', // orange
    '#ffd93d', // yellow
    '#6bcf7f', // green
    '#2e86ab', // blue
    '#b197fc', // purple
    '#f06595', // pink
    '#20c997', // turquoise
    '#ffffff', // white
    '#2a2a2a' // dark
  ];

  // Effects array
  const EFFECTS = [
    AnnotationEffect.Fire,
    AnnotationEffect.Water,
    AnnotationEffect.Ice,
    AnnotationEffect.Magic,
    AnnotationEffect.Grease,
    AnnotationEffect.SpaceTear
  ];

  // Effect colors for the opacity slider gradient
  const EFFECT_COLORS: Record<AnnotationEffect, string> = {
    [AnnotationEffect.None]: '#ffffff',
    [AnnotationEffect.Fire]: '#ff4d1a',
    [AnnotationEffect.Water]: '#3380cc',
    [AnnotationEffect.Ice]: '#b3d9ff',
    [AnnotationEffect.Magic]: '#9333ea',
    [AnnotationEffect.Grease]: '#4d3319',
    [AnnotationEffect.SpaceTear]: '#330066'
  };

  interface Props {
    opacity: number;
    brushSize: number;
    color: string;
    activeLayerIndex: number;
    currentEffect?: AnnotationEffect;
    onOpacityChange: (value: number) => void;
    onBrushSizeChange: (value: number) => void;
    onColorChange: (color: string, opacity: number) => void;
    onEffectChange?: (effect: AnnotationEffect) => void;
    onLayersClick: () => void;
  }

  let {
    opacity,
    brushSize,
    color,
    activeLayerIndex,
    currentEffect = AnnotationEffect.None,
    onOpacityChange,
    onBrushSizeChange,
    onColorChange,
    onEffectChange,
    onLayersClick
  }: Props = $props();

  // Track popover close function
  let closePopover: (() => void) | null = null;

  // Select the appropriate icon based on layer count
  const layerIcons: ComponentType[] = [
    IconBoxMultiple1,
    IconBoxMultiple2,
    IconBoxMultiple3,
    IconBoxMultiple4,
    IconBoxMultiple5,
    IconBoxMultiple6,
    IconBoxMultiple7,
    IconBoxMultiple8,
    IconBoxMultiple9
  ];

  const layerIcon = $derived.by(() => {
    // activeLayerIndex is 1-based (1st layer, 2nd layer, etc.)
    return activeLayerIndex <= 9 && activeLayerIndex > 0 ? layerIcons[activeLayerIndex - 1] : IconBoxMultiple;
  });

  // Check if current selection is an effect
  const hasEffect = $derived(currentEffect !== AnnotationEffect.None);

  // Brush size is now stored as a percentage (0.01% to 5%)
  // Use quadratic curve for slider to give more precision to lower values
  // Slider range: 0-100, maps to percentage range: 0.01-5.0
  // At 50% slider we want 2%, so we use: percentage = 0.0008 * slider^2
  // This gives: 10% → 0.08%, 50% → 2%, 100% → 8% (capped at 5%)
  const percentageToSlider = (percentage: number): number => {
    // Inverse: slider = sqrt(percentage / 0.0008)
    // Clamp to minimum of 0.01
    const clampedPercentage = Math.max(0.01, percentage);
    return Math.sqrt(clampedPercentage / 0.0008);
  };

  const sliderToPercentage = (slider: number): number => {
    // Quadratic curve: percentage = 0.0008 * slider^2
    const percentage = 0.0008 * slider * slider;
    return Math.max(0.01, Math.min(5.0, percentage));
  };

  let brushSliderValue = $derived(percentageToSlider(brushSize));

  const handleBrushSliderChange = (value: number) => {
    const actualPercentage = sliderToPercentage(value);
    onBrushSizeChange(actualPercentage);
  };

  const handleColorSelect = (selectedColor: string) => {
    onColorChange(selectedColor, opacity);
    // Clear any active effect when selecting a color
    onEffectChange?.(AnnotationEffect.None);
    closePopover?.();
  };

  const handleEffectSelect = (effect: AnnotationEffect) => {
    // Set color to match the effect for the opacity slider gradient
    onColorChange(EFFECT_COLORS[effect], opacity);
    onEffectChange?.(effect);
    closePopover?.();
  };

  // Touch event handlers for better mobile support
  const handleTouchStart = (e: TouchEvent) => {
    // Prevent default to avoid conflicts with other touch interactions
    e.stopPropagation();
  };

  const handleTouchMove = (e: TouchEvent) => {
    // Prevent scrolling while adjusting sliders
    e.preventDefault();
    e.stopPropagation();
  };
</script>

<div class="drawingSliders">
  <div class="drawingSliders__slider">
    <Popover portal="body" positioning={{ placement: 'left', gutter: 12 }}>
      {#snippet trigger()}
        <button class="drawingSliders__colorSwatch" aria-label="Change annotation color or effect">
          {#if hasEffect}
            <EffectPreview effectType={currentEffect} size="2rem" shape="rounded" />
          {:else}
            <span class="drawingSliders__colorSwatchInner" style:background-color={color} style:opacity></span>
          {/if}
        </button>
      {/snippet}
      {#snippet content({ contentProps })}
        {@const _ = closePopover = contentProps.close}
        <div class="drawingSliders__swatchGrid">
          {#each COLORS as swatchColor}
            <button
              class="drawingSliders__gridItem"
              onclick={() => handleColorSelect(swatchColor)}
              aria-label="Select color {swatchColor}"
            >
              <span class="drawingSliders__gridSwatch" style:background-color={swatchColor}></span>
            </button>
          {/each}
          {#each EFFECTS as effect}
            <button
              class="drawingSliders__gridItem"
              onclick={() => handleEffectSelect(effect)}
              aria-label="Select effect"
            >
              <EffectPreview effectType={effect} size="2rem" shape="rounded" />
            </button>
          {/each}
        </div>
      {/snippet}
    </Popover>
    <input
      id="opacity-slider"
      type="range"
      class="drawingSliders__input drawingSliders__input--opacity"
      style="--slider-color: {color}"
      min="0"
      max="1"
      step="0.01"
      value={opacity}
      oninput={(e) => onOpacityChange(Number(e.currentTarget.value))}
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
    />
    <div class="drawingSliders__value">{Math.round(opacity * 100)}%</div>
  </div>

  <div class="drawingSliders__slider">
    <input
      id="brush-size-slider"
      type="range"
      class="drawingSliders__input"
      min="0"
      max="100"
      step="0.1"
      value={brushSliderValue}
      oninput={(e) => handleBrushSliderChange(Number(e.currentTarget.value))}
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
    />
    <div class="drawingSliders__value">{brushSize.toFixed(2)}%</div>
  </div>

  <IconButton
    variant="ghost"
    onclick={onLayersClick}
    aria-label="Toggle annotation layers panel"
    title="Manage drawing layers"
  >
    <Icon Icon={layerIcon} size="1.25rem" />
  </IconButton>
</div>

<style>
  .drawingSliders {
    position: absolute;
    top: 50%;
    right: 1rem;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    z-index: 10;
    pointer-events: auto;
    background-color: var(--bg);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    padding: 0.5rem 0rem;
    align-items: center;
  }

  .drawingSliders__slider {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .drawingSliders__input {
    writing-mode: vertical-lr;
    direction: rtl;
    width: 32px;
    height: 120px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--contrastLow);
    border-radius: var(--radius-1);
    cursor: pointer;
    touch-action: none; /* Prevent default touch behaviors */
    outline: none;
  }

  .drawingSliders__input--opacity {
    background: linear-gradient(to top, transparent, var(--slider-color));
  }

  /* Webkit browsers (Chrome, Safari, Edge) */
  .drawingSliders__input::-webkit-slider-track {
    width: 32px;
    height: 120px;
    background: transparent;
    border: none;
  }

  .drawingSliders__input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 32px;
    height: 14px;
    background: var(--contrastHigh);
    border: none;
    border-radius: var(--radius-1);
    cursor: grab;
    box-shadow: 0 0px 2px rgba(0, 0, 0, 0.2);
  }

  .drawingSliders__input::-webkit-slider-thumb:active {
    cursor: grabbing;
  }

  /* Firefox */
  .drawingSliders__input::-moz-range-track {
    width: 32px;
    height: 120px;
    background: var(--contrastLow);
    border-radius: var(--radius-2);
  }

  .drawingSliders__input--opacity::-moz-range-track {
    background: linear-gradient(to top, transparent, var(--slider-color));
  }

  .drawingSliders__input::-moz-range-thumb {
    width: 32px;
    height: 14px;
    background: var(--contrastHigh);
    border: none;
    border-radius: var(--radius-2);
    cursor: grab;
    box-shadow: 0 0px 2px rgba(0, 0, 0, 0.2);
  }

  .drawingSliders__input::-moz-range-thumb:active {
    cursor: grabbing;
  }

  .drawingSliders__value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--fg);
    min-width: 3rem;
    text-align: center;
  }

  .drawingSliders__colorSwatch {
    width: 2rem;
    height: 2rem;
    border-radius: var(--radius-2);
    cursor: pointer;
    transition: border-color 0.2s;
    padding: 0;
    border: none;
    background: transparent;
    overflow: hidden;
  }

  .drawingSliders__colorSwatchInner {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: var(--radius-2);
  }

  .drawingSliders__swatchGrid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    background-color: var(--bg);
    border-radius: var(--radius-2);
  }

  .drawingSliders__gridItem {
    width: 2rem;
    height: 2rem;
    border-radius: var(--radius-2);
    cursor: pointer;
    border: none;
    padding: 0;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .drawingSliders__gridSwatch {
    width: 2rem;
    height: 2rem;
    border-radius: var(--radius-1);
  }
</style>
