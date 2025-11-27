import { decodeMaskData } from './decodeMaskData';

/**
 * Fetch and load a fog mask from the API
 *
 * @param sceneId - The scene ID to fetch fog mask for
 * @param fogOfWar - The fog of war stage exports with fromRLE method
 * @returns Promise that resolves when mask is loaded
 */
export async function loadFogMaskFromApi(
  sceneId: string,
  fogOfWar: { fromRLE: (data: Uint8Array, width: number, height: number) => Promise<void> }
): Promise<void> {
  const response = await fetch(`/api/scenes/getFogMask?sceneId=${sceneId}`);
  const data = await response.json();

  if (data.maskData && fogOfWar.fromRLE) {
    const bytes = decodeMaskData(data.maskData);
    await fogOfWar.fromRLE(bytes, 1024, 1024);
  }
}

/**
 * Fetch and load an annotation mask from the API
 *
 * @param annotationId - The annotation ID to fetch mask for
 * @param annotations - The annotations stage exports with loadMask method
 * @returns Promise that resolves when mask is loaded
 */
export async function loadAnnotationMaskFromApi(
  annotationId: string,
  annotations: { loadMask: (layerId: string, data: Uint8Array) => Promise<void> }
): Promise<void> {
  const response = await fetch(`/api/annotations/getMask?annotationId=${annotationId}`);
  const data = await response.json();

  if (data.maskData && annotations.loadMask) {
    const bytes = decodeMaskData(data.maskData);
    await annotations.loadMask(annotationId, bytes);
  }
}

/**
 * Load initial fog mask from SSR data
 *
 * @param maskData - Base64-encoded mask data from SSR
 * @param fogOfWar - The fog of war stage exports with fromRLE method
 * @returns Promise that resolves when mask is loaded
 */
export async function loadInitialFogMask(
  maskData: string,
  fogOfWar: { fromRLE: (data: Uint8Array, width: number, height: number) => Promise<void> }
): Promise<void> {
  if (!fogOfWar.fromRLE) return;

  const bytes = decodeMaskData(maskData);
  await fogOfWar.fromRLE(bytes, 1024, 1024);
}

/**
 * Load initial annotation masks from SSR data
 *
 * @param masks - Record of annotation ID to base64-encoded mask data
 * @param annotations - The annotations stage exports with loadMask method
 * @returns Promise that resolves when all masks are loaded
 */
export async function loadInitialAnnotationMasks(
  masks: Record<string, string>,
  annotations: { loadMask: (layerId: string, data: Uint8Array) => Promise<void> }
): Promise<void> {
  if (!annotations.loadMask) return;

  const promises = Object.entries(masks).map(async ([annotationId, maskData]) => {
    const bytes = decodeMaskData(maskData);
    await annotations.loadMask(annotationId, bytes);
  });

  await Promise.all(promises);
}
