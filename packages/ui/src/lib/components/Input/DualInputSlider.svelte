<script lang="ts">
  import { type DualInputSliderProps } from './types';

  let {
    valueStart = $bindable(),
    valueEnd = $bindable(),
    min,
    max,
    step,
    color = 'var(--fg)',
    ...restProps
  }: DualInputSliderProps = $props();

  const sliderClasses = $derived(['dualInputSlider', restProps.class ?? '']);

  function handleInputStart(event: Event) {
    let newValue = parseFloat((event.target as HTMLInputElement).value);
    newValue = Math.round(newValue / step) * step; // Fix floating-point precision
    valueStart = Math.min(newValue, valueEnd - step); // Ensure start does not exceed end
  }

  function handleInputEnd(event: Event) {
    let newValue = parseFloat((event.target as HTMLInputElement).value);
    newValue = Math.round(newValue / step) * step; // Fix floating-point precision
    valueEnd = Math.max(newValue, valueStart + step); // Ensure end is greater than start
  }

  // ✅ Corrected track position calculations
  const leftPos = $derived(() => ((valueStart - min) / (max - min)) * 100);
  const rightPos = $derived(() => 100 - ((valueEnd - min) / (max - min)) * 100);
</script>

<div class="dualInputSlider__wrap">
  <div class="dualInputSlider__bgTrack">
    <div
      class="dualInputSlider__activeTrack"
      style={`left: ${leftPos()}%;
            right: ${rightPos()}%;
            background: ${color};`}
    ></div>

    <input type="range" {min} {max} {step} bind:value={valueStart} oninput={handleInputStart} class={sliderClasses} />
    <input type="range" {min} {max} {step} bind:value={valueEnd} oninput={handleInputEnd} class={sliderClasses} />
  </div>
</div>

<style>
  .dualInputSlider__wrap {
    display: flex;
    width: 100%;
    align-items: center;
    height: 2rem;
  }
  .dualInputSlider__bgTrack {
    position: relative;
    width: 100%;
    height: 4px;
    display: flex;
    align-items: center;
    background: var(--inputBorderColor);
  }

  .dualInputSlider {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    appearance: none;
    position: absolute;
    width: 100%;
    height: 3px;
    pointer-events: none;
    top: 50%;
    transform: translateY(-50%);
    z-index: 3;
  }

  .dualInputSlider::-webkit-slider-thumb {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    border: 2px solid white;
    background-color: var(--inputBorderColor);
    box-shadow: 0 0 2px rgba(0, 0, 0, 1);
    pointer-events: all;
    cursor: pointer;
  }
  .dualInputSlider::-moz-range-thumb {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    border: 2px solid white;
    background-color: var(--inputBorderColor);
    box-shadow: 0 0 2px rgba(0, 0, 0, 1);
    pointer-events: all;
    cursor: pointer;
  }

  .dualInputSlider__activeTrack {
    position: absolute;
    z-index: 1;
    height: 3px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    z-index: 2;
  }

  @media (pointer: coarse) {
    .dualInputSlider__activeTrack {
      height: 0.75rem;
      border-radius: 0.25rem;
    }
    .dualInputSlider__bgTrack {
      height: 0.75rem;
      border-radius: 0.25rem;
    }
    .dualInputSlider::-webkit-slider-thumb {
      width: 0.75rem;
      height: 0.75rem;
    }
    .dualInputSlider::-moz-range-thumb {
      width: 0.75rem;
      height: 0.75rem;
    }
  }
</style>
