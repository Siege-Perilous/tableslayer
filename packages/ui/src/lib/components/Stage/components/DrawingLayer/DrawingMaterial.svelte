<script lang="ts">
  import * as THREE from 'three';
  import { T, useThrelte, useLoader } from '@threlte/core';
  import { DrawMode, type DrawingLayerProps, InitialState } from './types';
  import { onDestroy, untrack } from 'svelte';
  import type { Size } from '../../types';
  import { RenderMode } from './types';
  import { encodeRLE, decodeRLE } from '../../../../utils/rle';

  import drawVertexShader from '../../shaders/Drawing.vert?raw';
  import drawFragmentShader from '../../shaders/Drawing.frag?raw';

  interface Props {
    props: DrawingLayerProps;
    size: Size | null;
    initialState: InitialState;
    onRender: (texture: THREE.Texture) => void;
  }

  const { props, size, initialState, onRender }: Props = $props();
  const { renderer } = useThrelte();

  // This shader is used for drawing the fog of war on the GPU
  const drawMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uPreviousState: { value: null },
      uBrushTexture: { value: null },
      uStart: { value: new THREE.Vector2(Infinity, Infinity) }, // Initialize off-screen
      uEnd: { value: new THREE.Vector2(Infinity, Infinity) }, // Initialize off-screen
      uBrushSize: { value: props.tool.size },
      uBrushFalloff: { value: 50.0 },
      uTextureSize: { value: new THREE.Vector2() },
      uBrushColor: { value: new THREE.Vector4() },
      uIsRevertOperation: { value: false },
      uIsClearOperation: { value: false },
      uIsFillOperation: { value: false },
      uShapeType: { value: 0 }
    },
    vertexShader: drawVertexShader,
    fragmentShader: drawFragmentShader
  });

  // Options for the render targets
  const options = {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearMipMapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
    depthBuffer: false,
    alpha: true
  };

  let imageUrl: string | null = $state(null);

  const loader = useLoader(THREE.TextureLoader);

  // Double-buffered render targets
  let tempTarget = new THREE.WebGLRenderTarget(1, 1, options);
  let persistedTarget = new THREE.WebGLRenderTarget(1, 1, options);

  // Setup the quad that the fog of war is drawn on
  let scene = new THREE.Scene();
  let camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh();

  onDestroy(() => {
    tempTarget?.dispose();
    persistedTarget?.dispose();
    drawMaterial?.dispose();
  });

  // Map size changed
  $effect(() => {
    if (!size) return;

    // If map size changed, update the render target sizes
    if (size.width !== tempTarget.width || size.height !== tempTarget.height) {
      tempTarget.setSize(size.width, size.height);
      persistedTarget.setSize(size.width, size.height);
      drawMaterial.uniforms.uTextureSize.value = new THREE.Vector2(size.width, size.height);

      // If an image is provided, load it, otherwise reset the fog state
      if (props.url) {
        loadImage(props.url);
        untrack(() => (imageUrl = props.url));
      } else {
        if (initialState === InitialState.Fill) {
          render(RenderMode.Fill, true);
        } else {
          render(RenderMode.Clear, true);
        }
      }
    }
  });

  $effect(() => {
    // If fog image is changed, reload the image
    if (props.url && props.url !== imageUrl) {
      loadImage(props.url);
      untrack(() => (imageUrl = props.url));
    }
  });

  // Track previous values to avoid unnecessary rerenders
  let prevToolType = props.tool.type;
  let prevToolMode = props.tool.mode;

  // Whenever the fog of war props change, we need to update the material
  $effect(() => {
    drawMaterial.uniforms.uEnd.value.copy(drawMaterial.uniforms.uStart.value);
    drawMaterial.uniforms.uShapeType.value = props.tool.type;
    drawMaterial.uniforms.uBrushSize.value = props.tool.size;

    if (props.tool.mode === DrawMode.Erase) {
      drawMaterial.uniforms.uBrushColor.value = new THREE.Vector4(0, 0, 0, 0);
    } else {
      drawMaterial.uniforms.uBrushColor.value = new THREE.Vector4(1, 1, 1, 1);
    }

    // Only revert and redraw if tool type or mode changed, not size
    const toolTypeOrModeChanged = prevToolType !== props.tool.type || prevToolMode !== props.tool.mode;

    if (toolTypeOrModeChanged) {
      // Discard the current buffer by copying the previous buffer to the current buffer
      render(RenderMode.Revert, true);
    }

    // Always redraw to show the updated tool overlay (including size changes)
    render(RenderMode.Draw);

    // Update previous values
    prevToolType = props.tool.type;
    prevToolMode = props.tool.mode;
  });

  /**
   * Loads an image into the current buffer
   * @param url The URL of the image to load
   */
  function loadImage(url: string) {
    loader.load(url).then((texture) => render(RenderMode.Revert, true, texture));
  }

  /**
   * Swaps the current and previous buffers to persist the current state
   */
  function swapBuffers() {
    const temp = tempTarget;
    tempTarget = persistedTarget;
    persistedTarget = temp;
  }

  export function clear() {
    render(RenderMode.Clear, true);
  }

  export function fill() {
    render(RenderMode.Fill, true);
  }

  export function revert() {
    render(RenderMode.Revert, true);
  }

  /**
   * Resets the cursor position to hide it
   */
  export function resetCursor() {
    // Set both start and end to a far off-screen position
    const offScreen = new THREE.Vector2(Infinity, Infinity);
    drawMaterial.uniforms.uStart.value.copy(offScreen);
    drawMaterial.uniforms.uEnd.value.copy(offScreen);
  }

  /**
   * Renders the to the current buffer
   * @param operation The operation to perform. 'fill' will reset the fog of war to the initial state, 'revert' will copy the current state to the previous state, 'clear' will clear the current state, and 'draw' will draw the current state
   * @param persist Whether to persist the current state
   * @param lastTexture The texture to use for the previous state
   */
  export function render(operation: RenderMode, persist: boolean = false, lastTexture: THREE.Texture | null = null) {
    // If no previous state is provided, use the last target
    drawMaterial.uniforms.uPreviousState.value = lastTexture ?? persistedTarget.texture;

    drawMaterial.uniforms.uIsRevertOperation.value = operation === RenderMode.Revert;
    drawMaterial.uniforms.uIsFillOperation.value = operation === RenderMode.Fill;
    drawMaterial.uniforms.uIsClearOperation.value = operation === RenderMode.Clear;

    scene.visible = true;
    renderer.setRenderTarget(tempTarget);
    renderer.render(scene, camera);
    scene.visible = false;

    onRender(tempTarget.texture);

    drawMaterial.uniforms.uIsRevertOperation.value = false;
    drawMaterial.uniforms.uIsFillOperation.value = false;
    drawMaterial.uniforms.uIsClearOperation.value = false;

    renderer.setRenderTarget(null);

    if (persist) {
      swapBuffers();
    }
  }

  /**
   * Draws a path on the current buffer
   * @param start The start position of the path
   * @param last The last position of the path
   * @param persist Whether to persist the current state
   */
  export function drawPath(start: THREE.Vector2, last: THREE.Vector2 | null, persist: boolean) {
    drawMaterial.uniforms.uStart.value.copy(start);
    drawMaterial.uniforms.uEnd.value.copy(last ?? start);
    render(RenderMode.Draw, persist);
  }

  /**
   * Gets the current texture
   * @returns The current texture
   */
  export function getTexture() {
    return tempTarget.texture;
  }

  /**
   * Serializes the current fog of war state to a binary buffer
   * @returns A binary buffer representation of the fog of war texture
   */
  export async function toPng(): Promise<Blob> {
    // Create a temporary canvas to draw the texture
    const canvas = new OffscreenCanvas(persistedTarget.width, persistedTarget.height);
    const ctx = canvas.getContext('2d')!;

    // Read pixels from WebGL render target
    const pixels = new Uint8Array(4 * persistedTarget.width * persistedTarget.height);
    renderer.readRenderTargetPixels(persistedTarget, 0, 0, persistedTarget.width, persistedTarget.height, pixels);

    // Draw pixels to canvas
    const imageData = ctx.createImageData(persistedTarget.width, persistedTarget.height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);

    // The pixel data is flipped vertically when read from the WebGL render target, so we need to flip it back
    const flippedCanvas = document.createElement('canvas');
    flippedCanvas.width = canvas.width;
    flippedCanvas.height = canvas.height;
    const flippedCtx = flippedCanvas.getContext('2d')!;

    flippedCtx.scale(1, -1);
    flippedCtx.translate(0, -canvas.height);
    flippedCtx.drawImage(canvas, 0, 0);

    // Convert to blob with lossless PNG compression
    return new Promise((resolve) => {
      flippedCanvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
  }

  /**
   * Exports the current state as RLE-encoded data
   * @returns RLE encoded Uint8Array with dimensions prepended
   */
  export async function toRLE(): Promise<Uint8Array> {
    const width = persistedTarget.width;
    const height = persistedTarget.height;

    // Read pixels from WebGL render target
    const pixels = new Uint8Array(4 * width * height);
    renderer.readRenderTargetPixels(persistedTarget, 0, 0, width, height, pixels);

    // Extract alpha channel and flip vertically
    const binaryData = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * 4 + 3; // Alpha channel
        const dstIndex = (height - 1 - y) * width + x; // Flip vertically
        binaryData[dstIndex] = pixels[srcIndex] > 127 ? 255 : 0;
      }
    }

    const rleData = encodeRLE(binaryData);

    // Prepend dimensions to the RLE data (4 bytes for width, 4 bytes for height)
    const result = new Uint8Array(8 + rleData.length);
    const view = new DataView(result.buffer);
    view.setUint32(0, width, true); // little-endian
    view.setUint32(4, height, true); // little-endian
    result.set(rleData, 8);

    return result;
  }

  /**
   * Loads RLE-encoded data into the drawing buffer
   * @param rleData RLE encoded data (with dimensions prepended)
   * @param width Image width (ignored if dimensions are in data)
   * @param height Image height (ignored if dimensions are in data)
   */
  export async function fromRLE(rleData: Uint8Array, width?: number, height?: number) {
    // Check if dimensions are prepended (new format)
    let actualWidth = width || 1024;
    let actualHeight = height || 1024;
    let rleStart = 0;

    if (rleData.length > 8) {
      const view = new DataView(rleData.buffer, rleData.byteOffset, rleData.byteLength);
      const possibleWidth = view.getUint32(0, true);
      const possibleHeight = view.getUint32(4, true);

      // Sanity check - dimensions should be reasonable
      if (possibleWidth > 0 && possibleWidth <= 4096 && possibleHeight > 0 && possibleHeight <= 4096) {
        actualWidth = possibleWidth;
        actualHeight = possibleHeight;
        rleStart = 8;
      }
    }

    // Extract the actual RLE data
    const actualRleData = rleStart > 0 ? rleData.slice(rleStart) : rleData;

    // Decode RLE to binary
    const binaryData = decodeRLE(actualRleData, actualWidth * actualHeight);

    // Create texture from binary data - flip vertically to match WebGL coordinate system
    const rgba = new Uint8Array(actualWidth * actualHeight * 4);
    for (let y = 0; y < actualHeight; y++) {
      for (let x = 0; x < actualWidth; x++) {
        const srcIndex = y * actualWidth + x;
        const dstIndex = (actualHeight - 1 - y) * actualWidth + x; // Flip vertically
        const idx = dstIndex * 4;
        rgba[idx] = 0; // R
        rgba[idx + 1] = 0; // G
        rgba[idx + 2] = 0; // B
        rgba[idx + 3] = binaryData[srcIndex]; // A
      }
    }

    // Create texture
    const texture = new THREE.DataTexture(rgba, actualWidth, actualHeight, THREE.RGBAFormat);
    texture.needsUpdate = true;

    // Load into buffer
    render(RenderMode.Revert, true, texture);

    // Dispose the temporary texture after rendering to buffer
    texture.dispose();
  }
</script>

<!-- Hidden scene that renders to the render target -->
<T.Scene is={scene} visible={false}>
  <T.OrthographicCamera is={camera} />
  <T.Mesh is={quad}>
    <T.ShaderMaterial is={drawMaterial} />
    <T.PlaneGeometry args={[2, 2]} />
  </T.Mesh>
</T.Scene>
