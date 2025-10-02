<script lang="ts">
  interface Props {
    opacity: number;
    brushSize: number;
    onOpacityChange: (value: number) => void;
    onBrushSizeChange: (value: number) => void;
  }

  let { opacity, brushSize, onOpacityChange, onBrushSizeChange }: Props = $props();

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
</script>

<div class="drawingSliders">
  <div class="drawingSliders__slider">
    <label class="drawingSliders__label" for="opacity-slider">Opacity</label>
    <input
      id="opacity-slider"
      type="range"
      class="drawingSliders__input"
      min="0"
      max="1"
      step="0.01"
      value={opacity}
      oninput={(e) => onOpacityChange(Number(e.currentTarget.value))}
      orient="vertical"
    />
    <div class="drawingSliders__value">{Math.round(opacity * 100)}%</div>
  </div>

  <div class="drawingSliders__slider">
    <label class="drawingSliders__label" for="brush-size-slider">Size</label>
    <input
      id="brush-size-slider"
      type="range"
      class="drawingSliders__input"
      min="0"
      max="100"
      step="0.1"
      value={brushSliderValue}
      oninput={(e) => handleBrushSliderChange(Number(e.currentTarget.value))}
      orient="vertical"
    />
    <div class="drawingSliders__value">{brushSize}</div>
  </div>
</div>

<style>
  .drawingSliders {
    position: absolute;
    top: 50%;
    right: 1rem;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 2rem;
    z-index: 10;
    pointer-events: auto;
  }

  .drawingSliders__slider {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    background-color: var(--bg);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    padding: 1rem 0.75rem;
  }

  .drawingSliders__label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--fgMuted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .drawingSliders__input {
    writing-mode: vertical-lr;
    direction: rtl;
    width: 8px;
    height: 120px;
    -webkit-appearance: slider-vertical;
    appearance: slider-vertical;
    background: transparent;
    cursor: pointer;
  }

  /* Webkit browsers (Chrome, Safari, Edge) */
  .drawingSliders__input::-webkit-slider-track {
    width: 8px;
    background: var(--contrastMedium);
    border-radius: var(--radius-1);
  }

  .drawingSliders__input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    background: var(--fgPrimary);
    border: 2px solid var(--bg);
    border-radius: 50%;
    cursor: grab;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .drawingSliders__input::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .drawingSliders__input::-webkit-slider-thumb:active {
    cursor: grabbing;
    transform: scale(1.05);
  }

  /* Firefox */
  .drawingSliders__input::-moz-range-track {
    width: 8px;
    background: var(--contrastMedium);
    border-radius: var(--radius-1);
  }

  .drawingSliders__input::-moz-range-thumb {
    width: 24px;
    height: 24px;
    background: var(--fgPrimary);
    border: 2px solid var(--bg);
    border-radius: 50%;
    cursor: grab;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .drawingSliders__input::-moz-range-thumb:hover {
    transform: scale(1.1);
  }

  .drawingSliders__input::-moz-range-thumb:active {
    cursor: grabbing;
    transform: scale(1.05);
  }

  .drawingSliders__value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--fg);
    min-width: 3rem;
    text-align: center;
  }
</style>
