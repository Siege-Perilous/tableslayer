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

  // Initialize on mount
  onMount(() => {
    if (props.data) {
      const image = new Image();
      image.src = props.data;
      image.onload = () => {
        bufferManager.resize(image.width, image.height);
      };
    }
  });

  // Whenever the map size changes, we need to re-initialize the buffers
  $effect(() => {
    bufferManager.resize(mapSize.width, mapSize.height);
    drawingShader.uniforms.textureSize.value = new THREE.Vector2(mapSize.width, mapSize.height);

    // Reset the fog of war to fill the entire layer
    reset();
  });

  // Whenever the fog of war props change, we need to update the material
  $effect(() => {
    material.color = new THREE.Color(props.fogColor);
    material.opacity = props.opacity;
    drawingShader.uniforms.brushSize.value = props.brushSize / 2;
    if (props.drawMode === DrawMode.Erase) {
      drawingShader.uniforms.brushColor.value = new THREE.Vector4(0, 0, 0, 0);
    } else {
      drawingShader.uniforms.brushColor.value = new THREE.Vector4(1, 1, 1, 1);
    }

    drawingShader.uniforms.previousState.value = bufferManager.previous.texture;
    bufferManager.render(scene, quadCamera);
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
    drawingShader.uniforms.lineStart.value.copy(start);
    drawingShader.uniforms.lineEnd.value.copy(last ?? start);

    bufferManager.render(scene, quadCamera);

    if (persist) {
      bufferManager.persistChanges();
    }
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
