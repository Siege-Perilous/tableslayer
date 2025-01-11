import chroma from 'chroma-js';

const adjustHueForNonGrayscale = (color: chroma.Color, hueShift: number) => {
  const saturation = color.get('hsl.s') ?? 0; // Get saturation (0 = grayscale, 1 = fully saturated)
  if (saturation > 0.1) {
    const hue = color.get('hsl.h') ?? 0; // Get hue (in degrees)
    return color.set('hsl.h', (hue + hueShift) % 360); // Adjust hue if not grayscale
  }
  return color; // Return original color if grayscale
};

export const generateGradientColors = (colorStart: string, colorEnd?: string): string[] => {
  const startColor = chroma(colorStart);
  let adjustedColorEnd;

  if (!colorEnd) {
    const luminance = startColor.luminance();

    if (luminance < 0.2) {
      // For dark colors: brighten and adjust hue if not grayscale
      adjustedColorEnd = adjustHueForNonGrayscale(startColor.brighten(2), 15).hex();
    } else if (luminance > 0.8) {
      // For bright colors: darken and adjust hue if not grayscale
      adjustedColorEnd = adjustHueForNonGrayscale(startColor.darken(2), -15).hex();
    } else {
      // For mid-range colors: brighten moderately and adjust hue
      adjustedColorEnd = adjustHueForNonGrayscale(startColor.brighten(1.5), 10).hex();
    }
  } else {
    adjustedColorEnd = colorEnd;
  }

  // Generate the gradient with 5 colors between start and end
  return chroma.scale([colorStart, adjustedColorEnd]).colors(5);
};

export const to8CharHex = (hex: string, opacity: number) => {
  const rgba = chroma(hex).alpha(opacity).rgba();
  return chroma(rgba).hex('rgba');
};
