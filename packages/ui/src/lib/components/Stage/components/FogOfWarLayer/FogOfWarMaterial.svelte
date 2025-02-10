<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte } from '@threlte/core';
  import { DrawMode, type FogOfWarLayerProps } from './types';
  import { onDestroy, untrack } from 'svelte';
  import type { Size } from '../../types';
  import { clippingPlaneStore } from '../../helpers/clippingPlaneStore.svelte';
  import drawVertexShader from '../../shaders/Drawing.vert?raw';
  import drawFragmentShader from '../../shaders/Drawing.frag?raw';
  import fogVertexShader from '../../shaders/Fog.vert?raw';
  import fogFragmentShader from '../../shaders/Fog.frag?raw';

  interface Props {
    props: FogOfWarLayerProps;
    mapSize: Size | null;
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
      uIsRevertOperation: { value: false },
      uIsClearOperation: { value: false },
      uIsFillOperation: { value: false },
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
  const textureLoader = new THREE.TextureLoader();

  // Double-buffered render targets
  let tempTarget = new THREE.WebGLRenderTarget(1, 1, options);
  let persistedTarget = new THREE.WebGLRenderTarget(1, 1, options);

  // Setup the quad that the fog of war is drawn on
  let scene = new THREE.Scene();
  let camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), drawMaterial);
  scene.add(quad);

  onDestroy(() => {
    tempTarget?.dispose();
    persistedTarget?.dispose();
  });

  useTask((delta) => {
    fogMaterial.uniforms.uTime.value += delta;
  });

  // Map size changed
  $effect(() => {
    if (!mapSize) return;

    // If map size changed, update the render target sizes
    if (mapSize.width !== tempTarget.width || mapSize.height !== tempTarget.height) {
      tempTarget.setSize(mapSize.width, mapSize.height);
      persistedTarget.setSize(mapSize.width, mapSize.height);
      drawMaterial.uniforms.uTextureSize.value = new THREE.Vector2(mapSize.width, mapSize.height);

      // Since the target size changed, the data is invalidated and we need to reset the fog
      render('fill', true);
    }

    // Only reload the image if the url has changed and the map size is initialized
    if (props.url && props.url !== imageUrl) {
      // Load the new image
      textureLoader.load(props.url, (texture) => render('revert', true, texture));
      untrack(() => {
        imageUrl = props.url;
      });
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
    render('revert', true);
    // Re-draw the scene to show the updated tool overlay
    render('draw');
  });

  /**
   * Swaps the current and previous buffers to persist the current state
   */
  function swapBuffers() {
    const temp = tempTarget;
    tempTarget = persistedTarget;
    persistedTarget = temp;
  }

  /**
   * Renders the to the current buffer
   * @param operation The operation to perform. 'fill' will reset the fog of war to the initial state, 'revert' will copy the current state to the previous state, 'clear' will clear the current state, and 'draw' will draw the current state
   * @param persist Whether to persist the current state
   * @param lastTexture The texture to use for the previous state
   */
  export function render(
    operation: 'fill' | 'revert' | 'clear' | 'draw',
    persist: boolean = false,
    lastTexture: THREE.Texture | null = null
  ) {
    // If no previous state is provided, use the last target
    drawMaterial.uniforms.uPreviousState.value = lastTexture ?? persistedTarget.texture;

    drawMaterial.uniforms.uIsRevertOperation.value = operation === 'revert';
    drawMaterial.uniforms.uIsFillOperation.value = operation === 'fill';
    drawMaterial.uniforms.uIsClearOperation.value = operation === 'clear';

    renderer.setRenderTarget(tempTarget);
    renderer.render(scene, camera);

    drawMaterial.uniforms.uIsRevertOperation.value = false;
    drawMaterial.uniforms.uIsFillOperation.value = false;
    drawMaterial.uniforms.uIsClearOperation.value = false;

    fogMaterial.uniforms.uMaskTexture.value = tempTarget.texture;
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
</script>

{#snippet attachMaterial()}
  {fogMaterial}
{/snippet}

<T is={fogMaterial}>
  {@render attachMaterial()}
</T>
