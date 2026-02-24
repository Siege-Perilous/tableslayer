var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
export const getLUT = (url) => __awaiter(void 0, void 0, void 0, function* () {
    if (!url)
        return null;
    const result = yield lutLoader.loadAsync(url);
    try {
        const lookupTexture = LookupTexture.from(result.texture3D);
        lookupTexture.colorSpace = THREE.LinearSRGBColorSpace;
        return lookupTexture;
    }
    catch (error) {
        console.error(error);
        return null;
    }
});
