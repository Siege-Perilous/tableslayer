<script lang="ts">
  import * as THREE from 'three';
  import { T, useThrelte, type Size } from '@threlte/core';
  import type { FogOfWarLayerProps } from '../components/FogOfWarLayer/types';
  import type { DrawingTool } from '../components/FogOfWarLayer/tools/types';

  interface Props {
    props: FogOfWarLayerProps;
    mapSize: Size;
  }

  const { props, mapSize }: Props = $props();
  const { renderer } = useThrelte();

  let material = new THREE.MeshBasicMaterial({
    transparent: true,
    color: props.fogColor,
    opacity: props.opacity
  });

  const renderTarget = new THREE.WebGLRenderTarget(mapSize.width, mapSize.height, {
    format: THREE.RGBAFormat
  });

  // Render the texture to the render target
  const quadScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quadScene.add(quad);

  $effect(() => {
    if (props.data) {
      const image = new Image();
      image.src = props.data;
      image.onload = () => {
        material.map = renderTarget.texture;
        renderTarget.width = image.width;
        renderTarget.height = image.height;
      };
    } else if (mapSize.width > 0 && mapSize.height > 0) {
      material.map = renderTarget.texture;
      renderTarget.width = mapSize.width;
      renderTarget.height = mapSize.height;
    }
  });

  export function drawPath(tool: DrawingTool, start: THREE.Vector2, end: THREE.Vector2) {
    renderer.setRenderTarget(renderTarget);
    renderer.render(quadScene, quadCamera);
    renderer.setRenderTarget(null);

    const brushRadius = tool.size! / 2;

    // Define the target rectangle on the texture, accounting for the brush radius
    const minX = Math.floor(Math.min(start.x, end.x) - 1.1 * brushRadius);
    const minY = Math.floor(Math.min(start.y, end.y) - 1.1 * brushRadius);
    const width = Math.ceil(Math.abs(end.x - start.x) + 2.2 * brushRadius);
    const height = Math.ceil(Math.abs(end.y - start.y) + 2.2 * brushRadius);

    // Create a temp canvas for the brush operations
    const tempCanvas = new OffscreenCanvas(width, height);
    const context = tempCanvas.getContext('2d')!;

    // Read the current sub-rect into the texture
    const sourceSubRect = new Uint8ClampedArray(width * height * 4);
    renderer.readRenderTargetPixels(renderTarget, minX, minY, width, height, sourceSubRect);

    const imageData = new ImageData(sourceSubRect, width, height);
    context.putImageData(imageData, 0, 0);

    // Set the drawing style (brush, color, etc.)
    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = 'white'; // Example color; adjust as needed
    context.lineCap = 'round';
    context.lineWidth = tool.size!;

    // Translate context so the brush center aligns with the texture region
    context.translate(0, 0);

    // Draw the stroke
    context.beginPath();
    context.moveTo(start.x - minX, start.y - minY); // Start relative to the rect
    context.lineTo(end.x - minX, end.y - minY); // End relative to the rect
    context.stroke();

    // Convert the canvas to a Three.js texture
    const texture = new THREE.CanvasTexture(tempCanvas);

    // Copy the modified section back to the render target
    renderer.copyTextureToTexture(
      texture,
      renderTarget.texture,
      null,
      new THREE.Vector2(Math.floor(minX), Math.floor(minY))
    );

    // Clean up
    texture.dispose();
  }

  // Retrieve modified texture data from GPU
  export async function persistChanges() {
    renderTarget.texture.needsUpdate = true;
    console.log('persisted');
  }
</script>

{#snippet attachMaterial()}
  {material}
{/snippet}

<!-- Export the material to be used in the parent component -->
<T is={material} transparent={true} depthTest={false}>
  {@render attachMaterial()}
</T>
