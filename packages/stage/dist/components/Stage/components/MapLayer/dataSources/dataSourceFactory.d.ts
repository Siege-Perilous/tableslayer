import type { IMapDataSource } from './IMapDataSource';
/**
 * Factory function that creates the appropriate data source based on file extension.
 *
 * This function analyzes the URL's file extension to determine which type of
 * data source to create. It supports various media formats:
 * - Video formats (mp4, webm, mov, avi) → VideoDataSource
 * - GIF animations → GifDataSource
 * - Image formats (jpg, jpeg, png, webp, bmp, tiff) → ImageDataSource
 * - Unknown formats default to ImageDataSource
 *
 * @param url - The URL of the media file to load
 * @returns An instance of the appropriate data source implementation
 *
 * @example
 * ```typescript
 * const dataSource = createDataSource('https://example.com/image.jpg');
 * await dataSource.load('https://example.com/image.jpg');
 * ```
 */
export declare function createDataSource(url: string): IMapDataSource;
