<script lang="ts">
  interface Props {
    brushSize: number;
    onBrushSizeChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    displayUnit?: string;
  }

  let { brushSize, onBrushSizeChange, min = 1, max = 5, step = 1, displayUnit }: Props = $props();

  const handleBrushSliderChange = (value: number) => {
    onBrushSizeChange(Math.max(min, Math.min(max, value)));
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
    {min}
    {max}
    {step}
    value={brushSize}
    oninput={(e) => handleBrushSliderChange(Number(e.currentTarget.value))}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
  />
  <div class="brushSizeSlider__value">
    {Number(brushSize.toFixed(2))}{displayUnit ? ` ${displayUnit}` : ''}
  </div>
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
