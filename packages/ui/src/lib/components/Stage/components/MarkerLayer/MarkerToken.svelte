<script lang="ts">
  import * as THREE from 'three';
  import { T } from '@threlte/core';
  import { MarkerShape, type Marker } from './types';
  import { SceneLayerOrder } from '../Scene/types';

  interface Props {
    marker: Marker;
    size: number;
    strokeColor: string;
    strokeWidth: number;
    textColor: string;
    textStroke: number;
    textStrokeColor: string;
    textSize: number;
    isSelected: boolean;
  }

  const { marker, size, textColor, textStroke, textStrokeColor, textSize, strokeColor, strokeWidth }: Props = $props();

  let markerCanvas = new OffscreenCanvas(1024, 1024);
  let ctx = markerCanvas.getContext('2d')!;
  let markerMaterial = new THREE.MeshBasicMaterial({
    transparent: false,
    alphaTest: 0.9,
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
  function createShape(centerX: number, centerY: number, radius: number, clipOnly: boolean = false) {
    ctx.beginPath();

    switch (marker.shape) {
      case MarkerShape.None:
        break;
      case MarkerShape.Circle:
        ctx.arc(centerX, centerY, radius / 2, 0, Math.PI * 2);
        break;

      case MarkerShape.Square:
        const squareSize = radius * 0.9; // Adjust size to match circle's visual weight
        ctx.rect(centerX - squareSize / 2, centerY - squareSize / 2, squareSize, squareSize);
        break;

      case MarkerShape.Triangle:
        const triangleWidth = radius * 1.3;
        const triangleHeight = radius * 1.2;
        // Calculate center of mass offset to center triangle
        const centerOffset = -triangleHeight / 6;
        ctx.moveTo(centerX, centerY - triangleHeight / 2 + centerOffset); // Top
        ctx.lineTo(centerX - triangleWidth / 2, centerY + triangleHeight / 2 + centerOffset); // Bottom left
        ctx.lineTo(centerX + triangleWidth / 2, centerY + triangleHeight / 2 + centerOffset); // Bottom right
        ctx.closePath();
        break;
    }

    if (!clipOnly) {
      ctx.fill();
      if (strokeWidth > 0) {
        ctx.stroke();
      }
    }

    return ctx;
  }

  // Create text for the marker
  function createText(centerX: number, centerY: number) {
    if (!marker.text) return;

    // Set text properties
    ctx.font = `bold ${textSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add text stroke if specified
    if (textStroke && textStrokeColor) {
      ctx.strokeStyle = textStrokeColor;
      ctx.lineWidth = textStroke * (textSize / 5);
      ctx.strokeText(marker.text, centerX, centerY);
    }

    // Fill text
    ctx.fillStyle = textColor || '#ffffff';
    ctx.fillText(marker.text, centerX, centerY);
  }

  // Create the marker canvas
  function drawMarker() {
    const width = markerCanvas.width;
    const height = markerCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas with transparency
    ctx.clearRect(0, 0, width, height);

    // Draw shape if enabled
    if (marker.shape !== undefined) {
      // Set stroke and fill styles for shape
      ctx.strokeStyle = strokeColor ?? '#000000';
      ctx.lineWidth = strokeWidth * (size / 10);
      ctx.fillStyle = marker.shapeColor ?? '#ffffff';

      createShape(centerX, centerY, size);

      // Draw image if available
      if (imageTexture) {
        // Save the current canvas state
        ctx.save();

        // Create a smaller shape path for clipping that accounts for stroke width
        const innerSize = size - strokeWidth * (size / 10); // Reduce by twice the stroke width
        createShape(centerX, centerY, innerSize, true);

        // Apply clipping to the shape
        ctx.clip();

        // Set proper compositing for image drawing
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0; // Ensure full opacity for the image itself

        // Draw the image (will only appear inside the clipped shape)
        ctx.drawImage(
          imageTexture.image,
          centerX - (size / 2) * (marker.imageScale ?? 1.0),
          centerY - (size / 2) * (marker.imageScale ?? 1.0),
          size * (marker.imageScale ?? 1.0),
          size * (marker.imageScale ?? 1.0)
        );

        // Restore the canvas state (removes clipping)
        ctx.restore();
      }
    }

    // Draw text if enabled
    if (marker.text) {
      createText(centerX, centerY);
    }

    return markerCanvas;
  }

  // Create and update marker texture when properties change
  $effect(() => {
    markerCanvas = drawMarker();
    markerMaterial.map = new THREE.CanvasTexture(markerCanvas);
    markerMaterial.map.colorSpace = THREE.SRGBColorSpace;
    markerMaterial.map.needsUpdate = true;
  });
</script>

<T.Group visible={marker.visible} position={[marker.position.x, marker.position.y, 0]} scale={size / 1000}>
  <!-- Combined shape, stroke and text -->
  <T.Mesh position={[0, 0, 0]} renderOrder={SceneLayerOrder.Marker}>
    <T.MeshBasicMaterial is={markerMaterial} />
    <T.PlaneGeometry args={[1, 1]} />
  </T.Mesh>
</T.Group>
