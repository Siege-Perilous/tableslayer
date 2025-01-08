<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte, type Size } from '@threlte/core';
  import { DrawMode, type FogOfWarLayerProps } from './types';
  import { onDestroy } from 'svelte';
  import { clippingPlaneStore } from '../../helpers/clippingPlaneStore.svelte';
  import drawVertexShader from '../../shaders/Drawing.vert?raw';
  import drawFragmentShader from '../../shaders/Drawing.frag?raw';
  import fogVertexShader from '../../shaders/Fog.vert?raw';
  import fogFragmentShader from '../../shaders/Fog.frag?raw';

  interface Props {
    props: FogOfWarLayerProps;
    mapSize: Size;
  }

  const { props, mapSize }: Props = $props();
  const { renderer } = useThrelte();

  // This shader is used for drawing the fog of war on the GPU
  const drawingShader = new THREE.ShaderMaterial({
    uniforms: {
      uPreviousState: { value: null },
      uBrushTexture: { value: null },
      uStart: { value: new THREE.Vector2() },
      uEnd: { value: new THREE.Vector2() },
      uBrushSize: { value: props.brushSize },
      uBrushFalloff: { value: 50.0 },
      uTextureSize: { value: new THREE.Vector2() },
      uBrushColor: { value: new THREE.Vector4() },
      uIsCopyOperation: { value: false },
      uIsClearOperation: { value: false },
      uIsResetOperation: { value: false },
      uShapeType: { value: 0 }
    },
    vertexShader: drawVertexShader,
    fragmentShader: drawFragmentShader
  });

  const image = new Image();

  const options = {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearMipMapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
    depthBuffer: false,
    alpha: true
  };

  let renderTargetA = new THREE.WebGLRenderTarget(mapSize.width, mapSize.height, options);
  let renderTargetB = new THREE.WebGLRenderTarget(mapSize.width, mapSize.height, options);
  let current = renderTargetA;
  let previous = renderTargetB;

  // Setup the quad that the fog of war is drawn on
  let scene = new THREE.Scene();
  let camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), drawingShader);
  scene.add(quad);

  let material = new THREE.ShaderMaterial({
    uniforms: {
      uMaskTexture: { value: null },
      uTime: { value: 0.0 },
      uBaseColor: { value: new THREE.Color(props.baseColor) },
      uFogColor1: { value: new THREE.Color(props.fogColor1) },
      uFogColor2: { value: new THREE.Color(props.fogColor2) },
      uFogColor3: { value: new THREE.Color(props.fogColor3) },
      uFogColor4: { value: new THREE.Color(props.fogColor4) },
      uFogSpeed: { value: props.fogSpeed },
      uEdgeFrequency: { value: props.edgeFrequency },
      uEdgeAmplitude: { value: props.edgeAmplitude },
      uEdgeOffset: { value: props.edgeOffset },
      uPersistence: { value: props.persistence },
      uLacunarity: { value: props.lacunarity },
      uFrequency: { value: props.frequency },
      uOffset: { value: props.offset },
      uAmplitude: { value: props.amplitude },
      uLevels: { value: props.levels },
      uOpacity: { value: props.opacity },
      uClippingPlanes: new THREE.Uniform(
        clippingPlaneStore.value.map((p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant))
      )
    },
    transparent: true,
    fragmentShader: fogFragmentShader,
    vertexShader: fogVertexShader
  });

  onDestroy(() => {
    renderTargetA.dispose();
    renderTargetB.dispose();
  });

  useTask((delta) => {
    material.uniforms.uTime.value += delta;
  });

  // Whenever the map size changes, we need to re-initialize the buffers
  $effect(() => {
    renderTargetA.setSize(mapSize.width, mapSize.height);
    renderTargetB.setSize(mapSize.width, mapSize.height);
    drawingShader.uniforms.uTextureSize.value = new THREE.Vector2(mapSize.width, mapSize.height);
    reset();
  });

  // Load the image data from the props
  $effect(() => {
    // Does image data already exist? Only update if the data has changed
    // and the map size has been initialized
    if (props.data && image.src !== props.data && mapSize.width > 0 && mapSize.height > 0) {
      image.src = props.data;
      image.onload = () => {
        renderTargetA.setSize(mapSize.width, mapSize.height);
        renderTargetB.setSize(mapSize.width, mapSize.height);

        const texture = new THREE.Texture(image);
        // This is needed to trigger texture upload to GPU
        texture.needsUpdate = true;

        // Render twice so buffers are in sync
        render(texture, 'copy');
        swapBuffers();
        render(previous.texture, 'copy');
      };
    }
  });

  // Update brush size in separate effect to avoid flickering when discarding changes
  $effect(() => {
    drawingShader.uniforms.uShapeType.value = props.toolType;
    drawingShader.uniforms.uBrushSize.value = props.brushSize;

    if (props.drawMode === DrawMode.Erase) {
      drawingShader.uniforms.uBrushColor.value = new THREE.Vector4(0, 0, 0, 0);
    } else {
      drawingShader.uniforms.uBrushColor.value = new THREE.Vector4(1, 1, 1, 1);
    }

    render(previous.texture, 'draw');
  });

  // Whenever the fog of war props change, we need to update the material
  $effect(() => {
    material.uniforms.uOpacity.value = props.opacity;
    material.uniforms.uClippingPlanes.value = clippingPlaneStore.value.map(
      (p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant)
    );

    material.uniforms.uBaseColor.value = new THREE.Color(props.baseColor);
    material.uniforms.uFogColor1.value = new THREE.Color(props.fogColor1);
    material.uniforms.uFogColor2.value = new THREE.Color(props.fogColor2);
    material.uniforms.uFogColor3.value = new THREE.Color(props.fogColor3);
    material.uniforms.uFogColor4.value = new THREE.Color(props.fogColor4);
    material.uniforms.uFogSpeed.value = props.fogSpeed;
    material.uniforms.uEdgeFrequency.value = props.edgeFrequency;
    material.uniforms.uEdgeAmplitude.value = props.edgeAmplitude;
    material.uniforms.uEdgeOffset.value = props.edgeOffset;
    material.uniforms.uFrequency.value = props.frequency;
    material.uniforms.uPersistence.value = props.persistence;
    material.uniforms.uLacunarity.value = props.lacunarity;
    material.uniforms.uLevels.value = props.levels;
    material.uniforms.uOffset.value = props.offset;
    material.uniforms.uAmplitude.value = props.amplitude;

    discardChanges();
  });

  /**
   * Swaps the current and previous buffers
   */
  function swapBuffers() {
    const temp = current;
    current = previous;
    previous = temp;
  }

  /**
   * Renders the to the current buffer
   */
  function render(lastTexture: THREE.Texture, operation: 'reset' | 'copy' | 'clear' | 'draw') {
    drawingShader.uniforms.uPreviousState.value = lastTexture;

    drawingShader.uniforms.uIsCopyOperation.value = operation === 'copy';
    drawingShader.uniforms.uIsResetOperation.value = operation === 'reset';
    drawingShader.uniforms.uIsClearOperation.value = operation === 'clear';

    renderer.setRenderTarget(current);
    renderer.render(scene, camera);

    drawingShader.uniforms.uIsCopyOperation.value = false;
    drawingShader.uniforms.uIsResetOperation.value = false;
    drawingShader.uniforms.uIsClearOperation.value = false;

    material.uniforms.uMaskTexture.value = current.texture;
    material.uniformsNeedUpdate = true;

    renderer.setRenderTarget(null);
  }

  export function discardChanges() {
    render(previous.texture, 'copy');
  }

  /**
   * Resets the fog of war to fill the entire layer
   */
  export function reset() {
    render(previous.texture, 'reset');
    swapBuffers();
  }

  /**
   * Clears the fog of war to reveal the entire map underneath
   */
  export function clear() {
    render(previous.texture, 'clear');
    swapBuffers();
  }

  export function drawPath(start: THREE.Vector2, last: THREE.Vector2 | null = null, persist: boolean = false) {
    drawingShader.uniforms.uStart.value.copy(start);
    drawingShader.uniforms.uEnd.value.copy(last ?? start);

    render(previous.texture, 'draw');

    if (persist) {
      swapBuffers();
    }
  }

  /**
   * Serializes the current fog of war state to a base64 string
   * @returns A base64 string representation of the fog of war texture
   */
  export function toBase64(): string {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = current.width;
    canvas.height = current.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Read pixels from WebGL render target
    const pixels = new Uint8Array(4 * current.width * current.height);
    renderer.readRenderTargetPixels(current, 0, 0, current.width, current.height, pixels);

    // Create ImageData and put on canvas
    const imageData = new ImageData(new Uint8ClampedArray(pixels), current.width, current.height);
    ctx.putImageData(imageData, 0, 0);

    // Convert directly to base64
    return canvas.toDataURL();
  }
</script>

{#snippet attachMaterial()}
  {material}
{/snippet}

<T is={material}>
  {@render attachMaterial()}
</T>
