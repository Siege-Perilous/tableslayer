import { LookupTexture } from 'postprocessing';
/**
 * Gets a LUT
 * @param url The URL of the LUT to get
 * @returns A promise that resolves to the LookupTexture
 */
export declare const getLUT: (url: string | null) => Promise<LookupTexture | null>;
