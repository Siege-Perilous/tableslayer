<script lang="ts">
  import { Popover } from '../Popover';
  import { ColorPicker } from '../ColorPicker';
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

  interface Props {
    opacity: number;
    brushSize: number;
    color: string;
    activeLayerIndex: number;
    onOpacityChange: (value: number) => void;
    onBrushSizeChange: (value: number) => void;
    onColorChange: (color: string, opacity: number) => void;
    onLayersClick: () => void;
  }

  let {
    opacity,
    brushSize,
    color,
    activeLayerIndex,
    onOpacityChange,
    onBrushSizeChange,
    onColorChange,
    onLayersClick
  }: Props = $props();

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

  // Use quadratic curve for brush size to give more precision to lower values
  // At 50% slider we want size 50, so we use: size = 0.02 * slider^2
  // This gives: 0% → 1, 50% → 50, 100% → 200
  const brushSizeToSlider = (size: number): number => {
    // Inverse: slider = sqrt(size / 0.02)
    // Clamp to minimum of 1
    const clampedSize = Math.max(1, size);
    return Math.sqrt(clampedSize / 0.02);
  };

  const sliderToBrushSize = (slider: number): number => {
    // Quadratic curve: size = 0.02 * slider^2
    const size = 0.02 * slider * slider;
    return Math.max(1, Math.round(size));
  };

  let brushSliderValue = $derived(brushSizeToSlider(brushSize));

  const handleBrushSliderChange = (value: number) => {
    const actualSize = sliderToBrushSize(value);
    onBrushSizeChange(actualSize);
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
    <Popover portal="body">
      {#snippet trigger()}
        <button
          class="drawingSliders__colorSwatch"
          style:background-color={color}
          style:opacity
          aria-label="Change annotation color"
        ></button>
      {/snippet}
      {#snippet content()}
        <div class="ColorPicker-container">
          <ColorPicker
            showOpacity={true}
            hex={color +
              Math.round(opacity * 255)
                .toString(16)
                .padStart(2, '0')}
            onUpdate={(colorData) => onColorChange(colorData.hex.slice(0, 7), colorData.rgba.a)}
          />
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
    <div class="drawingSliders__value">{brushSize}</div>
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
  }

  :global(.drawingSliders .ColorPicker-container) {
    padding: 1rem;
  }
</style>
