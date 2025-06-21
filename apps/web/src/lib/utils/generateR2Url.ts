/**
 * Generates R2 transformation URLs client-side
 * This eliminates race conditions waiting for server-side processing
 */

export type R2TransformOptions = {
  width?: number;
  height?: number;
  fit?: 'scale-down' | 'cover' | 'contain' | 'crop' | 'pad';
  gravity?: 'center' | 'north' | 'south' | 'east' | 'west' | 'auto';
  quality?: number;
};

const R2_BASE_URL = 'https://files.tableslayer.com';
const DEFAULT_MAP = 'map/example1080.png';

/**
 * Generates an R2 transformation URL from a file location
 * @param location - The file location (e.g., 'map/uuid.jpg')
 * @param options - Transformation options
 * @returns The full R2 URL with transformations
 */
export function generateR2Url(location: string | null | undefined, options: R2TransformOptions = {}): string {
  // Return empty string if no location
  if (!location) return '';

  // Don't transform the default map
  if (location === DEFAULT_MAP) {
    return `${R2_BASE_URL}/${location}`;
  }

  // Build transformation string
  const transforms: string[] = [];

  if (options.width) transforms.push(`w=${options.width}`);
  if (options.height) transforms.push(`h=${options.height}`);
  if (options.fit) transforms.push(`fit=${options.fit}`);
  if (options.gravity) transforms.push(`gravity=${options.gravity}`);
  if (options.quality) transforms.push(`q=${options.quality}`);

  // Construct URL
  let url: string;
  if (transforms.length > 0) {
    url = `${R2_BASE_URL}/cdn-cgi/image/${transforms.join(',')}/${location}`;
  } else {
    url = `${R2_BASE_URL}/${location}`;
  }

  return url;
}

/**
 * Preset for large images (3000x3000 max) - used for Stage display
 */
export function generateLargeImageUrl(location: string | null | undefined): string {
  return generateR2Url(location, {
    width: 3000,
    height: 3000,
    fit: 'scale-down',
    gravity: 'center'
  });
}

/**
 * Preset for small thumbnails (400x225) - used for scene selector, etc.
 */
export function generateSmallThumbnailUrl(location: string | null | undefined): string {
  return generateR2Url(location, {
    width: 400,
    height: 225,
    fit: 'cover',
    gravity: 'center'
  });
}

/**
 * Preset for square thumbnails (300x300) - used for markers, avatars, etc.
 */
export function generateSquareThumbnailUrl(location: string | null | undefined): string {
  return generateR2Url(location, {
    width: 300,
    height: 300,
    fit: 'cover',
    gravity: 'center'
  });
}

/**
 * Check if a location is the default map
 */
export function isDefaultMap(location: string | null | undefined): boolean {
  return location === DEFAULT_MAP;
}
