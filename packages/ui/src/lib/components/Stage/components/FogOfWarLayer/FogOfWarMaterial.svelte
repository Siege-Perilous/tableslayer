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
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), drawingShader);
  scene.add(quad);

  // Material used for rendering the fog of war
  let fogMaterial = new THREE.ShaderMaterial({
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
    drawingShader.uniforms.uTextureSize.value = new THREE.Vector2(mapSize.width, mapSize.height);
    render('reset', true);
  });

  // Load the image data from the props
  $effect(() => {
    // Does image data already exist? Only update if the data has changed
    // and the map size has been initialized
    if (props.data && image.src !== props.data && mapSize.width > 0 && mapSize.height > 0) {
      image.src = props.data;
      image.onload = () => {
        targetA.setSize(mapSize.width, mapSize.height);
        targetB.setSize(mapSize.width, mapSize.height);

        const texture = new THREE.Texture(image);
        // This is needed to trigger texture upload to GPU
        texture.needsUpdate = true;

        // Render twice so buffers are in sync
        render('copy', true, texture);
        render('copy');
      };
    }
  });

  // Whenever the fog of war props change, we need to update the material
  $effect(() => {
    // Update brush properties
    drawingShader.uniforms.uShapeType.value = props.toolType;
    drawingShader.uniforms.uBrushSize.value = props.brushSize;

    if (props.drawMode === DrawMode.Erase) {
      drawingShader.uniforms.uBrushColor.value = new THREE.Vector4(0, 0, 0, 0);
    } else {
      drawingShader.uniforms.uBrushColor.value = new THREE.Vector4(1, 1, 1, 1);
    }

    // Update fog properties
    fogMaterial.uniforms.uBaseColor.value = new THREE.Color(props.baseColor);
    fogMaterial.uniforms.uFogColor1.value = new THREE.Color(props.fogColor1);
    fogMaterial.uniforms.uFogColor2.value = new THREE.Color(props.fogColor2);
    fogMaterial.uniforms.uFogColor3.value = new THREE.Color(props.fogColor3);
    fogMaterial.uniforms.uFogColor4.value = new THREE.Color(props.fogColor4);
    fogMaterial.uniforms.uFogSpeed.value = props.fogSpeed;
    fogMaterial.uniforms.uEdgeFrequency.value = props.edgeFrequency;
    fogMaterial.uniforms.uEdgeAmplitude.value = props.edgeAmplitude;
    fogMaterial.uniforms.uEdgeOffset.value = props.edgeOffset;
    fogMaterial.uniforms.uFrequency.value = props.frequency;
    fogMaterial.uniforms.uPersistence.value = props.persistence;
    fogMaterial.uniforms.uLacunarity.value = props.lacunarity;
    fogMaterial.uniforms.uLevels.value = props.levels;
    fogMaterial.uniforms.uOffset.value = props.offset;
    fogMaterial.uniforms.uAmplitude.value = props.amplitude;
    fogMaterial.uniforms.uOpacity.value = props.opacity;
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
    console.log('render', operation, lastTexture);

    // If no previous state is provided, use the last target
    drawingShader.uniforms.uPreviousState.value = lastTexture ?? lastTarget.texture;

    drawingShader.uniforms.uIsCopyOperation.value = operation === 'copy';
    drawingShader.uniforms.uIsResetOperation.value = operation === 'reset';
    drawingShader.uniforms.uIsClearOperation.value = operation === 'clear';

    renderer.setRenderTarget(currentTarget);
    renderer.render(scene, camera);

    drawingShader.uniforms.uIsCopyOperation.value = false;
    drawingShader.uniforms.uIsResetOperation.value = false;
    drawingShader.uniforms.uIsClearOperation.value = false;

    fogMaterial.uniforms.uMaskTexture.value = currentTarget.texture;
    fogMaterial.uniformsNeedUpdate = true;

    renderer.setRenderTarget(null);

    if (persist) {
      swapBuffers();
    }
  }

  export function drawPath(start: THREE.Vector2, last: THREE.Vector2 | null = null, persist: boolean = false) {
    drawingShader.uniforms.uStart.value.copy(start);
    drawingShader.uniforms.uEnd.value.copy(last ?? start);
    render('draw', persist);
  }

  /**
   * Serializes the current fog of war state to a base64 string
   * @returns A base64 string representation of the fog of war texture
   */
  export function toBase64(): string {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = currentTarget.width;
    canvas.height = currentTarget.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Read pixels from WebGL render target
    const pixels = new Uint8Array(4 * currentTarget.width * currentTarget.height);
    renderer.readRenderTargetPixels(currentTarget, 0, 0, currentTarget.width, currentTarget.height, pixels);

    // Create ImageData and put on canvas
    const imageData = new ImageData(new Uint8ClampedArray(pixels), currentTarget.width, currentTarget.height);
    ctx.putImageData(imageData, 0, 0);

    // Convert directly to base64
    return canvas.toDataURL();
  }
</script>

{#snippet attachMaterial()}
  {fogMaterial}
{/snippet}

<T is={fogMaterial}>
  {@render attachMaterial()}
</T>
