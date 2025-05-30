<script lang="ts">
  import { onMount } from 'svelte';
  import { Input, Select } from '../'; // Adjust the import path based on your project structure
  import type { ColorState, ColorPickerFormats, ColorPickerProps } from './types';
  import chroma from 'chroma-js';

  // Bindable props with correct syntax and typings
  let {
    hex = $bindable<string>(''),
    rgba = $bindable(),
    hsva = $bindable(),
    hsla = $bindable(),
    showInputs = false,
    showOpacity = true,
    onUpdate = () => {},
    id,
    ...restProps
  }: ColorPickerProps = $props();

  const color = $state<ColorState>({
    hue: 0,
    saturation: 100,
    value: 100,
    opacity: 100,
    isSelecting: false,
    isAdjustingSV: false,
    isAdjustingHue: false
  });

  let lastValidHue = color.hue;

  let canvasElement: HTMLCanvasElement;
  let colorInputFocused = false;
  let selectedFormat = $state<ColorPickerFormats>('hex');

  // Input fields for different color modes
  let hexInput = $state('');
  let rgbInputs = $state({ r: '', g: '', b: '', a: '' });
  let hslInputs = $state({ h: '', s: '', l: '', a: '' });
  let hsvInputs = $state({ h: '', s: '', v: '', a: '' });

  // Helper Functions using chroma-js
  const toHex = (color: ColorState): string => {
    const alpha = color.opacity / 100;
    const chromaColor = chroma.hsv(color.hue, color.saturation / 100, color.value / 100).alpha(alpha);
    if (showOpacity) {
      return chromaColor.hex();
    } else {
      return chromaColor.hex().slice(0, 7); // Return only 6-digit hex without alpha
    }
  };

  const drawSaturationValueGradient = (): void => {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;
    const width = canvasElement.width;
    const height = canvasElement.height;

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    const saturationGradient = ctx.createLinearGradient(0, 0, width, 0);
    saturationGradient.addColorStop(0, 'white');
    saturationGradient.addColorStop(1, `hsl(${displayHue()}, 100%, 50%)`);
    ctx.fillStyle = saturationGradient;
    ctx.fillRect(0, 0, width, height);

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
    color.isAdjustingSV = true;
    updateSaturationValue(e);
  };

  const endSelection = (): void => {
    color.isSelecting = false;
    color.isAdjustingSV = false;
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

  // Touch event handlers
  const updateSaturationValueFromTouch = (e: TouchEvent): void => {
    if (!saturationBoxRect) return;
    const rect = saturationBoxRect;
    const touch = e.touches[0] || e.changedTouches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    color.saturation = Math.max(0, Math.min(100, (x / rect.width) * 100));
    color.value = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
  };

  const startTouchSelection = (e: TouchEvent): void => {
    e.preventDefault();
    saturationBoxRect = canvasElement.getBoundingClientRect();
    color.isSelecting = true;
    color.isAdjustingSV = true;
    updateSaturationValueFromTouch(e);
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (color.isSelecting) {
      e.preventDefault();
      updateSaturationValueFromTouch(e);
    }
  };

  const handleTouchEnd = (): void => {
    if (color.isSelecting) {
      endSelection();
    }
  };

  const getOpacityGradient = (): string => {
    const chromaColor = chroma.hsv(displayHue(), color.saturation / 100, color.value / 100);
    const [r, g, b] = chromaColor.rgb();
    const rgba0 = `rgba(${r}, ${g}, ${b}, 0)`;
    const rgba1 = `rgba(${r}, ${g}, ${b}, 1)`;
    return `linear-gradient(to right, ${rgba0}, ${rgba1})`;
  };

  // Synchronize internal color state with bindable props
  let updatingFromProps = false;

  // Update internal color state when bindable props change
  $effect(() => {
    if (colorInputFocused || updatingFromProps) return;

    updatingFromProps = true;

    if (!color.isAdjustingSV) {
      if (hex && hex.trim()) {
        try {
          const chromaColor = chroma(hex.trim());
          const [h, s, v] = chromaColor.hsv();
          const alpha = chromaColor.alpha();
          if (!isNaN(h)) {
            color.hue = h;
            lastValidHue = h;
          } else {
            color.hue = lastValidHue;
          }
          color.saturation = s * 100;
          color.value = v * 100;
          color.opacity = alpha * 100;
        } catch (error) {
          console.log(error);
          // Invalid hex code
        }
      } else if (rgba) {
        const { r, g, b, a } = rgba;
        if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
          const chromaColor = chroma.rgb(r, g, b).alpha(a);
          const [h, s, v] = chromaColor.hsv();
          if (!isNaN(h)) {
            color.hue = h;
            lastValidHue = h;
          } else {
            color.hue = lastValidHue;
          }
          color.saturation = s * 100;
          color.value = v * 100;
          color.opacity = chromaColor.alpha() * 100;
        }
      } else if (hsva) {
        const { h, s, v, a } = hsva;
        if (!isNaN(h)) {
          color.hue = h;
          lastValidHue = h;
        } else {
          color.hue = lastValidHue;
        }
        color.saturation = s;
        color.value = v;
        color.opacity = a * 100;
      } else if (hsla) {
        const { h, s, l, a } = hsla;
        const chromaColor = chroma.hsl(h, s / 100, l / 100).alpha(a);
        const [h2, s2, v] = chromaColor.hsv();
        if (!isNaN(h2)) {
          color.hue = h2;
          lastValidHue = h2;
        } else {
          color.hue = lastValidHue;
        }
        color.saturation = s2 * 100;
        color.value = v * 100;
        color.opacity = chromaColor.alpha() * 100;
      }
    }

    updatingFromProps = false;
  });

  // Update bindable props when internal color state changes
  let previousColor = { ...color };

  $effect(() => {
    if (updatingFromProps) return;

    const hueChanged = color.hue !== previousColor.hue && !isNaN(color.hue);
    const satChanged = color.saturation !== previousColor.saturation;
    const valChanged = color.value !== previousColor.value;
    const opacityChanged = color.opacity !== previousColor.opacity;

    if (hueChanged || satChanged || valChanged || opacityChanged) {
      if (!color.isAdjustingSV) {
        if (hueChanged) {
          lastValidHue = color.hue;
        }
      } else {
        // When adjusting SV, keep the hue constant
        color.hue = lastValidHue;
      }

      // Compute color representations using chroma-js
      const opacity = showOpacity ? color.opacity / 100 : 1;
      const chromaColor = chroma.hsv(displayHue(), color.saturation / 100, color.value / 100).alpha(opacity);

      const [r, g, b] = chromaColor.rgb();
      let newHex;
      if (showOpacity) {
        newHex = chromaColor.hex();
      } else {
        newHex = chromaColor.hex().slice(0, 7); // Return only 6-digit hex without alpha
      }
      const newRgba = { r, g, b, a: chromaColor.alpha() };
      const [hHSL, sHSL, lHSL] = chromaColor.hsl();
      const newHsla = { h: hHSL, s: sHSL * 100, l: lHSL * 100, a: chromaColor.alpha() };
      const [hHSV, sHSV, vHSV] = chromaColor.hsv();
      const newHsva = { h: hHSV, s: sHSV * 100, v: vHSV * 100, a: chromaColor.alpha() };

      // Update bindable props
      hex = newHex;
      rgba = newRgba;
      hsla = newHsla;
      hsva = newHsva;

      // Call onUpdate
      onUpdate({ hex: newHex, rgba: newRgba, hsva: newHsva, hsla: newHsla });

      previousColor = { ...color };
    }
  });

  // Function to update color inputs based on selectedFormat and color state
  const updateColorInputs = () => {
    const chromaColor = chroma.hsv(color.hue, color.saturation / 100, color.value / 100).alpha(color.opacity / 100);

    switch (selectedFormat) {
      case 'hex': {
        hexInput = toHex(color);
        break;
      }
      case 'rgb': {
        const [r, g, b] = chromaColor.rgb();
        rgbInputs = {
          r: r.toString(),
          g: g.toString(),
          b: b.toString(),
          a: chromaColor.alpha().toFixed(2)
        };
        break;
      }
      case 'hsl': {
        const [h, s, l] = chromaColor.hsl();
        hslInputs = {
          h: Math.round(h).toString(),
          s: Math.round(s * 100).toString(),
          l: Math.round(l * 100).toString(),
          a: chromaColor.alpha().toFixed(2)
        };
        break;
      }
      case 'hsv': {
        const [h, s, v] = chromaColor.hsv();
        hsvInputs = {
          h: Math.round(h).toString(),
          s: Math.round(s * 100).toString(),
          v: Math.round(v * 100).toString(),
          a: chromaColor.alpha().toFixed(2)
        };
        break;
      }
    }
  };

  // Function to parse inputs and update color state
  const parseColorInputs = () => {
    try {
      switch (selectedFormat) {
        case 'hex': {
          const hexValue = hexInput.trim();
          // Regular expression for either 6-digit or 8-digit hex
          if (/^#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(hexValue)) {
            const chromaColor = chroma(hexValue);
            const [h, s, v] = chromaColor.hsv();
            if (!isNaN(h)) {
              color.hue = h;
              lastValidHue = h;
            } else {
              color.hue = lastValidHue;
            }
            color.saturation = s * 100;
            color.value = v * 100;
            // Only update opacity if we're showing the opacity slider
            if (showOpacity) {
              color.opacity = chromaColor.alpha() * 100;
            } else {
              color.opacity = 100; // Always full opacity when showOpacity is false
            }
          } else {
            console.error('Invalid hex code');
          }
          break;
        }
        case 'rgb': {
          const r = parseInt(rgbInputs.r);
          const g = parseInt(rgbInputs.g);
          const b = parseInt(rgbInputs.b);
          const a = parseFloat(rgbInputs.a);
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            const chromaColor = chroma.rgb(r, g, b).alpha(a);
            const [h, s, v] = chromaColor.hsv();
            if (!isNaN(h)) {
              color.hue = h;
              lastValidHue = h;
            } else {
              color.hue = lastValidHue;
            }
            color.saturation = s * 100;
            color.value = v * 100;
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
            const chromaColor = chroma.hsl(h, s / 100, l / 100).alpha(a);
            const [h2, s2, v] = chromaColor.hsv();
            if (!isNaN(h2)) {
              color.hue = h2;
              lastValidHue = h2;
            } else {
              color.hue = lastValidHue;
            }
            color.saturation = s2 * 100;
            color.value = v * 100;
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
            if (!isNaN(h)) {
              color.hue = h;
              lastValidHue = h;
            } else {
              color.hue = lastValidHue;
            }
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

  // Keyboard event handler for adjusting saturation and value
  const handleKeyDown = (e: KeyboardEvent): void => {
    const step = 2; // Adjust this step size as needed for fine control

    // Handle the arrow keys for movement
    switch (e.key) {
      case 'ArrowUp':
        color.value = Math.min(100, color.value + step);
        e.preventDefault(); // Prevent default scrolling
        break;
      case 'ArrowDown':
        color.value = Math.max(0, color.value - step);
        e.preventDefault(); // Prevent default scrolling
        break;
      case 'ArrowLeft':
        color.saturation = Math.max(0, color.saturation - step);
        e.preventDefault(); // Prevent default scrolling
        break;
      case 'ArrowRight':
        color.saturation = Math.min(100, color.saturation + step);
        e.preventDefault(); // Prevent default scrolling
        break;
      case 'Tab':
        // Allow default behavior for Tab key to prevent focus lock
        return;
    }
  };

  // Function to start focusing and adjusting the saturation/value box
  const startSaturationAdjustment = () => {
    color.isAdjustingSV = true;
  };

  // Function to end focusing and adjusting the saturation/value box
  const endSaturationAdjustment = () => {
    color.isAdjustingSV = false;
  };

  // onMount
  onMount(() => {
    if (canvasElement) {
      drawSaturationValueGradient();
    }
    // Initialize inputs
    updateColorInputs();
  });

  const displayHue = () => (isNaN(color.hue) ? lastValidHue : color.hue);

  // @ts-expect-error Can't figure out how to type this to FormatOption
  const handleFormatChange = (selected) => {
    selectedFormat = selected[0];
    updateColorInputs();
  };

  const formatOptions = [
    { value: 'hex', label: 'HEX' },
    { value: 'rgb', label: 'RGB' },
    { value: 'hsl', label: 'HSL' },
    { value: 'hsv', label: 'HSV' }
  ];
</script>

<svelte:window
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
/>

<div class="colorPicker" {...restProps}>
  <!-- Saturation/Value Selector -->
  <div class="colorPicker__box">
    <canvas
      class="colorPicker__canvas"
      bind:this={canvasElement}
      width="200"
      height="200"
      tabindex="0"
      onmousedown={startSelection}
      ontouchstart={startTouchSelection}
      onfocus={startSaturationAdjustment}
      onblur={endSaturationAdjustment}
      onkeydown={handleKeyDown}
      {id}
    ></canvas>
    <!-- Selection Indicator -->
    <div
      class="colorPicker__boxIndicator"
      style="top: {100 - color.value}%; left: {color.saturation}%; background-color: {toHex(color)};"
    ></div>
  </div>

  <!-- Hue Slider -->
  <div class="colorPicker__sliderWrapper colorPicker__sliderWrapper--hue">
    <input
      type="range"
      min="0"
      max="360"
      step="1"
      bind:value={color.hue}
      onmousedown={() => (color.isAdjustingHue = true)}
      onmouseup={() => (color.isAdjustingHue = false)}
      ontouchstart={() => (color.isAdjustingHue = true)}
      ontouchend={() => (color.isAdjustingHue = false)}
      oninput={() => {
        color.isAdjustingHue = true;
        lastValidHue = color.hue;
      }}
      onchange={() => (color.isAdjustingHue = false)}
      aria-label="Hue Selector"
      style="--thumbBG: hsl({displayHue()}, 100%, 50%)"
      class="colorPicker__slider"
    />
  </div>

  {#if showOpacity}
    <div
      class="colorPicker__sliderWrapper colorPicker__sliderWrapper--opacity"
      style="--opacityGradient: {getOpacityGradient()};"
    >
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        bind:value={color.opacity}
        aria-label="Opacity Slider"
        class="colorPicker__slider"
        style="--thumbBG: {toHex(color)};"
      />
    </div>
  {/if}

  {#if showInputs}
    <div class="colorPicker__inputs colorPicker__inputs--{selectedFormat}">
      <Select selected={[formatOptions[0].value]} options={formatOptions} onSelectedChange={handleFormatChange} />

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
        {#if showOpacity}
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
        {/if}
      {:else if selectedFormat === 'hsl'}
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
          onfocus={() => (colorInputFocused = true)}
          onblur={handleInputsBlur}
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
        {#if showOpacity}
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
        {/if}
      {:else if selectedFormat === 'hsv'}
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
        {#if showOpacity}
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
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .colorPicker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    max-width: 25rem;
  }

  .colorPicker__box {
    width: 100%;
    height: 8rem;
    position: relative;
    cursor: crosshair;
  }

  .colorPicker__canvas {
    width: 100%;
    height: 100%;
    touch-action: none;
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

  .colorPicker__sliderWrapper {
    position: relative;
    width: 100%;
    height: 1rem;
  }

  .colorPicker__sliderWrapper::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 0.25rem;
    transform: translateY(-50%);
    border-radius: 0.125rem;
    pointer-events: none;
  }

  .colorPicker__sliderWrapper--hue::before {
    background: linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red);
  }

  .colorPicker__sliderWrapper--opacity::before {
    background: var(--opacityGradient);
    background-size: cover;
  }

  .colorPicker__slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 100%;
    cursor: pointer;
    background: transparent;
    position: relative;
    z-index: 1;
  }

  .colorPicker__slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    border: 2px solid white;
    background-color: var(--thumbBG);
  }

  .colorPicker__slider::-moz-range-thumb {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    border: 2px solid white;
    background-color: var(--thumbBG);
  }

  .colorPicker__inputs {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.5rem;
  }
  .colorPicker__inputs--hex {
    grid-template-columns: 1fr 2fr;
  }
</style>
