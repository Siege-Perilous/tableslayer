import * as THREE from 'three';
import type { Size } from '../../../types';
import type { IMapDataSource } from './IMapDataSource';

/**
 * Data source for loading static images as textures in a 3D scene.
 *
 * This class implements the IMapDataSource interface to provide static image
 * loading capabilities for map layers. It uses Three.js TextureLoader to load
 * various image formats and create textures suitable for 3D rendering.
 */
export class ImageDataSource implements IMapDataSource {
  /** The loaded texture from the image file */
  private texture: THREE.Texture | null = null;
  /** Dimensions of the loaded image */
  private size: Size | null = null;
  /** Three.js texture loader instance for loading images */
  private loader = new THREE.TextureLoader();

  /**
   * Gets the Three.js texture containing the loaded image.
   *
   * @returns The texture with the loaded image, or null if not loaded
   */
  getTexture(): THREE.Texture | null {
    return this.texture;
  }

  /**
   * Gets the dimensions of the loaded image.
   *
   * @returns The width and height of the image, or null if not loaded
   */
  getSize(): Size | null {
    return this.size;
  }

  /**
   * Loads an image from a URL and creates a texture.
   *
   * This method uses Three.js TextureLoader to load various image formats
   * (JPG, PNG, WebP, etc.) and creates a texture with proper color space
   * settings for 3D rendering.
   *
   * @param url - The URL of the image file to load
   * @returns A promise that resolves when the image is loaded and ready
   * @throws Error if the image cannot be loaded or processed
   */
  async load(url: string): Promise<void> {
    // Dispose of previous texture if it exists
    this.dispose();

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          this.texture = texture;
          this.size = {
            width: texture.image.width,
            height: texture.image.height
          };
          resolve();
        },
        undefined,
        (error) => {
          console.error('Failed to load image:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Disposes of the loaded texture and resets internal state.
   *
   * This method cleans up the Three.js texture to prevent memory leaks
   * and resets the size information.
   */
  dispose(): void {
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
    this.size = null;
  }
}
