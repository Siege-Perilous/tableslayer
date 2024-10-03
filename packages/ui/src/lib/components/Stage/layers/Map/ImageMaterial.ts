import * as THREE from 'three';
import fragmentShader from './image_fragment.glsl?raw';
import vertexShader from './image_vertex.glsl?raw';

export class ImageMaterial extends THREE.ShaderMaterial {
  constructor(options?: { map?: THREE.Texture }) {
    super({
      name: 'ImageMaterial',
      fragmentShader,
      vertexShader,
      uniforms: {
        tDiffuse: { value: options?.map }
      }
    });
  }
}
