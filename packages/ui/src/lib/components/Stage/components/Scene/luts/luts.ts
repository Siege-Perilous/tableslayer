import { LookupTexture } from 'postprocessing';
import * as THREE from 'three';
import { LUTCubeLoader } from 'three/examples/jsm/loaders/LUTCubeLoader';

const loadingManager = new THREE.LoadingManager();
const lutLoader = new LUTCubeLoader(loadingManager);

export enum LUT {
  Cool = 'Cool',
  Grayscale = 'Grayscale',
  Plum = 'Plum',
  Spooky = 'Spooky',
  Vibrant = 'Vibrant',
  Warm = 'Warm'
}

/**
 * Gets a LUT
 * @param lut The LUT to get
 * @returns A promise that resolves to the LookupTexture
 */
export const getLUT = async (lut: LUT): Promise<LookupTexture | null> => {
  const lutUrl = (await import(`./${lut}.cube?url`)).default;
  const result = await lutLoader.loadAsync(lutUrl);
  try {
    const lookupTexture = LookupTexture.from(result.texture3D);
    lookupTexture.colorSpace = THREE.LinearSRGBColorSpace;
    return lookupTexture;
  } catch (error) {
    console.error(error);
    return null;
  }
};
