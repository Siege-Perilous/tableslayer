import { base64ToUint8Array } from '../encoding';

/**
 * Decode base64-encoded mask data to Uint8Array
 * Used for fog of war and annotation masks stored in RLE format
 *
 * @param base64Data - Base64-encoded mask data
 * @returns Decoded Uint8Array
 */
export function decodeMaskData(base64Data: string): Uint8Array {
  return base64ToUint8Array(base64Data);
}
