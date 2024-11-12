<script lang="ts">
  import { onMount } from 'svelte';
  import { Input } from '../'; // Assuming you have Input and Select components

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
  let colorInputFocused = false;
  let selectedFormat = $state<'hex' | 'rgb' | 'hsl' | 'hsv'>('hex');

  // Input fields for different color modes
  let hexInput = $state('');
  let rgbInputs = $state({ r: '', g: '', b: '', a: '' });
  let hslInputs = $state({ h: '', s: '', l: '', a: '' });
  let hsvInputs = $state({ h: '', s: '', v: '', a: '' });

  const toHex = (color: ColorState): string => {
    const [r, g, b] = hsvToRgb(color.hue, color.saturation, color.value);
    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');
    const alpha = Math.round((color.opacity / 100) * 255)
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

  const hsvToHsl = (h: number, s: number, v: number): [number, number, number] => {
    s /= 100;
    v /= 100;
    const l = v * (1 - s / 2);
    const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
    return [h, sl * 100, l * 100];
  };

  const hslToHsv = (h: number, s: number, l: number): [number, number, number] => {
    s /= 100;
    l /= 100;
    const v = l + s * Math.min(l, 1 - l);
    const sv = v === 0 ? 0 : 2 * (1 - l / v);
    return [h, sv * 100, v * 100];
  };

  // Added hexToRgba function
  const hexToRgba = (hex: string): [number, number, number, number] | null => {
    hex = hex.replace(/^#/, '');

    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char: string) => char + char)
        .join('');
    }

    if (hex.length === 6) {
      hex += 'FF'; // Add full opacity if alpha is not specified
    }

    if (hex.length !== 8) {
      return null; // Invalid hex color
    }

    const bigint = parseInt(hex, 16);
    const r = (bigint >> 24) & 255;
    const g = (bigint >> 16) & 255;
    const b = (bigint >> 8) & 255;
    const a = bigint & 255;

    return [r, g, b, a];
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
    // Initialize inputs
    updateColorInputs();
  });

  // Function to update color inputs based on selectedFormat and color state
  const updateColorInputs = () => {
    const [r, g, b] = hsvToRgb(color.hue, color.saturation, color.value);
    switch (selectedFormat) {
      case 'hex': {
        hexInput = toHex(color);
        break;
      }
      case 'rgb': {
        rgbInputs.r = r.toString();
        rgbInputs.g = g.toString();
        rgbInputs.b = b.toString();
        rgbInputs.a = (color.opacity / 100).toFixed(2);
        break;
      }
      case 'hsl': {
        const [h, s, l] = hsvToHsl(color.hue, color.saturation, color.value);
        hslInputs.h = Math.round(h).toString();
        hslInputs.s = Math.round(s).toString();
        hslInputs.l = Math.round(l).toString();
        hslInputs.a = (color.opacity / 100).toFixed(2);
        break;
      }
      case 'hsv': {
        hsvInputs.h = Math.round(color.hue).toString();
        hsvInputs.s = Math.round(color.saturation).toString();
        hsvInputs.v = Math.round(color.value).toString();
        hsvInputs.a = (color.opacity / 100).toFixed(2);
        break;
      }
    }
  };

  // Function to parse inputs and update color state
  const parseColorInputs = () => {
    try {
      switch (selectedFormat) {
        case 'hex': {
          const hex = hexInput.trim();
          if (hex) {
            const rgba = hexToRgba(hex);
            if (rgba) {
              const [r, g, b, a] = rgba;
              const [h, s, v] = rgbToHsv(r, g, b);
              color.hue = h;
              color.saturation = s;
              color.value = v;
              color.opacity = (a / 255) * 100;
            }
          }
          break;
        }
        case 'rgb': {
          const r = parseInt(rgbInputs.r);
          const g = parseInt(rgbInputs.g);
          const b = parseInt(rgbInputs.b);
          const a = parseFloat(rgbInputs.a);
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            const [h, s, v] = rgbToHsv(r, g, b);
            color.hue = h;
            color.saturation = s;
            color.value = v;
            if (!isNaN(a)) {
              color.opacity = a * 100;
            }
          }
          break;
        }
        case 'hsl': {
          const h = parseFloat(hslInputs.h);
          const s = parseFloat(hslInputs.s);
          const l = parseFloat(hslInputs.l);
          const a = parseFloat(hslInputs.a);
          if (!isNaN(h) && !isNaN(s) && !isNaN(l)) {
            const [newH, newS, newV] = hslToHsv(h, s, l);
            color.hue = newH;
            color.saturation = newS;
            color.value = newV;
            if (!isNaN(a)) {
              color.opacity = a * 100;
            }
          }
          break;
        }
        case 'hsv': {
          const h = parseFloat(hsvInputs.h);
          const s = parseFloat(hsvInputs.s);
          const v = parseFloat(hsvInputs.v);
          const a = parseFloat(hsvInputs.a);
          if (!isNaN(h) && !isNaN(s) && !isNaN(v)) {
            color.hue = h;
            color.saturation = s;
            color.value = v;
            if (!isNaN(a)) {
              color.opacity = a * 100;
            }
          }
          break;
        }
      }
    } catch (error) {
      // Invalid input; reset inputs to current color
      console.error(error);
      updateColorInputs();
    }
  };

  // Update inputs when color changes, but not if input is focused
  $effect(() => {
    if (!colorInputFocused) {
      updateColorInputs();
    }
    drawSaturationValueGradient();
  });

  // Handle input changes on blur (when input loses focus)
  const handleInputsBlur = (): void => {
    colorInputFocused = false;
    parseColorInputs();
    updateColorInputs();
  };

  // Update inputs when format changes
  $effect(() => {
    updateColorInputs();
  });
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

  <!-- Format Selector -->
  <select bind:value={selectedFormat}>
    <option value="hex">HEX</option>
    <option value="rgb">RGB</option>
    <option value="hsl">HSL</option>
    <option value="hsv">HSV</option>
  </select>

  <!-- Color Display -->
  <div class="colorPicker__output" style="background-color: {toHex(color)};"></div>

  <!-- Inputs based on selected format -->
  {#if selectedFormat === 'hex'}
    <Input
      type="text"
      bind:value={hexInput}
      aria-label="Hex Color Input"
      onfocus={() => (colorInputFocused = true)}
      onblur={handleInputsBlur}
    />
  {:else if selectedFormat === 'rgb'}
    <div class="colorPicker__inputs">
      <Input
        type="number"
        min="0"
        max="255"
        bind:value={rgbInputs.r}
        aria-label="Red"
        placeholder="R"
        onfocus={() => (colorInputFocused = true)}
        onblur={handleInputsBlur}
      />
      <Input
        type="number"
        min="0"
        max="255"
        bind:value={rgbInputs.g}
        aria-label="Green"
        placeholder="G"
        onfocus={() => (colorInputFocused = true)}
        onblur={handleInputsBlur}
      />
      <Input
        type="number"
        min="0"
        max="255"
        bind:value={rgbInputs.b}
        aria-label="Blue"
        placeholder="B"
        onfocus={() => (colorInputFocused = true)}
        onblur={handleInputsBlur}
      />
      <Input
        type="number"
        min="0"
        max="1"
        step="0.01"
        bind:value={rgbInputs.a}
        aria-label="Alpha"
        placeholder="A"
        onfocus={() => (colorInputFocused = true)}
        onblur={handleInputsBlur}
      />
    </div>
  {:else if selectedFormat === 'hsl'}
    <div class="colorPicker__inputs">
      <Input
        type="number"
        min="0"
        max="360"
        bind:value={hslInputs.h}
        aria-label="Hue"
        placeholder="H"
        onfocus={() => (colorInputFocused = true)}
        onblur={handleInputsBlur}
      />
      <Input
        type="number"
        min="0"
        max="100"
        bind:value={hslInputs.s}
        aria-label="Saturation"
        placeholder="S"
        on:focus={() => (colorInputFocused = true)}
        on:blur={handleInputsBlur}
      />
      <Input
        type="number"
        min="0"
        max="100"
        bind:value={hslInputs.l}
        aria-label="Lightness"
        placeholder="L"
        onfocus={() => (colorInputFocused = true)}
        onblur={handleInputsBlur}
      />
      <Input
        type="number"
        min="0"
        max="1"
        step="0.01"
        bind:value={hslInputs.a}
        aria-label="Alpha"
        placeholder="A"
        onfocus={() => (colorInputFocused = true)}
        onblur={handleInputsBlur}
      />
    </div>
  {:else if selectedFormat === 'hsv'}
    <div class="colorPicker__inputs">
      <Input
        type="number"
        min="0"
        max="360"
        bind:value={hsvInputs.h}
        aria-label="Hue"
        placeholder="H"
        onfocus={() => (colorInputFocused = true)}
        onblur={handleInputsBlur}
      />
      <Input
        type="number"
        min="0"
        max="100"
        bind:value={hsvInputs.s}
        aria-label="Saturation"
        placeholder="S"
        onfocus={() => (colorInputFocused = true)}
        onblur={handleInputsBlur}
      />
      <Input
        type="number"
        min="0"
        max="100"
        bind:value={hsvInputs.v}
        aria-label="Value"
        placeholder="V"
        onfocus={() => (colorInputFocused = true)}
        onblur={handleInputsBlur}
      />
      <Input
        type="number"
        min="0"
        max="1"
        step="0.01"
        bind:value={hsvInputs.a}
        aria-label="Alpha"
        placeholder="A"
        onfocus={() => (colorInputFocused = true)}
        onblur={handleInputsBlur}
      />
    </div>
  {/if}
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

  .colorPicker__inputs {
    display: flex;
    gap: 0.5rem;
  }
</style>
