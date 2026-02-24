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
export declare class GifDataSource implements IMapDataSource {
    /** Canvas element used for rendering the GIF frames */
    private gifCanvas;
    /** 2D rendering context for the main GIF canvas */
    private gifCtx;
    /** Temporary canvas used for patch rendering of individual frames */
    private tempCanvas;
    /** 2D rendering context for the temporary canvas */
    private tempCtx;
    /** Three.js texture created from the GIF canvas */
    private texture;
    /** Dimensions of the GIF image */
    private size;
    /** Array of decompressed GIF frames */
    private frames;
    /** Index of the currently displayed frame */
    private currentFrameIndex;
    /** Animation frame ID for canceling the animation loop */
    private animationId;
    /** Timestamp when the animation started for timing calculations */
    private startTime;
    /** Timestamp of the last frame render */
    private lastFrameTime;
    /** The total time the animation has been playing */
    private totalPlayTime;
    /**
     * Gets the Three.js texture containing the animated GIF.
     *
     * @returns The canvas texture with the current frame, or null if not loaded
     */
    getTexture(): THREE.Texture | null;
    /**
     * Gets the dimensions of the GIF image.
     *
     * @returns The width and height of the GIF, or null if not loaded
     */
    getSize(): Size | null;
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
    load(url: string): Promise<void>;
    /**
     * Starts the GIF animation loop.
     *
     * This method initializes the animation by setting up the rendering context,
     * starting the timing mechanism, and beginning the animation frame loop.
     * The animation automatically loops when all frames have been displayed.
     */
    private startAnimation;
    /**
     * Renders a specific frame of the GIF animation.
     *
     * This method handles frame disposal methods and delegates the actual
     * drawing to the drawPatch method.
     *
     * @param frameIndex - The index of the frame to render
     */
    private renderFrame;
    /**
     * Draws a frame patch onto the main canvas.
     *
     * This method uses a temporary canvas to efficiently render individual
     * frame patches at their correct positions within the GIF.
     *
     * @param frame - The frame object containing patch data and dimensions
     */
    private drawPatch;
    /**
     * Disposes of all resources used by this data source.
     *
     * This method stops the animation loop, disposes of the Three.js texture,
     * clears all canvas references, and resets internal state. It should be
     * called before loading a new GIF or when the data source is no longer needed.
     */
    dispose(): void;
}
