import { LookupTexture } from 'postprocessing';
import * as THREE from 'three';
import { LUTCubeLoader } from 'three/examples/jsm/loaders/LUTCubeLoader';

const loadingManager = new THREE.LoadingManager();
const lutLoader = new LUTCubeLoader(loadingManager);

/**
 * Gets a LUT
 * @param url The URL of the LUT to get
 * @returns A promise that resolves to the LookupTexture
 */
export const getLUT = async (url: string): Promise<LookupTexture | null> => {
  const result = await lutLoader.loadAsync(url);
  try {
    const lookupTexture = LookupTexture.from(result.texture3D);
    lookupTexture.colorSpace = THREE.LinearSRGBColorSpace;
    return lookupTexture;
  } catch (error) {
    console.error(error);
    return null;
  }
};
