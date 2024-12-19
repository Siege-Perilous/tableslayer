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

  let fogTexture: THREE.DataTexture;
  let material = new THREE.MeshBasicMaterial({
    transparent: true,
    color: props.fogColor,
    opacity: props.opacity
  });

  const tempCanvas = new OffscreenCanvas(0, 0);
  const context = tempCanvas.getContext('2d')!;

  const renderTarget = new THREE.WebGLRenderTarget(mapSize.width, mapSize.height, {
    format: THREE.RGBAFormat
  });

  // Render the texture to the render target
  const quadScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadMaterial = new THREE.MeshBasicMaterial();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMaterial);
  quadScene.add(quad);

  $effect(() => {
    if (props.data) {
      const image = new Image();
      image.src = props.data;
      image.onload = () => {
        fogTexture = new THREE.DataTexture(
          new Uint8Array(image.width * image.height * 4).fill(255),
          image.width,
          image.height,
          THREE.RGBAFormat
        );

        fogTexture.needsUpdate = true;
        material.map = fogTexture;
        quadMaterial.map = fogTexture;

        renderTarget.width = image.width;
        renderTarget.height = image.height;
      };
    } else if (mapSize.width > 0 && mapSize.height > 0) {
      fogTexture = new THREE.DataTexture(
        new Uint8Array(mapSize.width * mapSize.height * 4).fill(255),
        mapSize.width,
        mapSize.height,
        THREE.RGBAFormat
      );

      fogTexture.needsUpdate = true;
      material.map = fogTexture;
      quadMaterial.map = fogTexture;

      renderTarget.width = mapSize.width;
      renderTarget.height = mapSize.height;
    }
  });

  export function drawPath(tool: DrawingTool, start: THREE.Vector2, end: THREE.Vector2) {
    // Determine brush size and radius
    const brushRadius = tool.size! / 2;

    // Calculate the dimensions of the intermediate texture, accounting for the brush size
    const width = Math.abs(end.x - start.x) + 2 * brushRadius;
    const height = Math.abs(end.y - start.y) + 2 * brushRadius;

    // Create a canvas for intermediate drawing
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);
    const context = canvas.getContext('2d')!;

    // Set the drawing style (brush, color, etc.)
    context.strokeStyle = 'black'; // Example color; adjust as needed
    context.lineCap = 'round';
    context.lineWidth = tool.size!; // Brush size

    // Translate the context to center the line within the expanded texture
    context.translate(brushRadius, brushRadius);

    // Draw the path on the canvas
    context.beginPath();
    context.moveTo(0, 0); // Start point relative to the intermediate texture
    context.lineTo(end.x - start.x, end.y - start.y); // End point relative to the intermediate texture
    context.stroke();

    // Convert the canvas to a Three.js texture
    const texture = new THREE.CanvasTexture(canvas);

    // Define the target rectangle on fogTexture for copy, accounting for brush
    const coords = new THREE.Vector2(Math.min(start.x, end.x), Math.min(start.y, end.y));

    // Copy the intermediate texture to fogTexture
    renderer.copyTextureToTexture(texture, fogTexture, null, coords);

    // Clean up if necessary
    texture.dispose();
  }

  // Retrieve modified texture data from GPU
  export async function persistChanges() {
    renderer.setRenderTarget(renderTarget);
    renderer.render(quadScene, quadCamera);
    renderer.setRenderTarget(null);

    // Read the render target data back into the texture
    await renderer.readRenderTargetPixelsAsync(
      renderTarget,
      0,
      0,
      fogTexture.image.width,
      fogTexture.image.height,
      fogTexture.image.data
    );
  }
</script>

{#snippet attachMaterial()}
  {material}
{/snippet}

<!-- Export the material to be used in the parent component -->
<T is={material} transparent={true} depthTest={false}>
  {@render attachMaterial()}
</T>
