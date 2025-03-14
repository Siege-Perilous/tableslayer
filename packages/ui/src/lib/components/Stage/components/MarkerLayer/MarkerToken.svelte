<script lang="ts">
  import * as THREE from 'three';
  import { T } from '@threlte/core';
  import { MarkerShape, type Marker } from './types';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';
  import { getGridCellSize } from '../../helpers/grid';
  import type { GridLayerProps } from '../GridLayer/types';
  import type { DisplayProps } from '../Stage/types';

  interface Props {
    marker: Marker;
    grid: GridLayerProps;
    display: DisplayProps;
    strokeColor: string;
    strokeWidth: number;
    shadowColor: string;
    shadowBlur: number;
    shadowOffset: {
      x: number;
      y: number;
    };
    textColor: string;
    textStroke: number;
    textStrokeColor: string;
    textSize: number;
    isSelected: boolean;
  }

  const {
    marker,
    grid,
    display,
    textColor,
    textStroke,
    textStrokeColor,
    textSize,
    strokeColor,
    strokeWidth,
    shadowColor,
    shadowBlur,
    shadowOffset
  }: Props = $props();

  const markerSize = $derived(getGridCellSize(grid, display) * marker.size);

  // The size of the marker is 90% of the grid cell size
  const sizeMultiplier = 0.9;

  const canvasSize = 1024;

  let markerCanvas = new OffscreenCanvas(canvasSize, canvasSize);
  let ctx = markerCanvas.getContext('2d')!;
  ctx.globalCompositeOperation = 'source-over';

  let markerMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 1.0
  });
  let imageTexture: THREE.Texture | null = $state(null);

  // Load image if URL is provided
  $effect(() => {
    if (marker.imageUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(
        marker.imageUrl,
        (texture) => {
          imageTexture = texture;
          imageTexture.needsUpdate = true;
        },
        undefined,
        (err) => console.error('Error loading image:', err)
      );
    } else {
      imageTexture = null;
    }
  });

  // Create complete marker canvas with shape, stroke, and text
  function createShape(centerX: number, centerY: number, size: number, clipOnly: boolean = false) {
    ctx.beginPath();

    switch (marker.shape) {
      case MarkerShape.None:
        break;
      case MarkerShape.Circle:
        const radius = (size * sizeMultiplier) / 2;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.closePath();
        break;

      case MarkerShape.Square:
        const squareSize = size * sizeMultiplier; // Adjust size to match circle's visual weight
        ctx.rect(centerX - squareSize / 2, centerY - squareSize / 2, squareSize, squareSize);
        ctx.closePath();
        break;

      case MarkerShape.Triangle:
        const height = size * sizeMultiplier;
        ctx.moveTo(centerX, centerY - height / 2); // Top
        ctx.lineTo(centerX - height / 2, centerY + height / 2); // Bottom left
        ctx.lineTo(centerX + height / 2, centerY + height / 2); // Bottom right
        ctx.closePath();
        break;
    }

    if (!clipOnly) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = shadowOffset.x;
      ctx.shadowOffsetY = shadowOffset.y;
      ctx.fill();
      if (strokeWidth > 0) {
        ctx.stroke();
      }
    }

    return ctx;
  }

  // Create text for the marker
  function createText(centerX: number, centerY: number) {
    if (!marker.label) return;

    // Reset shadow settings for text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Set text properties
    ctx.font = `700 ${textSize}px Inter`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add text stroke if specified
    if (textStroke && textStrokeColor) {
      ctx.strokeStyle = textStrokeColor;
      ctx.lineWidth = textStroke * (textSize / 5);
      ctx.strokeText(marker.label, centerX, centerY);
    }

    // Fill text
    ctx.fillStyle = textColor || '#ffffff';
    ctx.fillText(marker.label, centerX, centerY);
  }

  // Create the marker canvas
  function drawMarker() {
    const width = markerCanvas.width;
    const height = markerCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas with transparency
    ctx.clearRect(0, 0, width, height);

    if (marker.shape !== undefined) {
      // Set stroke and fill styles for shape
      ctx.strokeStyle = strokeColor ?? '#000000';
      ctx.lineWidth = strokeWidth;
      ctx.fillStyle = marker.shapeColor ?? '#ffffff';

      createShape(centerX, centerY, canvasSize);

      // Draw image if available
      if (imageTexture) {
        // Save the current canvas state
        ctx.save();

        // Create a smaller shape path for clipping that accounts for stroke width
        const innerSize = canvasSize - strokeWidth; // Reduce by twice the stroke width
        createShape(centerX, centerY, innerSize, true);

        // Apply clipping to the shape
        ctx.clip();

        // Set proper compositing for image drawing
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0; // Ensure full opacity for the image itself

        // Draw the image (will only appear inside the clipped shape)
        ctx.drawImage(
          imageTexture.image,
          centerX - (canvasSize / 2) * marker.imageScale * sizeMultiplier,
          centerY - (canvasSize / 2) * marker.imageScale * sizeMultiplier,
          sizeMultiplier * canvasSize * marker.imageScale,
          sizeMultiplier * canvasSize * marker.imageScale
        );

        // Restore the canvas state (removes clipping)
        ctx.restore();
      }
    }

    // // Draw text if enabled
    if (marker.label) {
      createText(centerX, centerY);
    }

    return markerCanvas;
  }

  // Create and update marker texture when properties change
  $effect(() => {
    console.log('drawMarker');
    markerCanvas = drawMarker();
    markerMaterial.map = new THREE.CanvasTexture(markerCanvas);
    markerMaterial.map.colorSpace = THREE.SRGBColorSpace;
    markerMaterial.map.needsUpdate = true;
  });
</script>

<T.Group position={[marker.position.x, marker.position.y, 0]} scale={[markerSize, markerSize, 1]}>
  <!-- Combined shape, stroke and text -->
  <T.Mesh renderOrder={SceneLayerOrder.Marker} layers={[SceneLayer.Main]}>
    <T.MeshBasicMaterial is={markerMaterial} />
    <T.PlaneGeometry args={[1, 1]} />
  </T.Mesh>
</T.Group>
