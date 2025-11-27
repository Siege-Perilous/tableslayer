/**
 * Convert base64-encoded string to Uint8Array
 * Used for decoding mask data from API/database
 *
 * @param base64 - Base64-encoded string
 * @returns Uint8Array of decoded bytes
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64-encoded string
 * Used for encoding mask data for API/database storage
 *
 * @param bytes - Uint8Array of bytes to encode
 * @returns Base64-encoded string
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
