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
  const drawMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uPreviousState: { value: null },
      uBrushTexture: { value: null },
      uStart: { value: new THREE.Vector2() },
      uEnd: { value: new THREE.Vector2() },
      uBrushSize: { value: props.tool.size },
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

  // Material used for rendering the fog of war
  let fogMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uMaskTexture: { value: null },
      uTime: { value: 0.0 },
      uBaseColor: { value: new THREE.Color(props.noise.baseColor) },
      uFogColor1: { value: new THREE.Color(props.noise.fogColor1) },
      uFogColor2: { value: new THREE.Color(props.noise.fogColor2) },
      uFogColor3: { value: new THREE.Color(props.noise.fogColor3) },
      uFogColor4: { value: new THREE.Color(props.noise.fogColor4) },
      uFogSpeed: { value: props.noise.speed },
      uEdgeMinMipMapLevel: { value: props.edge.minMipMapLevel },
      uEdgeMaxMipMapLevel: { value: props.edge.maxMipMapLevel },
      uEdgeFrequency: { value: props.edge.frequency },
      uEdgeAmplitude: { value: props.edge.amplitude },
      uEdgeOffset: { value: props.edge.offset },
      uEdgeSpeed: { value: props.edge.speed },
      uPersistence: { value: props.noise.persistence },
      uLacunarity: { value: props.noise.lacunarity },
      uFrequency: { value: props.noise.frequency },
      uOffset: { value: props.noise.offset },
      uAmplitude: { value: props.noise.amplitude },
      uLevels: { value: props.noise.levels },
      uOpacity: { value: props.opacity },
      uClippingPlanes: new THREE.Uniform(
        clippingPlaneStore.value.map((p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant))
      )
    },
    transparent: true,
    fragmentShader: fogFragmentShader,
    vertexShader: fogVertexShader
  });

  const textureLoader = new THREE.TextureLoader();

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

  // Use two render targets to store the previous and current state of the fog of war
  let targetA = new THREE.WebGLRenderTarget(mapSize.width, mapSize.height, options);
  let targetB = new THREE.WebGLRenderTarget(mapSize.width, mapSize.height, options);

  // Current target is the one that is being drawn on
  let currentTarget = targetA;
  // Last target is the one that is being used for the previous state
  let lastTarget = targetB;

  // Setup the quad that the fog of war is drawn on
  let scene = new THREE.Scene();
  let camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), drawMaterial);
  scene.add(quad);

  onDestroy(() => {
    targetA.dispose();
    targetB.dispose();
  });

  useTask((delta) => {
    fogMaterial.uniforms.uTime.value += delta;
  });

  // Whenever the map size changes, we need to re-initialize the buffers
  $effect(() => {
    targetA.setSize(mapSize.width, mapSize.height);
    targetB.setSize(mapSize.width, mapSize.height);
    drawMaterial.uniforms.uTextureSize.value = new THREE.Vector2(mapSize.width, mapSize.height);
    render('reset', true);
  });

  // Load the image data from the props
  $effect(() => {
    // Only update if the data has changed and map size is initialized
    if (props.url && mapSize.width > 0 && mapSize.height > 0) {
      targetA.setSize(mapSize.width, mapSize.height);
      targetB.setSize(mapSize.width, mapSize.height);
      textureLoader.load(props.url, (texture) => render('copy', true, texture));
    }
  });

  // Whenever the fog of war props change, we need to update the material
  $effect(() => {
    drawMaterial.uniforms.uEnd.value.copy(drawMaterial.uniforms.uStart.value);

    // Update brush properties
    drawMaterial.uniforms.uShapeType.value = props.tool.type;
    drawMaterial.uniforms.uBrushSize.value = props.tool.size;

    if (props.tool.mode === DrawMode.Erase) {
      drawMaterial.uniforms.uBrushColor.value = new THREE.Vector4(0, 0, 0, 0);
    } else {
      drawMaterial.uniforms.uBrushColor.value = new THREE.Vector4(1, 1, 1, 1);
    }

    // Update fog properties
    fogMaterial.uniforms.uOpacity.value = props.opacity;

    fogMaterial.uniforms.uBaseColor.value = new THREE.Color(props.noise.baseColor);
    fogMaterial.uniforms.uFogColor1.value = new THREE.Color(props.noise.fogColor1);
    fogMaterial.uniforms.uFogColor2.value = new THREE.Color(props.noise.fogColor2);
    fogMaterial.uniforms.uFogColor3.value = new THREE.Color(props.noise.fogColor3);
    fogMaterial.uniforms.uFogColor4.value = new THREE.Color(props.noise.fogColor4);

    fogMaterial.uniforms.uEdgeMinMipMapLevel.value = props.edge.minMipMapLevel;
    fogMaterial.uniforms.uEdgeMaxMipMapLevel.value = props.edge.maxMipMapLevel;
    fogMaterial.uniforms.uEdgeFrequency.value = props.edge.frequency;
    fogMaterial.uniforms.uEdgeAmplitude.value = props.edge.amplitude;
    fogMaterial.uniforms.uEdgeOffset.value = props.edge.offset;
    fogMaterial.uniforms.uEdgeSpeed.value = props.edge.speed;
    fogMaterial.uniforms.uFogSpeed.value = props.noise.speed;
    fogMaterial.uniforms.uFrequency.value = props.noise.frequency;
    fogMaterial.uniforms.uPersistence.value = props.noise.persistence;
    fogMaterial.uniforms.uLacunarity.value = props.noise.lacunarity;
    fogMaterial.uniforms.uLevels.value = props.noise.levels;
    fogMaterial.uniforms.uOffset.value = props.noise.offset;
    fogMaterial.uniforms.uAmplitude.value = props.noise.amplitude;

    fogMaterial.uniforms.uClippingPlanes.value = clippingPlaneStore.value.map(
      (p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant)
    );

    // Discard the current buffer by copying the previous buffer to the current buffer
    render('copy', true);
    // Re-draw the scene to show the updated tool overlay
    render('draw');
  });

  /**
   * Swaps the current and previous buffers to persist the current state
   */
  function swapBuffers() {
    const temp = currentTarget;
    currentTarget = lastTarget;
    lastTarget = temp;
  }

  /**
   * Renders the to the current buffer
   */
  export function render(
    operation: 'reset' | 'copy' | 'clear' | 'draw',
    persist: boolean = false,
    lastTexture: THREE.Texture | null = null
  ) {
    // If no previous state is provided, use the last target
    drawMaterial.uniforms.uPreviousState.value = lastTexture ?? lastTarget.texture;

    drawMaterial.uniforms.uIsCopyOperation.value = operation === 'copy';
    drawMaterial.uniforms.uIsResetOperation.value = operation === 'reset';
    drawMaterial.uniforms.uIsClearOperation.value = operation === 'clear';

    renderer.setRenderTarget(currentTarget);
    renderer.render(scene, camera);

    drawMaterial.uniforms.uIsCopyOperation.value = false;
    drawMaterial.uniforms.uIsResetOperation.value = false;
    drawMaterial.uniforms.uIsClearOperation.value = false;

    fogMaterial.uniforms.uMaskTexture.value = currentTarget.texture;
    fogMaterial.uniformsNeedUpdate = true;

    renderer.setRenderTarget(null);

    if (persist) {
      swapBuffers();
    }
  }

  export function drawPath(start: THREE.Vector2, last: THREE.Vector2 | null = null, persist: boolean = false) {
    drawMaterial.uniforms.uStart.value.copy(start);
    drawMaterial.uniforms.uEnd.value.copy(last ?? start);
    render('draw', persist);
  }

  /**
   * Serializes the current fog of war state to a binary buffer
   * @returns A binary buffer representation of the fog of war texture
   */
  export async function toPng(): Promise<Blob> {
    // Create a temporary canvas to draw the texture
    const canvas = new OffscreenCanvas(currentTarget.width, currentTarget.height);
    const ctx = canvas.getContext('2d')!;

    // Read pixels from WebGL render target
    const pixels = new Uint8Array(4 * currentTarget.width * currentTarget.height);
    renderer.readRenderTargetPixels(currentTarget, 0, 0, currentTarget.width, currentTarget.height, pixels);

    // Draw pixels to canvas
    const imageData = ctx.createImageData(currentTarget.width, currentTarget.height);
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
</script>

{#snippet attachMaterial()}
  {fogMaterial}
{/snippet}

<T is={fogMaterial}>
  {@render attachMaterial()}
</T>
