import chroma from 'chroma-js';

/**
 * Generates an array of 5 gradient colors.
 * @param {string} colorStart - The starting color in hex format.
 * @param {string} [colorEnd] - The ending color in hex format. If not provided, generates lighter shades.
 * @returns {string[]} Array of 5 colors as hex strings.
 */
export function generateGradientColors(colorStart: string, colorEnd?: string): string[] {
  if (!colorEnd) {
    return chroma.scale([colorStart, chroma(colorStart).brighten(3).hex()]).colors(5);
  }

  return chroma.scale([colorStart, colorEnd]).colors(5);
}
