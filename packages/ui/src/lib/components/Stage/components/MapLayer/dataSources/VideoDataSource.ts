import * as THREE from 'three';
import type { Size } from '../../../types';
import type { IMapDataSource } from './IMapDataSource';

/**
 * Data source for loading and playing video files as textures in a 3D scene.
 *
 * This class implements the IMapDataSource interface to provide video playback
 * capabilities for map layers. It creates an HTML video element, sets up
 * proper video attributes for web playback, and creates a Three.js VideoTexture
 * for real-time video rendering in 3D space.
 */
export class VideoDataSource implements IMapDataSource {
  /** HTML video element used for video playback */
  private videoElement: HTMLVideoElement | null = null;
  /** Three.js video texture created from the video element */
  private texture: THREE.VideoTexture | null = null;
  /** Dimensions of the video */
  private size: Size | null = null;

  /**
   * Gets the Three.js video texture containing the playing video.
   *
   * @returns The video texture with the current video frame, or null if not loaded
   */
  getTexture(): THREE.Texture | null {
    return this.texture;
  }

  /**
   * Gets the dimensions of the loaded video.
   *
   * @returns The width and height of the video, or null if not loaded
   */
  getSize(): Size | null {
    return this.size;
  }

  /**
   * Loads a video from a URL and starts playback.
   *
   * This method creates an HTML video element with appropriate attributes
   * for web playback (autoplay, muted, loop, etc.), sets up event listeners
   * for loading and error handling, and creates a Three.js VideoTexture
   * for real-time rendering in 3D space.
   *
   * @param url - The URL of the video file to load
   * @returns A promise that resolves when the video is loaded and ready to play
   * @throws Error if the video cannot be loaded or played
   */
  async load(url: string): Promise<void> {
    // Dispose of previous resources
    this.dispose();

    return new Promise((resolve, reject) => {
      // Create video element
      this.videoElement = document.createElement('video');
      // Set crossOrigin to 'anonymous' for CORS-enabled servers
      // This is required for THREE.VideoTexture to work with cross-origin videos
      this.videoElement.crossOrigin = 'anonymous';
      this.videoElement.loop = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      this.videoElement.autoplay = true;
      // Preload the video to ensure it's ready
      this.videoElement.preload = 'auto';

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
          // Set texture parameters for better compatibility
          this.texture.minFilter = THREE.LinearFilter;
          this.texture.magFilter = THREE.LinearFilter;
          this.texture.format = THREE.RGBAFormat;
          // Disable mipmaps to prevent power-of-two issues
          this.texture.generateMipmaps = false;

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

  /**
   * Disposes of the video element and texture, stopping playback.
   *
   * This method stops video playback, removes the video source,
   * disposes of the Three.js texture, and cleans up all references
   * to prevent memory leaks.
   */
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
