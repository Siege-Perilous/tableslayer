/**
 * Run-Length Encoding utilities for binary mask compression
 * Optimized for fog and annotation layers
 */

/**
 * Encodes a binary mask using Run-Length Encoding
 * @param data - Binary mask data (Uint8Array where each byte is 0 or 255)
 * @returns Encoded RLE data as Uint8Array
 */
export function encodeRLE(data: Uint8Array): Uint8Array {
  if (data.length === 0) return new Uint8Array(0);

  const runs: number[] = [];
  let currentValue = data[0];
  let runLength = 1;

  // First byte indicates the starting value (0 or 1)
  runs.push(currentValue === 0 ? 0 : 1);

  for (let i = 1; i < data.length; i++) {
    if (data[i] === currentValue) {
      runLength++;
    } else {
      // Store the run length
      pushVarint(runs, runLength);
      currentValue = data[i];
      runLength = 1;
    }
  }

  // Don't forget the last run
  pushVarint(runs, runLength);

  return new Uint8Array(runs);
}

/**
 * Decodes RLE data back to binary mask
 * @param encoded - RLE encoded data
 * @param targetLength - Expected length of decoded data
 * @returns Decoded binary mask as Uint8Array
 */
export function decodeRLE(encoded: Uint8Array, targetLength: number): Uint8Array {
  if (encoded.length === 0) return new Uint8Array(targetLength);

  const result = new Uint8Array(targetLength);
  let position = 0;
  let index = 0;

  // First byte indicates the starting value
  const startValue = encoded[index++];
  let currentValue = startValue === 0 ? 0 : 255;

  while (index < encoded.length && position < targetLength) {
    const [runLength, newIndex] = readVarint(encoded, index);
    index = newIndex;

    // Fill the result array with the current value
    const end = Math.min(position + runLength, targetLength);
    for (let i = position; i < end; i++) {
      result[i] = currentValue;
    }

    position = end;
    // Toggle the current value
    currentValue = currentValue === 0 ? 255 : 0;
  }

  return result;
}

/**
 * Variable-length integer encoding (for efficient storage of run lengths)
 * Uses continuation bit in MSB
 */
function pushVarint(array: number[], value: number): void {
  while (value > 127) {
    array.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  array.push(value & 0x7f);
}

/**
 * Read a variable-length integer from the array
 */
function readVarint(array: Uint8Array, index: number): [number, number] {
  let value = 0;
  let shift = 0;

  while (index < array.length) {
    const byte = array[index++];
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      break;
    }
    shift += 7;
  }

  return [value, index];
}

/**
 * Converts a PNG blob to RLE encoded data
 * @param blob - PNG image blob
 * @param width - Image width
 * @param height - Image height
 * @returns RLE encoded data
 */
export async function pngToRLE(blob: Blob, width: number, height: number): Promise<Uint8Array> {
  // Create an off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Load the image
  const img = new Image();
  const url = URL.createObjectURL(blob);

  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    // Draw image to canvas
    ctx.drawImage(img, 0, 0, width, height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // Convert RGBA to binary (using alpha channel)
    const binaryData = new Uint8Array(width * height);
    for (let i = 0; i < binaryData.length; i++) {
      // Use alpha channel (every 4th byte starting at index 3)
      binaryData[i] = pixels[i * 4 + 3] > 127 ? 255 : 0;
    }

    // Encode to RLE
    return encodeRLE(binaryData);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Converts RLE encoded data to a PNG blob
 * @param rleData - RLE encoded data
 * @param width - Image width
 * @param height - Image height
 * @returns PNG image blob
 */
export async function rleToPng(rleData: Uint8Array, width: number, height: number): Promise<Blob> {
  // Decode RLE to binary
  const binaryData = decodeRLE(rleData, width * height);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Create image data
  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;

  // Convert binary to RGBA
  for (let i = 0; i < binaryData.length; i++) {
    const idx = i * 4;
    const value = binaryData[i];
    pixels[idx] = 0; // R
    pixels[idx + 1] = 0; // G
    pixels[idx + 2] = 0; // B
    pixels[idx + 3] = value; // A (0 or 255)
  }

  // Put image data to canvas
  ctx.putImageData(imageData, 0, 0);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png');
  });
}

/**
 * Gets the size of RLE data when encoded
 */
export function getRLESize(data: Uint8Array): number {
  return encodeRLE(data).length;
}

/**
 * Estimates compression ratio for RLE encoding
 */
export function estimateCompressionRatio(data: Uint8Array): number {
  const encoded = encodeRLE(data);
  return data.length / encoded.length;
}
