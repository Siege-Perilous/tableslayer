/**
 * Map Layer Data Sources Module
 *
 * This module provides a unified interface for loading different types of media
 * as textures in 3D map layers. It includes implementations for static images,
 * video files, and animated GIFs, along with a factory function to automatically
 * select the appropriate data source based on file extension.
 *
 * @module MapLayerDataSources
 */

export { createDataSource } from './dataSourceFactory';
export { GifDataSource } from './GifDataSource';
export { ImageDataSource } from './ImageDataSource';
export type { IMapDataSource } from './IMapDataSource';
export { VideoDataSource } from './VideoDataSource';
