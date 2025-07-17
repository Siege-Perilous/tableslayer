import { decompressFrames, parseGIF } from 'gifuct-js';
import * as THREE from 'three';
import type { Size } from '../../../types';
import type { IMapDataSource } from './IMapDataSource';

/**
 * Data source for loading and animating GIF images as textures in a 3D scene.
 *
 * This class implements the IMapDataSource interface to provide GIF animation
 * capabilities for map layers. It handles GIF parsing, frame decompression,
 * and real-time animation rendering using HTML5 Canvas and Three.js textures.
 */
export class GifDataSource implements IMapDataSource {
  /** Canvas element used for rendering the GIF frames */
  private gifCanvas: HTMLCanvasElement | null = null;
  /** 2D rendering context for the main GIF canvas */
  private gifCtx: CanvasRenderingContext2D | null = null;
  /** Temporary canvas used for patch rendering of individual frames */
  private tempCanvas: HTMLCanvasElement | null = null;
  /** 2D rendering context for the temporary canvas */
  private tempCtx: CanvasRenderingContext2D | null = null;
  /** Three.js texture created from the GIF canvas */
  private texture: THREE.CanvasTexture | null = null;
  /** Dimensions of the GIF image */
  private size: Size | null = null;
  /** Array of decompressed GIF frames */
  private frames: any[] = [];
  /** Index of the currently displayed frame */
  private currentFrameIndex = 0;
  /** Animation frame ID for canceling the animation loop */
  private animationId: number | null = null;
  /** Timestamp when the animation started for timing calculations */
  private startTime = 0;
  /** Timestamp of the last frame render */
  private lastFrameTime = 0;
  /** The total time the animation has been playing */
  private totalPlayTime = 0;

  /**
   * Gets the Three.js texture containing the animated GIF.
   *
   * @returns The canvas texture with the current frame, or null if not loaded
   */
  getTexture(): THREE.Texture | null {
    return this.texture;
  }

  /**
   * Gets the dimensions of the GIF image.
   *
   * @returns The width and height of the GIF, or null if not loaded
   */
  getSize(): Size | null {
    return this.size;
  }

  /**
   * Loads and initializes a GIF from a URL.
   *
   * This method fetches the GIF data, parses it, decompresses the frames,
   * sets up the rendering canvases, and starts the animation loop.
   *
   * @param url - The URL of the GIF file to load
   * @returns A promise that resolves when the GIF is loaded and ready
   * @throws Error if the GIF cannot be fetched, parsed, or has no frames
   */
  async load(url: string): Promise<void> {
    // Dispose of previous resources
    this.dispose();

    return new Promise(async (resolve, reject) => {
      try {
        // Fetch the GIF data
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();

        // Parse the GIF
        const gif = parseGIF(arrayBuffer);
        this.frames = decompressFrames(gif, true);

        if (this.frames.length === 0) {
          throw new Error('No frames found in GIF');
        }

        // Get dimensions from the first frame
        const firstFrame = this.frames[0];
        this.size = {
          width: firstFrame.dims.width,
          height: firstFrame.dims.height
        };

        // Create canvas for rendering
        this.gifCanvas = document.createElement('canvas');
        this.gifCanvas.width = this.size.width;
        this.gifCanvas.height = this.size.height;

        // Create temporary canvas for patch rendering
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d')!;

        // Create texture from canvas
        this.texture = new THREE.CanvasTexture(this.gifCanvas);
        this.texture.colorSpace = THREE.SRGBColorSpace;

        // Start animation
        this.startAnimation();

        resolve();
      } catch (error) {
        console.error('Failed to load GIF:', error);
        reject(error);
      }
    });
  }

  /**
   * Starts the GIF animation loop.
   *
   * This method initializes the animation by setting up the rendering context,
   * starting the timing mechanism, and beginning the animation frame loop.
   * The animation automatically loops when all frames have been displayed.
   */
  private startAnimation(): void {
    if (!this.gifCanvas || this.frames.length === 0) return;

    this.gifCtx = this.gifCanvas.getContext('2d')!;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.currentFrameIndex = -1;
    this.totalPlayTime = 0;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      const currentTime = performance.now();
      const elapsedTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      const currentFrame = this.frames[this.currentFrameIndex];
      const frameDelay = currentFrame?.delay ?? 0;

      this.totalPlayTime += elapsedTime;

      // If the current frame has played for its duration, advance to the next frame
      if (this.totalPlayTime >= frameDelay) {
        this.totalPlayTime -= frameDelay;
        this.currentFrameIndex++;

        // Loop back to the beginning
        if (this.currentFrameIndex >= this.frames.length) {
          this.currentFrameIndex = 0;
        }

        this.renderFrame(this.currentFrameIndex);

        // Update texture
        if (this.texture) {
          this.texture.needsUpdate = true;
        }
      }
    };

    // Start the animation loop
    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Renders a specific frame of the GIF animation.
   *
   * This method handles frame disposal methods and delegates the actual
   * drawing to the drawPatch method.
   *
   * @param frameIndex - The index of the frame to render
   */
  private renderFrame(frameIndex: number): void {
    const frame = this.frames[frameIndex];

    // Clear canvas if disposal method requires it (like the example)
    if (frame.disposalType === 2) {
      this.gifCtx!.clearRect(0, 0, this.gifCanvas!.width, this.gifCanvas!.height);
    }

    // Draw the patch using the temporary canvas approach
    this.drawPatch(frame);
  }

  /**
   * Draws a frame patch onto the main canvas.
   *
   * This method uses a temporary canvas to efficiently render individual
   * frame patches at their correct positions within the GIF.
   *
   * @param frame - The frame object containing patch data and dimensions
   */
  private drawPatch(frame: any): void {
    const dims = frame.dims;

    // Resize temp canvas if needed
    if (!this.tempCanvas || dims.width !== this.tempCanvas.width || dims.height !== this.tempCanvas.height) {
      this.tempCanvas!.width = dims.width;
      this.tempCanvas!.height = dims.height;
    }

    // Create ImageData for the patch
    const frameImageData = this.tempCtx!.createImageData(dims.width, dims.height);

    // Set the patch data
    frameImageData.data.set(frame.patch);

    // Put the patch data on the temp canvas
    this.tempCtx!.putImageData(frameImageData, 0, 0);

    // Draw the temp canvas onto the main canvas at the correct position
    this.gifCtx!.drawImage(this.tempCanvas!, dims.left, dims.top);
  }

  /**
   * Disposes of all resources used by this data source.
   *
   * This method stops the animation loop, disposes of the Three.js texture,
   * clears all canvas references, and resets internal state. It should be
   * called before loading a new GIF or when the data source is no longer needed.
   */
  dispose(): void {
    // Stop animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Dispose of texture
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }

    // Clear canvas
    if (this.gifCanvas) {
      this.gifCanvas = null;
    }

    // Clear temp canvas
    if (this.tempCanvas) {
      this.tempCanvas = null;
      this.tempCtx = null;
    }

    // Clear frames
    this.frames = [];
    this.currentFrameIndex = 0;
    this.size = null;
  }
}
