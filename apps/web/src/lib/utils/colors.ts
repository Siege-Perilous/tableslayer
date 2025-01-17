import chroma from 'chroma-js';

const adjustHueForNonGrayscale = (color: chroma.Color, hueShift: number) => {
  const saturation = color.get('hsl.s') ?? 0;
  // If there's sufficient saturation, shift the hue. Otherwise, do nothing (grayscale).
  if (saturation > 0.1) {
    const hue = color.get('hsl.h') ?? 0;
    return color.set('hsl.h', (hue + hueShift) % 360);
  }
  return color;
};

// Builds a 5 color gradient based on the provided start color.
export const generateGradientColors = (colorStart: string, colorEnd?: string): string[] => {
  let adjustedStart: chroma.Color;
  let adjustedEnd: chroma.Color;

  const startColor = chroma(colorStart);

  // If no explicit colorEnd is passed, create a suitable second color
  // based on whether colorStart is dark, bright, or mid-range.
  if (!colorEnd) {
    const luminance = startColor.luminance();

    if (luminance < 0.2) {
      // Dark start: keep as the dark color, brighten for the end
      adjustedStart = startColor;
      adjustedEnd = adjustHueForNonGrayscale(startColor.brighten(2), 15);
    } else if (luminance > 0.8) {
      // Bright start: darken it for the start, keep original as the bright end
      adjustedStart = adjustHueForNonGrayscale(startColor.darken(2), -15);
      adjustedEnd = startColor;
    } else {
      // Mid-range: mild darkening + hue shift as start, mild brightening + hue shift as end
      adjustedStart = adjustHueForNonGrayscale(startColor.darken(1), -10);
      adjustedEnd = adjustHueForNonGrayscale(startColor.brighten(1), 10);
    }
  } else {
    // If an explicit colorEnd is provided, just convert both to chroma.Color
    adjustedStart = startColor;
    adjustedEnd = chroma(colorEnd);
  }

  // Re-order so that adjustedStart is always the darker color and adjustedEnd is always the lighter color
  const startLum = adjustedStart.luminance();
  const endLum = adjustedEnd.luminance();
  const [darkColor, lightColor] = startLum <= endLum ? [adjustedStart, adjustedEnd] : [adjustedEnd, adjustedStart];

  // Generate a 5-color gradient
  const gradient = chroma.scale([darkColor, lightColor]).colors(5);
  return gradient;
};

/**
 * Converts a regular 6-digit hex color to an 8-digit hex with alpha channel.
 */
export const to8CharHex = (hex: string, opacity: number) => {
  const rgba = chroma(hex).alpha(opacity).rgba();
  return chroma(rgba).hex('rgba');
};
