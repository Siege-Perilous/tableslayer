import * as THREE from 'three';
import type { Size } from '../../../types';
import type { IMapDataSource } from './IMapDataSource';

export class VideoDataSource implements IMapDataSource {
  private videoElement: HTMLVideoElement | null = null;
  private texture: THREE.VideoTexture | null = null;
  private size: Size | null = null;

  getTexture(): THREE.Texture | null {
    return this.texture;
  }

  getSize(): Size | null {
    return this.size;
  }

  async load(url: string): Promise<void> {
    // Dispose of previous resources
    this.dispose();

    return new Promise((resolve, reject) => {
      // Create video element
      this.videoElement = document.createElement('video');
      this.videoElement.crossOrigin = 'anonymous';
      this.videoElement.loop = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      this.videoElement.autoplay = true;

      // Set up event listeners
      this.videoElement.addEventListener('loadedmetadata', () => {
        if (this.videoElement) {
          this.size = {
            width: this.videoElement.videoWidth,
            height: this.videoElement.videoHeight
          };

          // Create video texture
          this.texture = new THREE.VideoTexture(this.videoElement);
          this.texture.colorSpace = THREE.SRGBColorSpace;

          this.videoElement.play();

          resolve();
        }
      });

      this.videoElement.addEventListener('error', (error) => {
        console.error('Failed to load video:', error);
        reject(error);
      });

      // Set source and start loading
      this.videoElement.src = url;
    });
  }

  dispose(): void {
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.removeAttribute('src');
      this.videoElement.load();
      this.videoElement = null;
    }

    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }

    this.size = null;
  }
}
