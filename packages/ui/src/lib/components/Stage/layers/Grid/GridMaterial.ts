import * as THREE from 'three';
import fragmentShader from './grid_fragment.glsl?raw';
import vertexShader from './grid_vertex.glsl?raw';
import type { GridProps } from './types';

export class GridMaterial extends THREE.ShaderMaterial {
  constructor(props: GridProps, tDiffuse: THREE.Texture) {
    super({
      name: 'GridMaterial',
      fragmentShader,
      vertexShader,
      uniforms: {
        tDiffuse: new THREE.Uniform(tDiffuse),
        opacity: new THREE.Uniform(props.opacity),
        spacing: new THREE.Uniform(props.spacing),
        lineThickness: new THREE.Uniform(props.lineThickness),
        lineColor: new THREE.Uniform(new THREE.Color(props.lineColor)),
        offset: new THREE.Uniform(props.offset),
        gridType: new THREE.Uniform(props.type),
        targetSize: new THREE.Uniform(new THREE.Vector2(1, 1))
      }
    });
  }
}
