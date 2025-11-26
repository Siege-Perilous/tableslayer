/**
 * Decode base64-encoded mask data to Uint8Array
 * Used for fog of war and annotation masks stored in RLE format
 *
 * @param base64Data - Base64-encoded mask data
 * @returns Decoded Uint8Array
 */
export function decodeMaskData(base64Data: string): Uint8Array {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
