<script lang="ts">
  import { onMount } from 'svelte';
  import { Input } from '../';

  interface ColorState {
    hue: number;
    saturation: number;
    value: number;
    opacity: number;
    isSelecting: boolean;
  }

  const color = $state<ColorState>({
    hue: 0,
    saturation: 100,
    value: 100,
    opacity: 100,
    isSelecting: false
  });

  let canvasElement: HTMLCanvasElement;
  let hexInput = $state('');
  let hexInputFocused = false;

  const toHex = (color: { hue: number; saturation: number; value: number; opacity: number }): string => {
    const { hue, saturation, value, opacity } = color;
    const [r, g, b] = hsvToRgb(hue, saturation, value);
    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');
    const alpha = Math.round((opacity / 100) * 255)
      .toString(16)
      .padStart(2, '0');
    return `#${rHex}${gHex}${bHex}${alpha}`;
  };

  const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
    h = h % 360;
    s /= 100;
    v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r1 = 0,
      g1 = 0,
      b1 = 0;

    if (h >= 0 && h < 60) {
      [r1, g1, b1] = [c, x, 0];
    } else if (h >= 60 && h < 120) {
      [r1, g1, b1] = [x, c, 0];
    } else if (h >= 120 && h < 180) {
      [r1, g1, b1] = [0, c, x];
    } else if (h >= 180 && h < 240) {
      [r1, g1, b1] = [0, x, c];
    } else if (h >= 240 && h < 300) {
      [r1, g1, b1] = [x, 0, c];
    } else {
      [r1, g1, b1] = [c, 0, x];
    }

    const r = Math.round((r1 + m) * 255);
    const g = Math.round((g1 + m) * 255);
    const b = Math.round((b1 + m) * 255);

    return [r, g, b];
  };

  const hexToRgba = (hex: string): [number, number, number, number] | null => {
    hex = hex.replace(/^#/, '');

    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char: string) => char + char)
        .join('');
    }

    if (hex.length === 6) {
      hex += 'FF';
    }

    if (hex.length !== 8) {
      return null;
    }

    const bigint = parseInt(hex, 16);
    const r = (bigint >> 24) & 255;
    const g = (bigint >> 16) & 255;
    const b = (bigint >> 8) & 255;
    const a = bigint & 255;

    return [r, g, b, a];
  };

  const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    const v = max;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;

    if (d !== 0) {
      if (max === r) {
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      } else if (max === g) {
        h = ((b - r) / d + 2) * 60;
      } else if (max === b) {
        h = ((r - g) / d + 4) * 60;
      }
    }

    return [h % 360, s * 100, v * 100];
  };

  const drawSaturationValueGradient = (): void => {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;
    const width = canvasElement.width;
    const height = canvasElement.height;

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Create saturation gradient
    const saturationGradient = ctx.createLinearGradient(0, 0, width, 0);
    saturationGradient.addColorStop(0, 'white');
    saturationGradient.addColorStop(1, `hsl(${color.hue}, 100%, 50%)`);
    ctx.fillStyle = saturationGradient;
    ctx.fillRect(0, 0, width, height);

    // Create value gradient
    const valueGradient = ctx.createLinearGradient(0, 0, 0, height);
    valueGradient.addColorStop(0, 'rgba(0,0,0,0)');
    valueGradient.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = valueGradient;
    ctx.fillRect(0, 0, width, height);
  };

  let saturationBoxRect: DOMRect;

  const updateSaturationValue = (e: MouseEvent): void => {
    if (!saturationBoxRect) return;
    const rect = saturationBoxRect;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    color.saturation = Math.max(0, Math.min(100, (x / rect.width) * 100));
    color.value = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
  };

  const startSelection = (e: MouseEvent): void => {
    e.preventDefault();
    saturationBoxRect = canvasElement.getBoundingClientRect();
    color.isSelecting = true;
    updateSaturationValue(e);
  };

  const endSelection = (): void => {
    color.isSelecting = false;
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (color.isSelecting) {
      updateSaturationValue(e);
    }
  };

  const handleMouseUp = (): void => {
    if (color.isSelecting) {
      endSelection();
    }
  };

  const getOpacityGradient = (): string => {
    const [r, g, b] = hsvToRgb(color.hue, color.saturation, color.value);
    return `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0), rgba(${r}, ${g}, ${b}, 1))`;
  };

  onMount(() => {
    if (canvasElement) {
      drawSaturationValueGradient();
    }
    // Initialize hexInput
    hexInput = toHex(color);
  });

  // Update hexInput when color changes, but not if input is focused
  $effect(() => {
    if (!hexInputFocused) {
      hexInput = toHex(color);
    }
    drawSaturationValueGradient();
  });

  // Handle hexInput changes on blur (when input loses focus)
  const handleHexInputBlur = (): void => {
    hexInputFocused = false;
    const rgba = hexToRgba(hexInput);
    if (rgba) {
      const [r, g, b, a] = rgba;
      const [h, s, v] = rgbToHsv(r, g, b);

      color.hue = h;
      color.saturation = s;
      color.value = v;
      color.opacity = (a / 255) * 100;
    } else {
      // If invalid, reset hexInput to current color
      hexInput = toHex(color);
    }
  };
