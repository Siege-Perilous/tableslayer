/**
 * Extract grid dimensions from a filename
 * Looks for patterns like: 30x20, 30X20, 30-20, 30_20
 * Also handles patterns with 'g' or 'grid' prefix: g-30x20, grid-30x20
 * Numbers are kept in filename order (WxH describes the map image's axes,
 * matching the fixedGridCount convention); use orientDimensionsToImage to
 * reconcile transposed filenames against the real image size.
 */
export const extractDimensionsFromFilename = (filename: string): { width?: number; height?: number } => {
  const patterns = [
    /(?:g|grid)?[-_]?(\d+)[xX](\d+)/, // Matches g-30x20, grid-30x20, 30x20
    /(?:g|grid)?[-_]?(\d+)[-_](\d+)/ // Matches g-30-20, grid_30_20, 30-20, 30_20
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      return {
        width: parseInt(match[1], 10),
        height: parseInt(match[2], 10)
      };
    }
  }

  return {};
};

/**
 * Grid counts describe the map image (x along the image's width), but WxH
 * filenames are sometimes transposed. When the count orientation strictly
 * disagrees with the image orientation, swap so the larger count follows the
 * image's longer side.
 */
export const orientDimensionsToImage = (
  dimensions: { width?: number; height?: number },
  imageSize: { width: number; height: number } | null
): { width?: number; height?: number } => {
  if (!imageSize || dimensions.width === undefined || dimensions.height === undefined) return dimensions;

  const swap =
    (dimensions.width > dimensions.height && imageSize.width < imageSize.height) ||
    (dimensions.width < dimensions.height && imageSize.width > imageSize.height);
  return swap ? { width: dimensions.height, height: dimensions.width } : dimensions;
};

/**
 * Reads the pixel size of a picked image file so grid counts can be oriented
 * to it. Returns null for videos or undecodable files.
 */
export const getImageFileDimensions = async (file: File): Promise<{ width: number; height: number } | null> => {
  if (!file.type.startsWith('image/')) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
};
