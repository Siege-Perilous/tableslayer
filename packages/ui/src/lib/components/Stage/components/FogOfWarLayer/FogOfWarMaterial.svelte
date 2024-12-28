<script lang="ts">
  import * as THREE from 'three';
  import { T, useThrelte, type Size } from '@threlte/core';
  import { DrawMode, type FogOfWarLayerProps } from './types';
  import { onDestroy, onMount } from 'svelte';
  import { BufferManager } from '../../helpers/BufferManager';
  import vertexShader from '../../shaders/Drawing.vert?raw';
  import fragmentShader from '../../shaders/Drawing.frag?raw';

  interface Props {
    props: FogOfWarLayerProps;
    mapSize: Size;
  }

  const { props, mapSize }: Props = $props();
  const { renderer } = useThrelte();

  // Create drawing shader
  const drawingShader = new THREE.ShaderMaterial({
    uniforms: {
      previousState: { value: null },
      brushTexture: { value: null },
      start: { value: new THREE.Vector2() },
      end: { value: new THREE.Vector2() },
      brushSize: { value: 1.0 },
      textureSize: { value: new THREE.Vector2() },
      brushColor: { value: new THREE.Vector4() },
      isCopyOperation: { value: false },
      isClearOperation: { value: false },
      isResetOperation: { value: false },
      shapeType: { value: 0 }
    },
    vertexShader,
    fragmentShader
  });

  const image = new Image();

  // Setup the quad that the fog of war is drawn on
  let scene = new THREE.Scene();
  let quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), drawingShader);
  scene.add(quad);

  let material = new THREE.MeshBasicMaterial({
    transparent: true,
    color: props.fogColor,
    opacity: props.opacity
  });

  let bufferManager: BufferManager = new BufferManager(renderer, 0, 0, (current) => {
    material.map = current.texture;
    material.map.needsUpdate = true;
  });

  // Whenever the map size changes, we need to re-initialize the buffers
  $effect(() => {
    bufferManager.resize(mapSize.width, mapSize.height);
    drawingShader.uniforms.textureSize.value = new THREE.Vector2(mapSize.width, mapSize.height);
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

        drawingShader.uniforms.previousState.value = texture;
        drawingShader.uniforms.isCopyOperation.value = true;
        bufferManager.render(scene, quadCamera);
        drawingShader.uniforms.isCopyOperation.value = false;

        bufferManager.persistChanges();

        bufferManager.render(scene, quadCamera);
      };
    }
  });

  // Whenever the fog of war props change, we need to update the material
  $effect(() => {
    material.color = new THREE.Color(props.fogColor);
    material.opacity = props.opacity;
    drawingShader.uniforms.brushSize.value = props.brushSize / 2;
    drawingShader.uniforms.shapeType.value = props.toolType;

    if (props.drawMode === DrawMode.Erase) {
      drawingShader.uniforms.brushColor.value = new THREE.Vector4(0, 0, 0, 0);
    } else {
      drawingShader.uniforms.brushColor.value = new THREE.Vector4(1, 1, 1, 1);
    }

    discardChanges();
  });

  export function discardChanges() {
    if (!bufferManager) return;

    material.map = bufferManager.previous.texture;
    material.map.needsUpdate = true;
  }

  /**
   * Resets the fog of war to fill the entire layer
   */
  export function reset() {
    if (!bufferManager) return;

    drawingShader.uniforms.previousState.value = bufferManager.previous.texture;

    drawingShader.uniforms.isResetOperation.value = true;
    bufferManager.render(scene, quadCamera);
    drawingShader.uniforms.isResetOperation.value = false;

    bufferManager.persistChanges();
  }

  /**
   * Clears the fog of war to reveal the entire map underneath
   */
  export function clear() {
    if (!bufferManager) return;

    drawingShader.uniforms.previousState.value = bufferManager.previous.texture;

    drawingShader.uniforms.isClearOperation.value = true;
    bufferManager.render(scene, quadCamera);
    drawingShader.uniforms.isClearOperation.value = false;

    bufferManager.persistChanges();
  }

  export function drawPath(start: THREE.Vector2, last: THREE.Vector2 | null = null, persist: boolean = false) {
    if (!bufferManager) return;

    drawingShader.uniforms.previousState.value = bufferManager.previous.texture;
    drawingShader.uniforms.start.value.copy(start);
    drawingShader.uniforms.end.value.copy(last ?? start);

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
