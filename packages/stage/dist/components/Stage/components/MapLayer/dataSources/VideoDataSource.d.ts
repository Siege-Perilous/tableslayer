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
export declare class VideoDataSource implements IMapDataSource {
    /** HTML video element used for video playback */
    private videoElement;
    /** Three.js video texture created from the video element */
    private texture;
    /** Dimensions of the video */
    private size;
    /**
     * Gets the Three.js video texture containing the playing video.
     *
     * @returns The video texture with the current video frame, or null if not loaded
     */
    getTexture(): THREE.Texture | null;
    /**
     * Gets the dimensions of the loaded video.
     *
     * @returns The width and height of the video, or null if not loaded
     */
    getSize(): Size | null;
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
    load(url: string): Promise<void>;
    /**
     * Disposes of the video element and texture, stopping playback.
     *
     * This method stops video playback, removes the video source,
     * disposes of the Three.js texture, and cleans up all references
     * to prevent memory leaks.
     */
    dispose(): void;
}
