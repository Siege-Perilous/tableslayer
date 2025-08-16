import type * as THREE from 'three';
import type { Size } from '../../../types';

/**
 * Interface for map data sources that provide textures for map layers.
 *
 * This interface defines the contract that all map data sources must implement.
 * It provides a unified way to handle different types of media (images, videos, GIFs)
 * as textures in a 3D map environment.
 */
export interface IMapDataSource {
  /**
   * Gets the texture to be displayed on the map plane.
   *
   * This can be a static texture, a video texture, or a canvas texture
   * depending on the implementation. The texture is used to render the
   * data source on a 3D plane in the scene.
   *
   * @returns The texture to be displayed on the map plane, or null if not loaded
   */
  getTexture(): THREE.Texture | null;

  /**
   * Gets the dimensions of the map source.
   *
   * Returns the width and height of the data source, which is used
   * to properly size and position the map layer in the 3D scene.
   *
   * @returns The dimensions of the map source, or null if not loaded
   */
  getSize(): Size | null;

  /**
   * Loads the data source from a URL.
   *
   * This method handles the loading of different media types (images, videos, GIFs)
   * from a given URL. The implementation should handle any necessary parsing,
   * decompression, or setup required for the specific media type.
   *
   * @param url - The URL of the data source to load
   * @returns A promise that resolves when the data source is loaded and ready
   * @throws Error if the data source cannot be loaded or processed
   */
  load(url: string): Promise<void>;

  /**
   * Cleans up resources used by the data source.
   *
   * This method should dispose of any textures, canvases, video elements,
   * or other resources that were created during the loading process.
   * It should be called when the data source is no longer needed to
   * prevent memory leaks.
   */
  dispose(): void;
}
