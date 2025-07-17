import { ImageDataSource } from './ImageDataSource';
import { VideoDataSource } from './VideoDataSource';
// import { GifDataSource } from './GifDataSource'; // For future implementation
import type { IMapDataSource } from './IMapDataSource';

export function createDataSource(url: string): IMapDataSource {
  const extension = url.split('.').pop()?.toLowerCase() || '';

  switch (extension) {
    case 'mp4':
    case 'webm':
    case 'mov':
    case 'avi':
      return new VideoDataSource();

    // case 'gif':
    //   return new GifDataSource();

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
