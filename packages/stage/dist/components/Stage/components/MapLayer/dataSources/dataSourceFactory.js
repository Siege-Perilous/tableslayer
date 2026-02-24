import { GifDataSource } from './GifDataSource';
import { ImageDataSource } from './ImageDataSource';
import { VideoDataSource } from './VideoDataSource';
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
export function createDataSource(url) {
    var _a;
    const urlWithoutParams = url.split('?')[0];
    const extension = ((_a = urlWithoutParams.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    switch (extension) {
        case 'mp4':
        case 'webm':
        case 'mov':
        case 'avi':
            return new VideoDataSource();
        case 'gif':
            return new GifDataSource();
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'webp':
        case 'bmp':
        case 'tiff':
        default:
            return new ImageDataSource();
    }
}
