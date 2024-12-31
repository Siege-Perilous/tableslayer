<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte, type Size } from '@threlte/core';
  import { DrawMode, type FogOfWarLayerProps } from './types';
  import { onDestroy } from 'svelte';
  import { BufferManager } from './BufferManager';
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
      uBrushSize: { value: 1.0 },
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

  // Setup the quad that the fog of war is drawn on
  let scene = new THREE.Scene();
  let quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), drawingShader);
  scene.add(quad);

  let material = new THREE.ShaderMaterial({
    uniforms: {
      uMaskTexture: { value: null },
      uFogColor: { value: new THREE.Color(props.fogColor) },
      uFogSpeed: { value: 0.05 },
      uPersistence: { value: 0.7 },
      uLacunarity: { value: 2.1 },
      uAmplitude: { value: 1.0 },
      uFrequency: { value: 0.001 },
      uLevels: { value: 6 },
      uTime: { value: 0.0 },
      uOpacity: { value: props.opacity },
      uClippingPlanes: new THREE.Uniform(
        clippingPlaneStore.value.map((p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant))
      )
    },
    transparent: true,
    fragmentShader: fogFragmentShader,
    vertexShader: fogVertexShader
  });

  let bufferManager: BufferManager = new BufferManager(renderer, 0, 0, (current) => {
    material.uniforms.uMaskTexture.value = bufferManager.current.texture;
  });

  useTask((delta) => {
    material.uniforms.uTime.value += delta;
  });

  // Whenever the map size changes, we need to re-initialize the buffers
  $effect(() => {
    bufferManager.resize(mapSize.width, mapSize.height);
    drawingShader.uniforms.uTextureSize.value = new THREE.Vector2(mapSize.width, mapSize.height);
    reset();
  });

  $effect(() => {
    // Does image data already exist? Only update if the data has changed
    // and the map size has been initialized
    if (props.data && image.src !== props.data && mapSize.width > 0 && mapSize.height > 0) {
      image.src = props.data;
      image.onload = () => {
        bufferManager.resize(image.width, image.height);

        const texture = new THREE.Texture(image);
        texture.needsUpdate = true; // This is needed to trigger texture upload to GPU

        drawingShader.uniforms.uPreviousState.value = texture;
        drawingShader.uniforms.uIsCopyOperation.value = true;
        bufferManager.render(scene, quadCamera);
        drawingShader.uniforms.uIsCopyOperation.value = false;

        bufferManager.persistChanges();

        bufferManager.render(scene, quadCamera);
      };
    }
  });

  // Whenever the fog of war props change, we need to update the material
  $effect(() => {
    material.uniforms.uFogColor.value = new THREE.Color(props.fogColor);
    material.uniforms.uOpacity.value = props.opacity;
    material.uniforms.uClippingPlanes.value = clippingPlaneStore.value.map(
      (p) => new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant)
    );

    drawingShader.uniforms.uBrushSize.value = props.brushSize / 2;
    drawingShader.uniforms.uShapeType.value = props.toolType;

    if (props.drawMode === DrawMode.Erase) {
      drawingShader.uniforms.uBrushColor.value = new THREE.Vector4(0, 0, 0, 0);
    } else {
      drawingShader.uniforms.uBrushColor.value = new THREE.Vector4(1, 1, 1, 1);
    }

    discardChanges();
  });

  export function discardChanges() {
    if (!bufferManager) return;

    material.uniforms.uMaskTexture.value = bufferManager.previous.texture;
  }

  /**
   * Resets the fog of war to fill the entire layer
   */
  export function reset() {
    if (!bufferManager) return;

    drawingShader.uniforms.uPreviousState.value = bufferManager.previous.texture;

    drawingShader.uniforms.uIsResetOperation.value = true;
    bufferManager.render(scene, quadCamera);
    drawingShader.uniforms.uIsResetOperation.value = false;

    bufferManager.persistChanges();
  }

  /**
   * Clears the fog of war to reveal the entire map underneath
   */
  export function clear() {
    if (!bufferManager) return;

    drawingShader.uniforms.uPreviousState.value = bufferManager.previous.texture;

    drawingShader.uniforms.uIsClearOperation.value = true;
    bufferManager.render(scene, quadCamera);
    drawingShader.uniforms.uIsClearOperation.value = false;

    bufferManager.persistChanges();
  }

  export function drawPath(start: THREE.Vector2, last: THREE.Vector2 | null = null, persist: boolean = false) {
    if (!bufferManager) return;

    drawingShader.uniforms.uPreviousState.value = bufferManager.previous.texture;
    drawingShader.uniforms.uStart.value.copy(start);
    drawingShader.uniforms.uEnd.value.copy(last ?? start);

    bufferManager.render(scene, quadCamera);

    if (persist) {
      bufferManager.persistChanges();
    }
  }

  /**
   * Serializes the current fog of war state to a base64 string
   * @returns A base64 string representation of the fog of war texture
   */
  export function toBase64(): string {
    if (!bufferManager) return '';

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = bufferManager.current.width;
    canvas.height = bufferManager.current.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Read pixels from WebGL render target
    const pixels = new Uint8Array(4 * bufferManager.current.width * bufferManager.current.height);
    bufferManager.render(scene, quadCamera);

    renderer.readRenderTargetPixels(
      bufferManager.previous,
      0,
      0,
      bufferManager.current.width,
      bufferManager.current.height,
      pixels
    );

    // Create ImageData and put on canvas
    const imageData = new ImageData(
      new Uint8ClampedArray(pixels),
      bufferManager.current.width,
      bufferManager.current.height
    );
    ctx.putImageData(imageData, 0, 0);

    // Convert directly to base64
    return canvas.toDataURL();
  }

  // Cleanup on destroy
  onDestroy(() => {
    bufferManager?.dispose();
  });
</script>

{#snippet attachMaterial()}
  {material}
{/snippet}

<T is={material}>
  {@render attachMaterial()}
</T>
