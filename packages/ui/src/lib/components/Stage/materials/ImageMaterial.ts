import * as THREE from 'three';
import fragmentShader from '../shaders/ImageShader.frag?raw';
import vertexShader from '../shaders/ImageShader.vert?raw';

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
