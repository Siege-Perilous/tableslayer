import * as THREE from 'three';
import type { GridLayerProps } from '../components/GridLayer/types';

import fragmentShader from '../shaders/GridShader.frag?raw';
import vertexShader from '../shaders/default.vert?raw';

export class GridMaterial extends THREE.ShaderMaterial {
  constructor(props: GridLayerProps) {
    super({
      transparent: true,
      vertexShader,
      fragmentShader,
      uniforms: {
        gridType: new THREE.Uniform(props.gridType),
        opacity: new THREE.Uniform(props.opacity),
        divisions: new THREE.Uniform(props.divisions),
        offset: new THREE.Uniform(props.offset),
        lineThickness: new THREE.Uniform(props.lineThickness),
        lineColor: new THREE.Uniform(props.lineColor),
        shadowIntensity: new THREE.Uniform(props.shadowIntensity),
        shadowSize: new THREE.Uniform(props.shadowSize),
        shadowColor: new THREE.Uniform(props.shadowColor),
        sceneScale: new THREE.Uniform(1),
        uResolution: new THREE.Uniform(new THREE.Vector2(0, 0))
      }
    });
  }

  updateProps(props: GridLayerProps) {
    this.uniforms.gridType.value = props.gridType;
    this.uniforms.opacity.value = props.opacity;
    this.uniforms.divisions.value = props.divisions;
    this.uniforms.offset.value = props.offset;
    this.uniforms.lineThickness.value = props.lineThickness;
    this.uniforms.lineColor.value = props.lineColor;
    this.uniforms.shadowIntensity.value = props.shadowIntensity;
    this.uniforms.shadowSize.value = props.shadowSize;
    this.uniforms.shadowColor.value = props.shadowColor;
  }
}
