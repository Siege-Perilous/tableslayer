/**
 * Extract grid dimensions from a filename
 * Looks for patterns like: 30x20, 30X20, 30-20, 30_20
 * Also handles patterns with 'g' or 'grid' prefix: g-30x20, grid-30x20
 * Returns the larger number as width (TVs are always landscape)
 */
export const extractDimensionsFromFilename = (filename: string): { width?: number; height?: number } => {
  const patterns = [
    /(?:g|grid)?[-_]?(\d+)[xX](\d+)/, // Matches g-30x20, grid-30x20, 30x20
    /(?:g|grid)?[-_]?(\d+)[-_](\d+)/ // Matches g-30-20, grid_30_20, 30-20, 30_20
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      const num1 = parseInt(match[1], 10);
      const num2 = parseInt(match[2], 10);

      // TVs are always landscape, so use the larger number as width
      return {
        width: Math.max(num1, num2),
        height: Math.min(num1, num2)
      };
    }
  }

  return {};
};
