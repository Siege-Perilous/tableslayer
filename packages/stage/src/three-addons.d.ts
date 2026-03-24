declare module 'three/examples/jsm/loaders/LUTCubeLoader' {
  import { DataTexture, Loader, LoadingManager } from 'three';
  export class LUTCubeLoader extends Loader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad?: (result: { texture: DataTexture; texture3D: DataTexture }) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void;
    loadAsync(url: string): Promise<{ texture: DataTexture; texture3D: DataTexture }>;
    parse(data: string): { texture: DataTexture; texture3D: DataTexture };
  }
}
