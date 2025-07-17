import type * as THREE from 'three';
import type { Size } from '../../../types';

export interface IMapDataSource {
  /**
   * The texture to be displayed on the map plane.
   * This can be a static texture, a video texture, or a canvas texture.
   * @returns The texture to be displayed on the map plane.
   */
  getTexture(): THREE.Texture | null;

  /**
   * The dimensions of the map source.
   * @returns The dimensions of the map source.
   */
  getSize(): Size | null;

  /**
   * Loads the data source from a URL.
   * @param url - The URL of the data source.
   * @returns A promise that resolves when the data source is loaded.
   */
  load(url: string): Promise<void>;

  /**
   * Cleans up resources used by the data source.
   * @returns void
   */
  dispose(): void;
}
