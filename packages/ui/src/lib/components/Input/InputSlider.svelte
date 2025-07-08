<script lang="ts">
  import type { InputSliderProps } from './types';
  import chroma from 'chroma-js';
  let { value = $bindable(), hex = '#666666', variant = 'default', ...restProps }: InputSliderProps = $props();

  const sliderClasses = $derived(['inputSlider', variant && `inputSlider--${variant}`, restProps.class ?? '']);

  const getLinearGradient = $derived(() => {
    if (!hex) return 'var(--fgMuted)';
    const colorStart = chroma(hex).alpha(0).css('rgb');
    const colorEnd = chroma(hex).css('rgb');
    return `linear-gradient(to right, ${colorStart}, ${colorEnd})`;
  });

  const background = $derived(() => {
    if (variant === 'opacity') {
      return getLinearGradient();
    } else {
      if (!hex) return 'var(--fgMuted)';
      return hex;
    }
  });
</script>

<div class="inputSliderWrapper">
  <input
    type="range"
    min="0"
    max="100"
    step="1"
    bind:value
    class={sliderClasses}
    style={`background: ${background()}`}
    {...restProps}
  />
</div>

<style>
  .inputSliderWrapper {
    width: 100%;
    display: flex;
    align-items: center;
    height: 2rem;
  }
  .inputSlider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 3px;
    cursor: pointer;
  }

  .inputSlider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    border: 2px solid white;
    background-color: transparent;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 1));
  }

  .inputSlider::-moz-range-thumb {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    border: 2px solid white;
    background-color: transparent;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 1));
  }
  @media (pointer: coarse) {
    .inputSlider {
      height: 0.75rem;
      border-radius: 0.25rem;
    }
    .inputSlider::-webkit-slider-thumb {
      width: 0.75rem;
      height: 0.75rem;
    }
    .inputSlider::-moz-range-thumb {
      width: 0.75rem;
      height: 0.75rem;
    }
  }
</style>
