// Base64 <-> Uint8Array helpers that work in the browser, Cloudflare workers
// (PartyKit), and node (vitest). RLE masks cross JSON boundaries as base64 during
// hydration/persistence but live in the doc as raw Uint8Array.
//
// workerd exposes a partial Buffer global without Buffer.from, so feature-detect
// the function itself rather than the global.

const hasBuffer = typeof Buffer !== 'undefined' && typeof Buffer.from === 'function';

export const uint8ToBase64 = (bytes: Uint8Array): string => {
  if (hasBuffer) {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

export const base64ToUint8 = (base64: string): Uint8Array => {
  if (hasBuffer) {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};
