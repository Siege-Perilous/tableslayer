import * as THREE from 'three';
import fragmentShader from './grid_fragment.glsl?raw';
import vertexShader from './grid_vertex.glsl?raw';
import type { GridProps } from './types';

export class GridMaterial extends THREE.ShaderMaterial {
  constructor(props: GridProps, tDiffuse: THREE.Texture, targetSize: THREE.Vector2 = new THREE.Vector2(0, 0)) {
    super({
      name: 'GridMaterial',
      fragmentShader,
      vertexShader,
      uniforms: {
        ...props,
        tDiffuse: new THREE.Uniform(tDiffuse),
        targetSize: new THREE.Uniform(targetSize)
      }
    });
  }
}