</script>

<svelte:window on:mousemove={handleMouseMove} on:mouseup={handleMouseUp} />

<div class="colorPicker">
  <!-- Saturation/Value Selector -->
  <div class="colorPicker__box">
    <canvas class="colorPicker__canvas" bind:this={canvasElement} width="200" height="200" onmousedown={startSelection}
    ></canvas>
    <!-- Selection Indicator -->
    <div
      class="colorPicker__boxIndicator"
      style="top: {100 - color.value}%; left: {color.saturation}%; background-color: {toHex(color)};"
    ></div>
  </div>

  <!-- Hue Slider -->
  <input
    type="range"
    min="0"
    max="360"
    bind:value={color.hue}
    aria-label="Hue Selector"
    class="colorPicker__slider colorPicker__slider--hue"
    style="--slider-hue: {color.hue};"
  />

  <!-- Opacity Slider -->
  <input
    type="range"
    min="0"
    max="100"
    bind:value={color.opacity}
    aria-label="Opacity Slider"
    class="colorPicker__slider colorPicker__slider--opacity"
    style="--slider-hue: {color.hue}; background: {getOpacityGradient()};"
  />

  <!-- Color Display and Hex Input -->
  <div class="colorPicker__output" style="background-color: {toHex(color)};"></div>
  <Input
    type="text"
    bind:value={hexInput}
    aria-label="Hex Color Input"
    onfocus={() => (hexInputFocused = true)}
    onblur={handleHexInputBlur}
  />
</div>

<style>
  .colorPicker {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .colorPicker__box {
    width: 8rem;
    height: 4rem;
    position: relative;
    cursor: crosshair;
  }

  .colorPicker__canvas {
    width: 100%;
    height: 100%;
  }

  .colorPicker__boxIndicator {
    position: absolute;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    border: 2px solid white;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .colorPicker__slider {
    -webkit-appearance: none;
    appearance: none;
    width: 8rem;
    height: 0.25rem;
    margin-top: 0.5rem;
    cursor: pointer;
    background: transparent;
  }

  .colorPicker__slider--hue {
    background: linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red);
  }

  .colorPicker__slider--opacity {
    background-size: cover;
  }

  .colorPicker__slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    border: 2px solid white;
    background: hsl(var(--slider-hue), 100%, 50%);
  }

  .colorPicker__slider::-moz-range-thumb {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    border: 2px solid white;
    background: hsl(var(--slider-hue), 100%, 50%);
  }

  .colorPicker__output {
    width: 50px;
    height: 50px;
    margin-top: 10px;
  }
</style>
