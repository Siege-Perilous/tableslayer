<script lang="ts">
  import * as THREE from 'three';
  import { T, useThrelte, type Size } from '@threlte/core';
  import { DrawMode, type FogOfWarLayerProps } from './types';
  import { onDestroy } from 'svelte';
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
      lineStart: { value: new THREE.Vector2() },
      lineEnd: { value: new THREE.Vector2() },
      brushSize: { value: 1.0 },
      textureSize: { value: new THREE.Vector2() },
      brushColor: { value: new THREE.Vector4() },
      isClearOperation: { value: false },
      isResetOperation: { value: false }
    },
    vertexShader,
    fragmentShader
  });

  // Initialize state
  let bufferManager: BufferManager;
  let drawingScene: THREE.Scene;
  let drawingCamera: THREE.OrthographicCamera;
  let material = new THREE.MeshBasicMaterial({
    transparent: true,
    color: props.fogColor,
    opacity: props.opacity
  });

  $effect(() => {
    // material.color = new THREE.Color(props.fogColor);
    material.opacity = props.opacity;
  });

  // Setup scenes
  function setupScenes() {
    bufferManager = new BufferManager(mapSize.width, mapSize.height);

    // Update material with initial render target
    material.map = bufferManager.current.texture;

    // Setup drawing scene
    drawingScene = new THREE.Scene();
    drawingCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const drawingQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), drawingShader);
    drawingScene.add(drawingQuad);

    // Fill twice, so both buffers are initialized
    reset();
  }

  // Initialize on mount
  $effect(() => {
    if (props.data) {
      const image = new Image();
      image.src = props.data;
      image.onload = () => {
        setupScenes();
        bufferManager.resize(image.width, image.height);
      };
    } else if (mapSize.width > 0 && mapSize.height > 0) {
      setupScenes();
      bufferManager.resize(mapSize.width, mapSize.height);
    }
  });

  /**
   * Resets the fog of war to fill the entire layer
   */
  export function reset() {
    if (!bufferManager) return;
    drawingShader.uniforms.isResetOperation.value = true;
    drawingShader.uniforms.previousState.value = bufferManager.previous.texture;
    bufferManager.render(renderer, drawingScene, drawingCamera, true);
    drawingShader.uniforms.isResetOperation.value = false;

    // Update material with initial render target
    material.map = bufferManager.current.texture;
  }

  /**
   * Clears the fog of war to reveal the entire map underneath
   */
  export function clear() {
    if (!bufferManager) return;
    drawingShader.uniforms.isClearOperation.value = true;
    drawingShader.uniforms.previousState.value = bufferManager.previous.texture;
    bufferManager.render(renderer, drawingScene, drawingCamera, true);
    drawingShader.uniforms.isClearOperation.value = false;

    // Update material with initial render target
    material.map = bufferManager.current.texture;
  }

  // Drawing function
  export function drawPath(
    start: THREE.Vector2,
    end: THREE.Vector2,
    size: number,
    mode: DrawMode,
    persist: boolean = false
  ) {
    // Update shader uniforms
    drawingShader.uniforms.previousState.value = bufferManager.previous.texture;
    drawingShader.uniforms.lineStart.value.copy(start);
    drawingShader.uniforms.lineEnd.value.copy(end);
    drawingShader.uniforms.brushSize.value = size / 2;
    drawingShader.uniforms.textureSize.value = new THREE.Vector2(mapSize.width, mapSize.height);

    // Set color based on mode - transparent for erase, fog color for draw
    if (mode === DrawMode.Erase) {
      drawingShader.uniforms.brushColor.value = new THREE.Vector4(0, 0, 0, 0);
    } else {
      drawingShader.uniforms.brushColor.value = new THREE.Vector4(1, 1, 1, 1);
    }

    // Always render to show preview
    bufferManager.render(renderer, drawingScene, drawingCamera, persist);

    // Update material with initial render target
    material.map = bufferManager.current.texture;
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
