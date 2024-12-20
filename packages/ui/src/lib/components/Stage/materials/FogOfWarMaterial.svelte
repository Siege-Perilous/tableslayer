<script lang="ts">
  import * as THREE from 'three';
  import { T, useThrelte, type Size } from '@threlte/core';
  import { DrawMode, type FogOfWarLayerProps } from '../components/FogOfWarLayer/types';
  import { onDestroy } from 'svelte';
  import { BufferManager } from './BufferManager';
  import vertexShader from '../shaders/Drawing.vert?raw';
  import fragmentShader from '../shaders/Drawing.frag?raw';

  interface Props {
    props: FogOfWarLayerProps;
    mapSize: Size;
  }

  const { props, mapSize }: Props = $props();
  const { renderer, invalidate } = useThrelte();

  // Create drawing shader
  const drawingShader = new THREE.ShaderMaterial({
    uniforms: {
      previousState: { value: null },
      brushTexture: { value: null },
      lineStart: { value: new THREE.Vector2() },
      lineEnd: { value: new THREE.Vector2() },
      brushSize: { value: 1.0 },
      textureSize: { value: new THREE.Vector2() },
      brushColor: { value: new THREE.Color() },
      isClearOperation: { value: false },
      isResetOperation: { value: false },
      fogColor: { value: new THREE.Color(props.fogColor) },
      opacity: { value: props.opacity }
    },
    vertexShader,
    fragmentShader,
    transparent: true
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
    drawingShader.uniforms.opacity.value = props.opacity;
    drawingShader.uniforms.fogColor.value = new THREE.Color(props.fogColor);
    drawingShader.uniforms.textureSize.value = new THREE.Vector2(mapSize.width, mapSize.height);
    drawingShader.uniforms.isClearOperation.value = false;
    drawingShader.uniforms.isResetOperation.value = false;

    console.log(props.opacity);

    invalidate();
  });

  // Setup scenes
  function setupScenes() {
    bufferManager = new BufferManager(mapSize.width, mapSize.height);

    // Setup drawing scene
    drawingScene = new THREE.Scene();
    drawingCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const drawingQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), drawingShader);
    drawingScene.add(drawingQuad);

    // Fill twice, so both buffers are initialized
    fill(false);
    fill(false);

    // Update material with initial render target
    material.map = bufferManager.current.texture;
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

  // Simplified reset function
  export function fill(clear: boolean = false) {
    if (!bufferManager) return;

    drawingShader.uniforms.previousState.value = bufferManager.previous.texture;

    if (clear) {
      drawingShader.uniforms.isClearOperation.value = true;
    } else {
      drawingShader.uniforms.isResetOperation.value = true;
    }

    console.log(drawingShader.uniforms.isClearOperation.value, drawingShader.uniforms.isResetOperation.value);

    // Render to both buffers
    renderer.setRenderTarget(bufferManager.current);
    renderer.render(drawingScene, drawingCamera);
    renderer.setRenderTarget(null);

    drawingShader.uniforms.isClearOperation.value = false;
    drawingShader.uniforms.isResetOperation.value = false;

    material.map = bufferManager.current.texture;
    bufferManager.swap();
  }

  // Drawing function
  export function drawPath(start: THREE.Vector2, end: THREE.Vector2, size: number, mode: DrawMode) {
    // Update shader uniforms
    drawingShader.uniforms.previousState.value = bufferManager.previous.texture;
    drawingShader.uniforms.lineStart.value.copy(start);
    drawingShader.uniforms.lineEnd.value.copy(end);
    drawingShader.uniforms.brushSize.value = size / 2;
    drawingShader.uniforms.textureSize.value.set(mapSize.width, mapSize.height);

    // Set color based on mode - transparent for erase, fog color for draw
    if (mode === DrawMode.Erase) {
      drawingShader.uniforms.brushColor.value.set('#000000');
    } else {
      drawingShader.uniforms.brushColor.value.set(props.fogColor || '#ffffff');
    }

    // Render to current target
    renderer.setRenderTarget(bufferManager.current);
    renderer.render(drawingScene, drawingCamera);
    renderer.setRenderTarget(null);

    // Update material's texture
    material.map = bufferManager.current.texture;

    // Swap buffers for next frame
    bufferManager.swap();
  }

  // Cleanup on destroy
  onDestroy(() => {
    bufferManager?.dispose();
  });

  // Export persist function (if needed)
  export async function persistChanges() {
    // No need to call needsUpdate anymore
    console.log('Changes are already persistent in GPU memory');
  }
</script>

{#snippet attachMaterial()}
  {material}
{/snippet}

<T is={material} transparent={true} depthTest={false}>
  {@render attachMaterial()}
</T>
