<script lang="ts">
  interface Props {
    brushSize: number;
    onBrushSizeChange: (value: number) => void;
    min?: number;
    max?: number;
    curve?: 'linear' | 'quadratic';
  }

  let { brushSize, onBrushSizeChange, min = 1, max = 200, curve = 'quadratic' }: Props = $props();

  // For quadratic curve: size = coefficient * slider^2
  // We want: at slider=50%, size should be at the midpoint between min and max
  // midpoint = (min + max) / 2
  // So: midpoint = coefficient * 50^2
  // coefficient = midpoint / 2500
  const midpoint = (min + max) / 2;
  const coefficient = midpoint / 2500;

  const brushSizeToSlider = (size: number): number => {
    const clampedSize = Math.max(min, Math.min(max, size));

    if (curve === 'linear') {
      // Linear: map size range to 0-100 slider range
      return ((clampedSize - min) / (max - min)) * 100;
    } else {
      // Quadratic: inverse of size = coefficient * slider^2
      return Math.sqrt(clampedSize / coefficient);
    }
  };

  const sliderToBrushSize = (slider: number): number => {
    if (curve === 'linear') {
      // Linear mapping from slider (0-100) to size range (min-max)
      const size = min + (slider / 100) * (max - min);
      return Math.max(min, Math.min(max, Math.round(size)));
    } else {
      // Quadratic curve
      const size = coefficient * slider * slider;
      return Math.max(min, Math.min(max, Math.round(size)));
    }
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

<div class="brushSizeSlider">
  <input
    id="brush-size-slider"
    type="range"
    class="brushSizeSlider__input"
    min="0"
    max="100"
    step="0.1"
    value={brushSliderValue}
    oninput={(e) => handleBrushSliderChange(Number(e.currentTarget.value))}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
  />
  <div class="brushSizeSlider__value">{brushSize}</div>
</div>

<style>
  .brushSizeSlider {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .brushSizeSlider__input {
    writing-mode: vertical-lr;
    direction: rtl;
    width: 32px;
    height: 120px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--contrastLow);
    border-radius: var(--radius-1);
    cursor: pointer;
    touch-action: none;
    outline: none;
  }

  /* Webkit browsers (Chrome, Safari, Edge) */
  .brushSizeSlider__input::-webkit-slider-track {
    width: 32px;
    height: 120px;
    background: transparent;
    border: none;
  }

  .brushSizeSlider__input::-webkit-slider-thumb {
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

  .brushSizeSlider__input::-webkit-slider-thumb:active {
    cursor: grabbing;
  }

  /* Firefox */
  .brushSizeSlider__input::-moz-range-track {
    width: 32px;
    height: 120px;
    background: var(--contrastLow);
    border-radius: var(--radius-2);
  }

  .brushSizeSlider__input::-moz-range-thumb {
    width: 32px;
    height: 14px;
    background: var(--contrastHigh);
    border: none;
    border-radius: var(--radius-2);
    cursor: grab;
    box-shadow: 0 0px 2px rgba(0, 0, 0, 0.2);
  }

  .brushSizeSlider__input::-moz-range-thumb:active {
    cursor: grabbing;
  }

  .brushSizeSlider__value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--fg);
    min-width: 3rem;
    text-align: center;
  }
</style>
