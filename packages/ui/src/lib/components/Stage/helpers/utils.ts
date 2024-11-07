import type { Size } from '@threlte/core';
import * as THREE from 'three';
import { ScaleMode } from '../components/Scene/types';

/**
 * Returns the scale factor for the map based on the `fillMode`
 * @param imageSize The size of the image in pixels
 * @param canvasSize The size of the canvas in pixels
 * @param scaleMode Scaling mode controlling whether the image should be scaled to
 * fill the canvas (may result in cropping), fit inside the canvas (image will
 * be letterboxed), or if a custom scale should be used.
 * @param customScale Custom scale factor to apply to the image if `scadleMode` is set to `Custom`
 * @returns
 */
export function getImageScale(
  imageSize: Size,
  canvasSize: Size,
  scaleMode: ScaleMode,
  customScale: number
): [x: number, y: number, z: number] {
  const scaledSize: [x: number, y: number, z: number] = [imageSize.width, imageSize.height, 1];

  if (scaleMode === ScaleMode.Custom) {
    // If no scaling, use the custom scale value
    return [customScale * imageSize.width, customScale * imageSize.height, 1];
  }

  const imageAspectRatio = imageSize.width / imageSize.height;
  const containerAspectRatio = canvasSize.width / canvasSize.height;

  scaledSize[0] = canvasSize.width;
  scaledSize[1] = canvasSize.height;

  if (scaleMode === ScaleMode.Fill) {
    // Scale to fill the entire container (image may be cropped)
    if (imageAspectRatio < containerAspectRatio) {
      scaledSize[1] = canvasSize.width / imageAspectRatio;
    } else {
      scaledSize[0] = canvasSize.height * imageAspectRatio;
    }
  } else if (scaleMode === ScaleMode.Fit) {
    // Scale to fit the entire image within the container (image will be letterboxed/pillarboxed)
    if (imageAspectRatio > containerAspectRatio) {
      scaledSize[1] = canvasSize.width / imageAspectRatio;
    } else {
      scaledSize[0] = canvasSize.height * imageAspectRatio;
    }
  }

  return scaledSize;
}

export function textureToBase64(texture: THREE.Texture) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  // Set canvas dimensions to the texture dimensions
  canvas.width = texture.image.width;
  canvas.height = texture.image.height;

  // Draw the texture image onto the canvas
  context.drawImage(texture.image, 0, 0);

  canvas.remove();

  // Get the base64-encoded data URL of the canvas
  return canvas.toDataURL('image/png'); // "image/png" or other formats as needed
}

export function base64ToTexture(base64: string) {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = base64;

    image.onload = () => {
      const texture = new THREE.Texture(image);
      texture.needsUpdate = true; // Update the texture with the loaded image
      resolve(texture);
    };
  });
}
