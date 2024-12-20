<script lang="ts">
  import * as THREE from 'three';
  import { T, useThrelte, type Size } from '@threlte/core';
  import type { FogOfWarLayerProps } from '../components/FogOfWarLayer/types';
  import type { DrawingTool } from '../components/FogOfWarLayer/tools/types';
  import { onDestroy } from 'svelte';

  interface Props {
    props: FogOfWarLayerProps;
    mapSize: Size;
  }

  const { props, mapSize }: Props = $props();
  const { renderer } = useThrelte();

  // Create render targets for ping-pong buffer
  class BufferManager {
    private renderTargetA: THREE.WebGLRenderTarget;
    private renderTargetB: THREE.WebGLRenderTarget;
    private currentTarget: THREE.WebGLRenderTarget;
    private previousTarget: THREE.WebGLRenderTarget;

    constructor(width: number, height: number) {
      const options = {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping
      };

      this.renderTargetA = new THREE.WebGLRenderTarget(width, height, options);
      this.renderTargetB = new THREE.WebGLRenderTarget(width, height, options);
      this.currentTarget = this.renderTargetA;
      this.previousTarget = this.renderTargetB;
    }

    swap() {
      const temp = this.currentTarget;
      this.currentTarget = this.previousTarget;
      this.previousTarget = temp;
    }

    get current() {
      return this.currentTarget;
    }
    get previous() {
      return this.previousTarget;
    }

    resize(width: number, height: number) {
      this.renderTargetA.setSize(width, height);
      this.renderTargetB.setSize(width, height);
    }

    dispose() {
      this.renderTargetA.dispose();
      this.renderTargetB.dispose();
    }
  }

  // Create drawing shader
  const drawingShader = new THREE.ShaderMaterial({
    uniforms: {
      previousState: { value: null },
      brushTexture: { value: null },
      lineStart: { value: new THREE.Vector2() },
      lineEnd: { value: new THREE.Vector2() },
      brushSize: { value: 1.0 },
      textureSize: { value: new THREE.Vector2() },
      brushColor: { value: new THREE.Color() }
    },
    vertexShader: `
          varying vec2 vUv;
          void main() {
              vUv = uv;
              gl_Position = vec4(position, 1.0);
          }
      `,
    fragmentShader: `
          uniform sampler2D previousState;
          uniform vec2 lineStart;
          uniform vec2 lineEnd;
          uniform float brushSize;
          uniform vec2 textureSize;
          uniform vec3 brushColor;
          
          varying vec2 vUv;
          
          float distanceToLine(vec2 p, vec2 a, vec2 b) {
              vec2 pa = p - a;
              vec2 ba = b - a;
              float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
              return length(pa - ba * t);
          }
          
          void main() {
              vec2 pixelPos = vUv * textureSize;
              vec4 prevColor = texture2D(previousState, vUv);
              
              float dist = distanceToLine(pixelPos, lineStart, lineEnd);
              float brushMask = step(dist, brushSize);
              
              vec4 brushColorWithAlpha = vec4(brushColor, brushMask);
              
              // Alpha blending
              float finalAlpha = brushColorWithAlpha.a + prevColor.a * (1.0 - brushColorWithAlpha.a);
              vec3 finalColor = (brushColorWithAlpha.rgb * brushColorWithAlpha.a + 
                               prevColor.rgb * prevColor.a * (1.0 - brushColorWithAlpha.a)) / 
                               max(finalAlpha, 0.0001);
              
              gl_FragColor = vec4(finalColor, finalAlpha);
          }
      `,
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

  // Setup scenes
  const setupScenes = () => {
    bufferManager = new BufferManager(mapSize.width, mapSize.height);

    // Setup drawing scene
    drawingScene = new THREE.Scene();
    drawingCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const drawingQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), drawingShader);
    drawingScene.add(drawingQuad);

    // Update material with initial render target
    material.map = bufferManager.current.texture;
  };

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

  // Drawing function
  export function drawPath(tool: DrawingTool, start: THREE.Vector2, end: THREE.Vector2) {
    // Update shader uniforms
    drawingShader.uniforms.previousState.value = bufferManager.previous.texture;
    drawingShader.uniforms.lineStart.value.copy(start);
    drawingShader.uniforms.lineEnd.value.copy(end);
    drawingShader.uniforms.brushSize.value = tool.size! / 2;
    drawingShader.uniforms.textureSize.value.set(mapSize.width, mapSize.height);
    drawingShader.uniforms.brushColor.value.set(props.fogColor || '#ffffff');

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
