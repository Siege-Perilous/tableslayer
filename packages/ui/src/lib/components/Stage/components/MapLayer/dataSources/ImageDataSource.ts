import * as THREE from 'three';
import type { Size } from '../../../types';
import type { IMapDataSource } from './IMapDataSource';

export class ImageDataSource implements IMapDataSource {
  private texture: THREE.Texture | null = null;
  private size: Size | null = null;
  private loader = new THREE.TextureLoader();

  getTexture(): THREE.Texture | null {
    return this.texture;
  }

  getSize(): Size | null {
    return this.size;
  }

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

  dispose(): void {
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
    this.size = null;
  }
}
