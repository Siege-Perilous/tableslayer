import type { Size } from '@threlte/core';
import * as THREE from 'three';
import { ScaleMode } from './types';

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
): THREE.Vector3 {
  const scaledSize = new THREE.Vector3(imageSize.width, imageSize.height, 1);

  if (scaleMode === ScaleMode.Custom) {
    // If no scaling, use the custom scale value
    return scaledSize.multiplyScalar(customScale);
  }

  const imageAspectRatio = imageSize.width / imageSize.height;
  const containerAspectRatio = canvasSize.width / canvasSize.height;

  if (scaleMode === ScaleMode.Fill) {
    // Scale to fill the entire container (image may be cropped)
    if (imageAspectRatio < containerAspectRatio) {
      scaledSize.x = canvasSize.width;
      scaledSize.y = canvasSize.width / imageAspectRatio;
    } else {
      scaledSize.x = canvasSize.height * imageAspectRatio;
      scaledSize.y = canvasSize.height;
    }
  } else if (scaleMode === ScaleMode.Fit) {
    // Scale to fit the entire image within the container (image will be letterboxed/pillarboxed)
    if (imageAspectRatio > containerAspectRatio) {
      scaledSize.x = canvasSize.width;
      scaledSize.y = canvasSize.width / imageAspectRatio;
    } else {
      scaledSize.x = canvasSize.height * imageAspectRatio;
      scaledSize.y = canvasSize.height;
    }
  }

  return scaledSize;
}
